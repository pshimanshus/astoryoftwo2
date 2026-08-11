/* ============================================================
   MIXTAPE — POST /api/resolve
   Turns a song into something playable: an Art Track video ID.

     cache  ──▶  Odesli  ──▶  YouTube search  ──▶  unresolved
     (free)      (free)       (100 units)          (not an error)

   THE QUOTA ARITHMETIC, because it decides the whole design:
   YouTube search.list costs 100 units against a daily 10,000. That
   is ~100 searches per DAY across every user of the product. Odesli
   returns the YouTube link at zero YouTube quota, so it goes first
   and answers nearly always. YouTube is the last resort.

   Which makes the cache the single most important line in the file:
   it is GLOBAL and PERMANENT. Tapes skew hard to well-known songs,
   so it saturates fast. A per-session cache passes testing and falls
   over in week one — see CLAUDE.md and TECH-SPEC §"Resolution cache".

   The client parses the raw provider payloads (resolve.js
   __fromOdesli / __fromYouTubeSearch), so we return them unchanged
   rather than inventing a third shape it would have to learn.

   RIGHTS — identity and links only. No audio is fetched, proxied,
   stored or served from our origin, here or anywhere. Playback is
   the YouTube IFrame player on the client, visible and unmodified.
   ============================================================ */

import { json, preflight, cacheKey, fetchJSON, store } from "../_lib.js";

const ODESLI = "https://api.song.link/v1-alpha.1/links";
const YOUTUBE = "https://www.googleapis.com/youtube/v3/search";
const MAX_BATCH = 24;               // a tape holds fewer than this

/** Did Odesli actually give us something playable? */
function odesliHasYouTube(payload) {
  const links = (payload && payload.linksByPlatform) || {};
  const url = (links.youtube && links.youtube.url) || (links.youtubeMusic && links.youtubeMusic.url);
  return !!(url && /[?&]v=[\w-]{11}|youtu\.be\/[\w-]{11}/.test(url));
}

function hasYouTubeItem(payload) {
  return !!(payload && Array.isArray(payload.items) && payload.items.length);
}

/* ---------- providers ---------- */

async function viaOdesli(fetchImpl, track) {
  // Odesli takes a platform URL or an ISRC-ish id. Without an ISRC we
  // have nothing it can look up, so we don't spend the call.
  if (!track.isrc) return null;
  const url = `${ODESLI}?type=song&id=${encodeURIComponent(track.isrc)}&userCountry=US`;
  const payload = await fetchJSON(fetchImpl, url, { timeoutMs: 5000 });
  return odesliHasYouTube(payload) ? payload : null;
}

async function viaYouTube(fetchImpl, track, apiKey) {
  if (!apiKey) return null;                       // no key: skip, don't 500
  const q = `${track.artist || ""} ${track.title} topic`.trim();
  const url = `${YOUTUBE}?part=snippet&type=video&videoCategoryId=10&maxResults=5`
    + `&q=${encodeURIComponent(q)}&key=${encodeURIComponent(apiKey)}`;
  const payload = await fetchJSON(fetchImpl, url, { timeoutMs: 5000 });
  return hasYouTubeItem(payload) ? payload : null;
}

/* ---------- one track ---------- */

async function resolveOne(track, { fetchImpl, cache, apiKey, budget, via }) {
  const key = cacheKey(track);
  if (!key) return { key: "", payload: null, source: "invalid" };

  const cached = await cache.get(`resolve:${key}`);
  if (cached) return { key, payload: cached.payload, source: cached.source, cached: true };

  // `via` is the client asking for one specific step. It calls with
  // via=odesli first precisely to avoid spending YouTube quota, so
  // honouring it is the difference between 100 searches a day and none.
  const wantOdesli = via !== "youtube";
  const wantYouTube = via !== "odesli";

  // 2 — Odesli, free.
  if (wantOdesli) {
    try {
      const payload = await viaOdesli(fetchImpl, track);
      if (payload) {
        await cache.put(`resolve:${key}`, { payload, source: "odesli" });   // permanent
        return { key, payload, source: "odesli" };
      }
    } catch (_) { /* a miss is not a failure */ }
  }

  // 3 — YouTube, expensive. The budget is what stops one big tape from
  // spending a meaningful slice of the day's 100 searches in one request.
  if (wantYouTube && budget.left > 0) {
    budget.left -= 1;
    try {
      const payload = await viaYouTube(fetchImpl, track, apiKey);
      if (payload) {
        await cache.put(`resolve:${key}`, { payload, source: "youtube-search" });
        return { key, payload, source: "youtube-search" };
      }
    } catch (_) { /* fall through */ }
  }

  // 4 — unresolved. The row still renders; the client links out to a search.
  // Deliberately NOT cached: a miss today may resolve tomorrow, and caching
  // it permanently would make the failure permanent too.
  return { key, payload: null, source: "unresolved" };
}

/* ---------- the handler ---------- */

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return preflight();
  if (request.method !== "POST") {
    return json({ error: "resolve is a POST — send { track } or { tracks: [] }" }, { status: 405 });
  }

  let body;
  try {
    body = await request.json();
  } catch (_) {
    return json({ error: "expected a JSON body" }, { status: 400 });
  }

  const tracks = Array.isArray(body && body.tracks)
    ? body.tracks
    : (body && body.track ? [body.track] : []);

  if (!tracks.length) return json({ error: "no tracks given" }, { status: 400 });
  if (tracks.length > MAX_BATCH) {
    return json({ error: `at most ${MAX_BATCH} tracks per call` }, { status: 413 });
  }

  const fetchImpl = (context.fetchImpl || globalThis.fetch).bind(globalThis);
  const cache = store(env, "RESOLVE_CACHE");
  const apiKey = env && env.YOUTUBE_API_KEY;
  const budget = { left: Number((env && env.YOUTUBE_BUDGET_PER_REQUEST) || 3) };
  const via = new URL(request.url).searchParams.get("via") || "";

  const results = [];
  for (const track of tracks) {
    results.push(await resolveOne(track, { fetchImpl, cache, apiKey, budget, via }));
  }

  // A single-track call answers in the shape resolve.js already parses.
  if (body.track && !Array.isArray(body.tracks)) {
    const r = results[0];
    return json(r.payload || { linksByPlatform: {}, items: [], source: r.source },
                { cache: "no-store" });
  }

  return json({ results, store: cache.kind }, { cache: "no-store" });
}

export const __test = { resolveOne, odesliHasYouTube, viaOdesli, viaYouTube };
