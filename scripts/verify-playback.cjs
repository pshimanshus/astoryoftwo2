/* PLAYBACK VERIFIER — slice 1 acceptance criteria.
   Stubs the YouTube IFrame API so the sequencing logic can be driven for
   real: advance, skip unresolved, error-advance, auto-flip, reason tracking,
   blocked fallback. The only thing this can't prove is that YouTube's own
   player behaves as documented — youtube.com is 403'd by the egress proxy. */
const path = require("path");
const fs = require("fs");
const SHOT = process.env.SHOT_DIR || path.join(__dirname, "..", ".shots");
fs.mkdirSync(SHOT, { recursive: true });
const { chromium } = require("playwright");

const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};

/* A tape where tracks 2 and 5 have no Art Track, so we can prove they're
   skipped rather than stalled on. 6 songs => side A = 3, side B = 3. */
const SONGS = [
  ["Fade Into You", "Mazzy Star", "the one from that night in Bandra", "vid000000A1"],
  ["Harvest Moon", "Neil Young", "you hummed this in the kitchen", null],
  ["Sea of Love", "Cat Power", "for the walk back", "vid000000A3"],
  ["Yellow", "Coldplay", "obvious, i don't care", "vid000000B1"],
  ["First Day of My Life", "Bright Eyes", "this is the one i mean", null],
  ["The Book of Love", "The Magnetic Fields", "for whenever you reread this", "vid000000B3"],
];

