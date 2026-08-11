/* FUNCTION + RIGHTS VERIFIER — the edge functions.

   The sandbox proxy 403s api.deezer.com, itunes.apple.com,
   api.song.link and googleapis.com, so nothing here touches the
   network. Every upstream is a stub that records what was asked
   for — which is what the interesting assertions are about anyway:
   ordering, quota spend, cache behaviour and the rights boundary.

   Run:  npm run verify:api
*/

const assert = require("assert");

const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};

/* ---------- stubs ---------- */

function res(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

/** Records every URL requested, answers from a routing table. */
function stubFetch(routes) {
  const calls = [];
  const impl = async (url) => {
    calls.push(String(url));
    for (const [pattern, handler] of routes) {
      if (String(url).includes(pattern)) {
        const out = typeof handler === "function" ? handler(String(url)) : handler;
        if (out instanceof Error) throw out;
        return out;
      }
    }
    throw new Error("unrouted: " + url);
  };
  impl.calls = calls;
  impl.hits = (frag) => calls.filter((c) => c.includes(frag)).length;
  return impl;
}

const ODESLI_HIT = {
  pageUrl: "https://song.link/x",
  linksByPlatform: {
    youtube: { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    spotify: { entityUniqueId: "SPOTIFY_SONG::track123" },
  },
};

const YT_HIT = {
  items: [
    { id: { videoId: "fanvid0000f" }, snippet: { channelTitle: "SuperFan Uploads" } },
    { id: { videoId: "arttrack999" }, snippet: { channelTitle: "Mazzy Star - Topic" } },
  ],
};

const DEEZER_HIT = {
  data: [{
    id: 916424, title: "Fade Into You", title_short: "Fade Into You",
    artist: { name: "Mazzy Star" },
    album: { title: "So Tonight That I Might See", cover_medium: "https://e-cdns.deezer.com/x.jpg" },
    duration: 296, preview: "https://cdns-preview.dzcdn.net/x.mp3",
  }],
};

const ITUNES_HIT = {
  results: [{
    trackId: 1440, trackName: "Fade Into You", artistName: "Mazzy Star",
    collectionName: "So Tonight That I Might See", releaseDate: "1993-10-05",
    trackTimeMillis: 296000, artworkUrl100: "https://is1.mzstatic.com/x.jpg",
    previewUrl: "https://audio-ssl.itunes.apple.com/x.m4a",
  }],
};

const TRACK = { title: "Fade Into You", artist: "Mazzy Star", isrc: "USEE19300012" };
const NO_ISRC = { title: "Fade Into You", artist: "Mazzy Star" };

const req = (url, { method = "GET", body } = {}) => ({
  method,
  url,
  json: async () => {
    if (body === undefined) throw new Error("no body");
    return body;
  },
});

(async () => {
  const lib = await import("../functions/_lib.js");
  const search = await import("../functions/api/search.js");
  const resolve = await import("../functions/api/resolve.js");

  /* ================= /api/resolve ================= */

  // AC1 — Odesli answers, and YouTube is never called. This is the quota
  // guarantee: 100 searches/day across all users means Odesli must win.
  {
    lib.__resetMemoryStore();
    const f = stubFetch([["song.link", res(ODESLI_HIT)], ["googleapis", res(YT_HIT)]]);
    const r = await resolve.onRequest({
      request: req("https://x/api/resolve", { method: "POST", body: { track: TRACK } }),
      env: { YOUTUBE_API_KEY: "k" }, fetchImpl: f,
    });
    const body = await r.json();
    check("AC1 Odesli answers at zero YouTube quota",
      r.status === 200 && f.hits("googleapis") === 0 && !!body.linksByPlatform,
      `youtube calls=${f.hits("googleapis")}`);
  }

  // AC2 — the cache is the scaling decision. A second identical call must
  // make no upstream request at all.
  {
    lib.__resetMemoryStore();
    const f = stubFetch([["song.link", res(ODESLI_HIT)], ["googleapis", res(YT_HIT)]]);
    const ctx = () => ({
      request: req("https://x/api/resolve", { method: "POST", body: { track: TRACK } }),
      env: { YOUTUBE_API_KEY: "k" }, fetchImpl: f,
    });
    await resolve.onRequest(ctx());
    const before = f.calls.length;
    const r2 = await resolve.onRequest(ctx());
    const body = await r2.json();
    check("AC2 second call is a pure cache hit",
      f.calls.length === before && !!body.linksByPlatform,
      `upstream calls: ${before} then ${f.calls.length}`);
  }

  // AC3 — the client asks via=odesli specifically to protect quota.
  // The server must not "helpfully" spend a YouTube search anyway.
  {
    lib.__resetMemoryStore();
    const f = stubFetch([["song.link", res({}, 404)], ["googleapis", res(YT_HIT)]]);
    await resolve.onRequest({
      request: req("https://x/api/resolve?via=odesli", { method: "POST", body: { track: TRACK } }),
      env: { YOUTUBE_API_KEY: "k" }, fetchImpl: f,
    });
    check("AC3 via=odesli never spends YouTube quota",
      f.hits("googleapis") === 0, `youtube calls=${f.hits("googleapis")}`);
  }

  // AC4 — when Odesli has nothing, YouTube runs and the Art Track wins
  // over the fan upload sitting above it in the results.
  {
    lib.__resetMemoryStore();
    const f = stubFetch([["song.link", res({}, 404)], ["googleapis", res(YT_HIT)]]);
    const r = await resolve.onRequest({
      request: req("https://x/api/resolve", { method: "POST", body: { track: TRACK } }),
      env: { YOUTUBE_API_KEY: "k" }, fetchImpl: f,
    });
    const body = await r.json();
    const picked = (body.items || []).find((i) => /- Topic$/.test(i.snippet.channelTitle));
    check("AC4 YouTube fallback returns an Art Track candidate",
      f.hits("googleapis") === 1 && !!picked && picked.id.videoId === "arttrack999",
      picked ? picked.snippet.channelTitle : "none");
  }

  // AC5 — a track with no ISRC must not burn an Odesli call it cannot use.
  {
    lib.__resetMemoryStore();
    const f = stubFetch([["song.link", res(ODESLI_HIT)], ["googleapis", res(YT_HIT)]]);
    await resolve.onRequest({
      request: req("https://x/api/resolve", { method: "POST", body: { track: NO_ISRC } }),
      env: { YOUTUBE_API_KEY: "k" }, fetchImpl: f,
    });
    check("AC5 no ISRC skips Odesli, goes straight to search",
      f.hits("song.link") === 0 && f.hits("googleapis") === 1,
      `odesli=${f.hits("song.link")} youtube=${f.hits("googleapis")}`);
  }

  // AC6 — one big tape must not spend a meaningful slice of the daily 100.
  {
    lib.__resetMemoryStore();
    const f = stubFetch([["song.link", res({}, 404)], ["googleapis", res(YT_HIT)]]);
    const tracks = Array.from({ length: 10 }, (_, i) => ({ title: `Song ${i}`, artist: "A" }));
    const r = await resolve.onRequest({
      request: req("https://x/api/resolve", { method: "POST", body: { tracks } }),
      env: { YOUTUBE_API_KEY: "k", YOUTUBE_BUDGET_PER_REQUEST: 3 }, fetchImpl: f,
    });
    const body = await r.json();
    check("AC6 per-request YouTube budget caps the spend",
      f.hits("googleapis") === 3 && body.results.length === 10,
      `${f.hits("googleapis")} searches for 10 tracks`);
  }

  // AC7 — an unresolved track is not an error, and is NOT cached: a miss
  // today may resolve tomorrow, and caching it would make it permanent.
  {
    lib.__resetMemoryStore();
    const f = stubFetch([["song.link", res({}, 404)], ["googleapis", res({ items: [] })]]);
    const ctx = () => ({
      request: req("https://x/api/resolve", { method: "POST", body: { tracks: [TRACK] } }),
      env: { YOUTUBE_API_KEY: "k" }, fetchImpl: f,
    });
    const r = await resolve.onRequest(ctx());
    const body = await r.json();
    const firstCalls = f.calls.length;
    await resolve.onRequest(ctx());
    check("AC7 unresolved is a 200, and is not cached as a failure",
      r.status === 200 && body.results[0].source === "unresolved" && f.calls.length > firstCalls,
      `source=${body.results[0].source}, retried=${f.calls.length > firstCalls}`);
  }

  // AC8 — no YouTube key configured must degrade, not 500.
  {
    lib.__resetMemoryStore();
    const f = stubFetch([["song.link", res({}, 404)], ["googleapis", res(YT_HIT)]]);
    const r = await resolve.onRequest({
      request: req("https://x/api/resolve", { method: "POST", body: { track: TRACK } }),
      env: {}, fetchImpl: f,
    });
    check("AC8 missing YouTube key degrades quietly",
      r.status === 200 && f.hits("googleapis") === 0, `status=${r.status}`);
  }

  // AC9 — upstream hang must not hang the request.
  {
    lib.__resetMemoryStore();
    const slow = stubFetch([["song.link", new Error("network")], ["googleapis", new Error("network")]]);
    const t0 = Date.now();
    const r = await resolve.onRequest({
      request: req("https://x/api/resolve", { method: "POST", body: { track: TRACK } }),
      env: { YOUTUBE_API_KEY: "k" }, fetchImpl: slow,
    });
    check("AC9 upstream failure returns promptly, not a 5xx",
      r.status === 200 && Date.now() - t0 < 2000, `${Date.now() - t0}ms, status=${r.status}`);
  }

  // AC10 — malformed input is rejected cleanly.
  {
    const bad = await resolve.onRequest({
      request: req("https://x/api/resolve", { method: "POST" }), env: {}, fetchImpl: stubFetch([]),
    });
    const wrongMethod = await resolve.onRequest({
      request: req("https://x/api/resolve", { method: "GET" }), env: {}, fetchImpl: stubFetch([]),
    });
    const tooMany = await resolve.onRequest({
      request: req("https://x/api/resolve", {
        method: "POST", body: { tracks: Array.from({ length: 99 }, () => TRACK) },
      }), env: {}, fetchImpl: stubFetch([]),
    });
    check("AC10 bad input → 400 / 405 / 413, never a crash",
      bad.status === 400 && wrongMethod.status === 405 && tooMany.status === 413,
      `${bad.status}/${wrongMethod.status}/${tooMany.status}`);
  }

  /* ================= /api/search ================= */

  // AC11 — Deezer answers first.
  {
    lib.__resetMemoryStore();
    const f = stubFetch([["deezer", res(DEEZER_HIT)], ["itunes", res(ITUNES_HIT)]]);
    const r = await search.onRequest({
      request: req("https://x/api/search?q=fade%20into%20you"), env: {}, fetchImpl: f,
    });
    const body = await r.json();
    check("AC11 Deezer answers first",
      body.source === "deezer" && body.tracks.length === 1 && f.hits("itunes") === 0,
      `source=${body.source}, itunes calls=${f.hits("itunes")}`);
  }

  // AC12 — Deezer rate-limits; iTunes picks it up. This is the path that
  // actually matters, because Deezer 429s under any real load.
  {
    lib.__resetMemoryStore();
    const f = stubFetch([["deezer", res({}, 429)], ["itunes", res(ITUNES_HIT)]]);
    const r = await search.onRequest({
      request: req("https://x/api/search?q=fade%20into%20you"), env: {}, fetchImpl: f,
    });
    const body = await r.json();
    check("AC12 Deezer 429 falls through to iTunes",
      body.source === "itunes" && body.tracks[0].provider === "itunes",
      `attempted=${body.attempted.join(" → ")}`);
  }

  // AC13 — both providers down is an empty result, not a 5xx: tier 1 and
  // manual entry still work, so the finder must stay usable.
  {
    lib.__resetMemoryStore();
    const f = stubFetch([["deezer", res({}, 500)], ["itunes", res({}, 500)]]);
    const r = await search.onRequest({
      request: req("https://x/api/search?q=obscure"), env: {}, fetchImpl: f,
    });
    const body = await r.json();
    check("AC13 both providers down → empty, still 200",
      r.status === 200 && body.tracks.length === 0 && body.source === "none", `status=${r.status}`);
  }

  // AC14 — a provider outage must not be cached for 24 hours.
  {
    lib.__resetMemoryStore();
    let deezerUp = false;
    const f = stubFetch([
      ["deezer", () => (deezerUp ? res(DEEZER_HIT) : res({}, 500))],
      ["itunes", res({}, 500)],
    ]);
    const ctx = () => ({ request: req("https://x/api/search?q=x"), env: {}, fetchImpl: f });
    await search.onRequest(ctx());
    deezerUp = true;
    const body = await (await search.onRequest(ctx())).json();
    check("AC14 an outage is not cached; recovery is immediate",
      body.source === "deezer" && body.tracks.length === 1, `source=${body.source}`);
  }

  // AC15 — a successful search IS cached.
  {
    lib.__resetMemoryStore();
    const f = stubFetch([["deezer", res(DEEZER_HIT)], ["itunes", res(ITUNES_HIT)]]);
    const ctx = () => ({ request: req("https://x/api/search?q=x"), env: {}, fetchImpl: f });
    await search.onRequest(ctx());
    const before = f.calls.length;
    const body = await (await search.onRequest(ctx())).json();
    check("AC15 repeat search is served from cache",
      f.calls.length === before && body.cached === true, `calls ${before} → ${f.calls.length}`);
  }

  // AC16 — an empty query is a no-op, not a 400. The finder debounces and
  // can race a cleared input; nobody should see an error for backspacing.
  {
    const r = await search.onRequest({
      request: req("https://x/api/search?q=%20%20"), env: {}, fetchImpl: stubFetch([]),
    });
    const body = await r.json();
    check("AC16 empty query → empty result, not an error",
      r.status === 200 && body.tracks.length === 0, `status=${r.status}`);
  }

  // AC17 — cache keys must agree with the client's, or every request is a
  // permanent miss and the whole quota argument collapses.
  {
    const clientKey = (t) => (t.isrc ? `isrc:${t.isrc}` : `ta:${norm(t.title)}|${norm(t.artist || "")}`);
    const norm = (s) => String(s).toLowerCase().normalize("NFD")
      .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ").trim();
    const cases = [TRACK, NO_ISRC, { title: "Björk — Jóga", artist: "Björk" }];
    const agree = cases.every((t) => lib.cacheKey(t) === clientKey(t));
    check("AC17 edge cache keys match the client's exactly",
      agree, cases.map((t) => lib.cacheKey(t)).join("  |  "));
  }

  /* ================= RIGHTS ================= */

  // The blocking one. The edge must never fetch, proxy, store or serve
  // audio bytes — it passes provider URLs through and nothing more.
  {
    lib.__resetMemoryStore();
    const audioFetches = [];
    const f = stubFetch([
      ["deezer", res(DEEZER_HIT)],
      ["itunes", res(ITUNES_HIT)],
      ["dzcdn", (u) => { audioFetches.push(u); return res({}); }],
      ["mzstatic", (u) => { audioFetches.push(u); return res({}); }],
    ]);
    const r = await search.onRequest({
      request: req("https://x/api/search?q=fade"), env: {}, fetchImpl: f,
    });
    const body = await r.json();
    const text = JSON.stringify(body);
    const passesThrough = /dzcdn\.net/.test(text);
    check("RIGHTS edge never fetches audio or artwork bytes",
      audioFetches.length === 0, `${audioFetches.length} media fetches`);
    check("RIGHTS preview/artwork are passed through as provider URLs",
      passesThrough && !/base64|audio\/mpeg/.test(text), "URLs only, no bytes");
  }

  // No endpoint may return an audio stream from our own origin.
  {
    const src = require("fs").readFileSync(
      require("path").join(__dirname, "..", "functions", "api", "search.js"), "utf8")
      + require("fs").readFileSync(
        require("path").join(__dirname, "..", "functions", "api", "resolve.js"), "utf8");
    const serves = /audio\/(mpeg|mp4|webm)|arrayBuffer\(\)|\.body\s*\)/.test(src);
    check("RIGHTS no handler streams audio from our origin", !serves,
      serves ? "found a byte-level response path" : "none");
  }

  /* ---------- summary ---------- */
  const passed = results.filter((r) => r.pass).length;
  console.log(`\n${passed}/${results.length} passed`);
  process.exit(passed === results.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
