/* ============================================================
   MIXTAPE — resolution
   Turns a song into something playable: an Art Track video ID and
   links on every platform.

   Order matters, and it is entirely about quota:

     1. cache      — global, permanent. The common case.
     2. Odesli     — free, ~10 req/min, and it returns the YouTube
                     link at ZERO YouTube quota.
     3. YouTube    — search.list costs 100 units of 10,000/day, i.e.
                     ~100 searches per DAY across all users. Last
                     resort only, filtered to "- Topic" channels so
                     we get Art Tracks rather than fan videos.
     4. unresolved — not an error. The row still renders and the
                     play button links out to a search.

   Off by default: the live calls need an edge function (CORS,
   caching, and keeping keys off the client). The ordering logic
   here is real and testable without the network — pass your own
   `fetcher`. See docs/JOURNEY.md §4.
   ============================================================ */

(() => {
  "use strict";

  const FLAGS = window.MIXTAPE_FLAGS || (window.MIXTAPE_FLAGS = {});
  if (FLAGS.remoteResolve === undefined) FLAGS.remoteResolve = false;
  if (!FLAGS.remoteBase) FLAGS.remoteBase = "/api";

  const norm = window.normalizeQuery || ((s) => String(s).toLowerCase().trim());

  /** Cache key: ISRC when we have it, otherwise the song's identity. */
  function cacheKey(track) {
    if (track.isrc) return `isrc:${track.isrc}`;
    return `ta:${norm(track.title)}|${norm(track.artist || "")}`;
  }

  /* ---------- the cache ----------
     Session-local here; in production this is a shared, permanent
     server-side store. A per-session cache passes testing and then
     falls over in week one, so this local one is explicitly a stand-in. */

  const memo = new Map();

  function seedCache(entries) {
    for (const [k, v] of Object.entries(entries || {})) memo.set(k, v);
  }

  /* ---------- providers ---------- */

  /** Odesli returns every platform in one call, costing no YouTube quota. */
  function fromOdesli(payload) {
    const links = (payload && payload.linksByPlatform) || {};
    const id = (p) => (links[p] && links[p].url) || null;
    const ytUrl = id("youtube") || id("youtubeMusic");
    const m = ytUrl && ytUrl.match(/[?&]v=([\w-]{11})|youtu\.be\/([\w-]{11})/);
    return {
      youtubeVideoId: m ? (m[1] || m[2]) : null,
      spotifyId: links.spotify ? (links.spotify.entityUniqueId || "").split("::").pop() : null,
      appleId: links.appleMusic ? (links.appleMusic.entityUniqueId || "").split("::").pop() : null,
      universalUrl: (payload && payload.pageUrl) || null,
      source: "odesli",
    };
  }

  /** Keep only Art Tracks — auto-generated "Artist - Topic" uploads. */
  function fromYouTubeSearch(payload) {
    const items = (payload && payload.items) || [];
    const art = items.find(
      (it) => it.snippet && /\s-\sTopic$/.test(it.snippet.channelTitle || "")
    ) || items[0];
    if (!art) return null;
    const vid = art.id && (art.id.videoId || art.id);
    return vid
      ? { youtubeVideoId: vid, universalUrl: null, source: "youtube-search" }
      : null;
  }

  window.__fromOdesli = fromOdesli;            // exposed for the resolver tests
  window.__fromYouTubeSearch = fromYouTubeSearch;

  /* ---------- the chain ---------- */

  /**
   * Resolve one track. `fetcher` is injectable so the ordering is
   * testable with no network at all.
   * Returns a `resolved` object, or null if nothing could be found.
   */
  async function resolveOne(track, opts = {}) {
    const key = cacheKey(track);
    if (memo.has(key)) return memo.get(key);

    if (!FLAGS.remoteResolve && !opts.fetcher) return null;
    const fetcher = opts.fetcher || ((url) => fetch(url).then((r) => r.json()));

    // 2 — Odesli
    try {
      const payload = await fetcher(
        `${FLAGS.remoteBase}/resolve?key=${encodeURIComponent(key)}&via=odesli`,
        { track }
      );
      const r = payload && fromOdesli(payload);
      if (r && r.youtubeVideoId) {
        memo.set(key, r);
        return r;
      }
    } catch (_) { /* fall through — a miss is not a failure */ }

    // 3 — YouTube search, last resort
    try {
      const payload = await fetcher(
        `${FLAGS.remoteBase}/resolve?key=${encodeURIComponent(key)}&via=youtube`,
        { track }
      );
      const r = payload && fromYouTubeSearch(payload);
      if (r && r.youtubeVideoId) {
        memo.set(key, r);
        return r;
      }
    } catch (_) { /* fall through */ }

    // 4 — unresolved, and that is fine
    return null;
  }

  /**
   * Resolve a whole tape. Never throws, never blocks the UI: tracks
   * that don't resolve simply keep `resolved: null`.
   */
  async function resolveBatch(tracks, opts = {}) {
    const out = [];
    for (const t of tracks || []) {
      if (t.resolved && t.resolved.youtubeVideoId) { out.push(t.resolved); continue; }
      out.push(await resolveOne(t, opts));
    }
    return out;
  }

  window.Resolve = { resolveOne, resolveBatch, cacheKey, seedCache, flags: FLAGS };
})();