function fragment() {
  const packed = {
    v: 3, t: "Songs I Never Sent You", to: "Aanya", f: "Himanshu",
    n: "Play this when you miss me.", th: 0,
    s: SONGS.map(([title, artist, reason, yt]) => [title, artist, yt ? { r: reason, yt } : { r: reason }]),
  };
  return "u" + Buffer.from(JSON.stringify(packed), "utf8")
    .toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/* The stub. Records every loadVideoById and lets the test fire YouTube's
   own callbacks, which is what the real player would do. */
const STUB = `
window.__yt = { loaded: [], created: 0, state: -1 };
window.YT = {
  PlayerState: { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 },
  Player: function (host, opts) {
    window.__yt.created++;
    window.__yt.loaded.push(opts.videoId);
    const self = this;
    this._ev = opts.events || {};
    this.loadVideoById = (id) => { window.__yt.loaded.push(id); window.__yt.state = 1;
      setTimeout(() => self._ev.onStateChange && self._ev.onStateChange({ data: 1 }), 0); };
    this.playVideo = () => { window.__yt.state = 1; self._ev.onStateChange && self._ev.onStateChange({ data: 1 }); };
    this.pauseVideo = () => { window.__yt.state = 2; self._ev.onStateChange && self._ev.onStateChange({ data: 2 }); };
    this.getPlayerState = () => window.__yt.state;
    this.destroy = () => {};
    window.__player = this;
    setTimeout(() => {
      self._ev.onReady && self._ev.onReady();
      self._ev.onStateChange && self._ev.onStateChange({ data: 1 });
    }, 0);
  },
};
window.__fireEnded = () => window.__player._ev.onStateChange({ data: 0 });
window.__fireError = (code) => window.__player._ev.onError({ data: code });
`;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 900, height: 1300 } });
  await ctx.addInitScript(STUB);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  const url = `http://127.0.0.1:8321/tape.html#t=${fragment()}`;
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);

  // ---- AC1: the transport offers what is actually playable ----
  const note = await page.locator("#transport-note").innerText();
  const playDisabled = await page.locator("#btn-play").isDisabled();
  check("AC1 transport reflects resolvable tracks", !playDisabled && /4 of 6/.test(note),
        `note="${note}" disabled=${playDisabled}`);

  // ---- AC2: tapping play starts track one and shows its reason ----
  await page.click("#btn-play");
  await page.waitForTimeout(400);
  const loaded1 = await page.evaluate(() => window.__yt.loaded);
  const playingRow = await page.locator(".tracks li.row.is-playing .t").innerText();
  const playingWhy = await page.locator(".tracks li.row.is-playing .why").innerText();
  check("AC2 play starts the first resolved track",
        loaded1[0] === "vid000000A1" && /Fade Into You/.test(playingRow),
        `loaded=${JSON.stringify(loaded1)} row="${playingRow}"`);
  check("AC2 the reason for the playing track is on screen",
        /Bandra/.test(playingWhy), `"${playingWhy}"`);

  const glyph = await page.locator("#play-glyph").innerText();
  check("AC2 the button becomes pause", glyph === "❚❚", `glyph="${glyph}"`);

  // ---- AC3: an unresolved track is skipped, not stalled on ----
  await page.evaluate(() => window.__fireEnded());
  await page.waitForTimeout(400);
  const loaded2 = await page.evaluate(() => window.__yt.loaded);
  const row2 = await page.locator(".tracks li.row.is-playing .t").innerText();
  check("AC3 unresolved track skipped (Harvest Moon has no id)",
        loaded2[loaded2.length - 1] === "vid000000A3" && /Sea of Love/.test(row2),
        `→ ${loaded2[loaded2.length - 1]} / "${row2}"`);

  // ---- AC4: end of side A flips the tape and keeps playing ----
  const sideBefore = await page.locator("#list-side").innerText();
  await page.evaluate(() => window.__fireEnded());
  await page.waitForTimeout(1200);
  const sideAfter = await page.locator("#list-side").innerText();
  const loaded3 = await page.evaluate(() => window.__yt.loaded);
  const row3 = await page.locator(".tracks li.row.is-playing .t").innerText();
  const transform = await page.evaluate(() =>
    getComputedStyle(document.querySelector("#cassette")).transform);
  check("AC4 crossing into side B flips the tape",
        sideBefore === "A side" && sideAfter === "B side" && /matrix3d/.test(transform),
        `${sideBefore} → ${sideAfter}`);
  check("AC4 playback continues across the flip",
        loaded3[loaded3.length - 1] === "vid000000B1" && /Yellow/.test(row3),
        `→ ${loaded3[loaded3.length - 1]} / "${row3}"`);

  // ---- AC5: an onError advances instead of stalling ----
  const beforeErr = await page.evaluate(() => window.__yt.loaded.length);
  await page.evaluate(() => window.__fireError(150));   // embedding denied
  await page.waitForTimeout(500);
  const loaded4 = await page.evaluate(() => window.__yt.loaded);
  const unavailable = await page.locator(".tracks li.row.is-unavailable").count();
  check("AC5 onError(150) marks unavailable and advances",
        loaded4.length > beforeErr && loaded4[loaded4.length - 1] === "vid000000B3"
        && unavailable >= 1,
        `→ ${loaded4[loaded4.length - 1]}, ${unavailable} struck through`);

  // ---- AC6: the end of the tape is a real end ----
  await page.evaluate(() => window.__fireEnded());
  await page.waitForTimeout(400);
  const endNote = await page.locator("#transport-note").innerText();
  check("AC6 the tape ends cleanly", /whole tape/.test(endNote), `"${endNote}"`);

  // ---- AC7: every track keeps a way out, resolved or not ----
  const outs = await page.locator(".tracks .out").count();
  const href = await page.getAttribute(".tracks .out >> nth=0", "href");
  check("AC7 every row keeps an outbound link", outs === 3 && /music\.youtube\.com/.test(href),
        `${outs} on this side, first=${href}`);

  // ---- AC8: player geometry meets policy ----
  const box = await page.locator("#window").boundingBox();
  check("AC8 player >=480x270 desktop", box.width >= 480 && box.height >= 270,
        `${Math.round(box.width)}x${Math.round(box.height)}`);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  const boxM = await page.locator("#window").boundingBox();
  check("AC8 player >=200x200 mobile", boxM.width >= 200 && boxM.height >= 200,
        `${Math.round(boxM.width)}x${Math.round(boxM.height)} @390px`);
  await page.screenshot({ path: path.join(SHOT, "playback-mobile.png"), fullPage: true });
  await page.setViewportSize({ width: 900, height: 1300 });
  await page.screenshot({ path: path.join(SHOT, "playback.png"), fullPage: true });

  // ---- AC9: a blocked embed degrades, never breaks ----
  const blockedCtx = await browser.newContext({ viewport: { width: 900, height: 1300 } });
  // no YT stub, and the real script can't load here — exactly the blocked case
  const blocked = await blockedCtx.newPage();
  const blockedErrors = [];
  blocked.on("pageerror", (e) => blockedErrors.push(e.message));
  await blocked.goto(url, { waitUntil: "networkidle" });
  await blocked.waitForTimeout(600);
  await blocked.click("#btn-play");
  await blocked.waitForTimeout(9500);   // past the API timeout
  const blockedNote = await blocked.locator("#transport-note").innerText();
  const blockedOuts = await blocked.locator(".tracks .out").count();
  check("AC9 blocked embed degrades to links with an explanation",
        /still has a link/.test(blockedNote) && blockedOuts === 3 && blockedErrors.length === 0,
        `note="${blockedNote}" links=${blockedOuts}`);

  // ---- AC10: resolver ordering, no network ----
  const resolver = await page.evaluate(async () => {
    const m = await import("/functions/api/resolve.js");
    const calls = [];
    const store = new Map();
    const cache = {
      get: async (k) => (store.has(k) ? JSON.parse(store.get(k)) : null),
      put: async (k, v) => store.set(k, v),
    };
    const fetchImpl = async (url) => {
      if (url.includes("song.link")) {
        calls.push("odesli");
        return { ok: true, json: async () => ({
          linksByPlatform: { youtubeMusic: { url: "https://music.youtube.com/watch?v=artTrk00001" } },
        }) };
      }
      calls.push("youtube");
      return { ok: true, json: async () => ({ items: [
        { id: { videoId: "fanvid00001" }, snippet: { channelTitle: "Some Fan Channel" } },
        { id: { videoId: "artTrk00002" }, snippet: { channelTitle: "Mazzy Star - Topic" } },
      ] }) };
    };
    const t1 = { title: "Fade Into You", artist: "Mazzy Star", isrc: "USEE19300012" };

    const first = await m.resolveTracks([t1], { cache, fetchImpl, youtubeKey: "k" });
    const afterFirst = calls.slice();                 // snapshot per phase

    const second = await m.resolveTracks([t1], { cache, fetchImpl, youtubeKey: "k" });
    const afterSecond = calls.slice();

    // no ISRC => Odesli can't help => YouTube, which must pick the Topic channel
    const noIsrc = await m.resolveTracks(
      [{ title: "Some Song", artist: "Someone" }], { cache, fetchImpl, youtubeKey: "k" });

    return {
      first: first[0], second: second[0], noIsrc: noIsrc[0],
      afterFirst, afterSecond, all: calls,
    };
  });
  check("AC10 Odesli answers first, at zero YouTube quota",
        resolver.first.ytVideoId === "artTrk00001" && resolver.first.source === "odesli"
        && !resolver.afterFirst.includes("youtube"),
        `${JSON.stringify(resolver.first)} calls=[${resolver.afterFirst}]`);
  check("AC10 the cache prevents a second lookup",
        resolver.second.cached === true
        && resolver.afterSecond.length === resolver.afterFirst.length,
        `cached=${resolver.second.cached} calls unchanged: [${resolver.afterSecond}]`);
  check("AC10 YouTube fallback picks the Art Track over the fan upload",
        resolver.noIsrc.ytVideoId === "artTrk00002" && resolver.noIsrc.source === "art-track",
        JSON.stringify(resolver.noIsrc));

  const unexpected = errors.filter((e) => !/iframe_api|ERR_|EGRESS/.test(e));
  check("no unexpected console errors", unexpected.length === 0,
        unexpected.join(" | ") || "clean");

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exitCode = failed.length ? 1 : 0;
  await browser.close();
})();
