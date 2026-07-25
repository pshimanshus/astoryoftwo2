/* ============================================================
   MIXTAPE — song search
   Three tiers, in order of how fast they can answer:

     1. the built-in catalogue   instant, offline, no key
     2. a live provider          long tail — Deezer, then iTunes
     3. whatever you type        the song no catalogue has

   Tier 2 is off by default (window.MIXTAPE_FLAGS.remoteSearch).
   It needs an edge function: Deezer sends no permissive CORS
   headers, and routing through our own endpoint is also where
   caching and rate-limit protection live. See docs/TECH-SPEC.md.
   ============================================================ */

(() => {
  "use strict";

  const CATALOG = window.CATALOG || [];
  const norm = window.normalizeQuery;

  const FLAGS = window.MIXTAPE_FLAGS || (window.MIXTAPE_FLAGS = {
    remoteSearch: false,          // needs /api/search deployed
    remoteBase: "/api",
  });

  /* ---------- tier 1: the catalogue ---------- */

  // Score higher for matches that feel like what the user meant:
  // a title starting with the query beats a title containing it,
  // which beats an artist match.
  function scoreEntry(entry, q, words) {
    let score = 0;

    if (entry._t === q) score += 1000;
    else if (entry._t.startsWith(q)) score += 500;
    else if (entry._t.includes(q)) score += 200;

    if (entry._a === q) score += 400;
    else if (entry._a.startsWith(q)) score += 250;
    else if (entry._a.includes(q)) score += 120;

    // every query word must land somewhere, so "mazzy fade" works
    if (score === 0 && words.length > 1) {
      const hay = entry._t + " " + entry._a;
      if (words.every((w) => hay.includes(w))) score += 90;
    }

    if (score === 0) return 0;

    // nudge word-boundary hits above mid-word coincidences
    if (new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(entry._t)) {
      score += 60;
    }
    return score;
  }

  function searchCatalog(query, limit = 8) {
    const q = norm(query);
    if (!q) return [];
    const words = q.split(" ").filter(Boolean);

    const hits = [];
    for (const entry of CATALOG) {
      const score = scoreEntry(entry, q, words);
      if (score > 0) hits.push({ entry, score });
    }
    hits.sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title));
    return hits.slice(0, limit).map(({ entry }) => toTrack(entry));
  }

  function browseMood(moodBit, limit = 12) {
    const hits = CATALOG.filter((e) => e.moods & moodBit);
    // stable but not always-the-same-order, so browsing feels alive
    for (let i = hits.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [hits[i], hits[j]] = [hits[j], hits[i]];
    }
    return hits.slice(0, limit).map(toTrack);
  }

  /* ---------- normalisation: one Track shape, whatever the source ---------- */

  function toTrack(entry) {
    return {
      id: entry.id,
      title: entry.title,
      artist: entry.artist,
      album: entry.album || null,
      year: entry.year || null,
      durationMs: entry.durationMs || null,
      isrc: entry.isrc || null,
      provider: entry.provider || "catalog",
      providerId: entry.providerId || null,
      artworkUrl: entry.artworkUrl || null,
      previewUrl: entry.previewUrl || null,
    };
  }

  // Shapes below match the real provider responses so that turning
  // remoteSearch on is a flag flip, not a rewrite.
  function fromDeezer(r) {
    return toTrack({
      id: `dz-${r.id}`,
      title: r.title_short || r.title,
      artist: r.artist && r.artist.name,
      album: r.album && r.album.title,
      durationMs: r.duration ? r.duration * 1000 : null,
      provider: "deezer",
      providerId: String(r.id),
      artworkUrl: r.album && (r.album.cover_medium || r.album.cover),
      previewUrl: r.preview || null,
    });
  }

  function fromItunes(r) {
    return toTrack({
      id: `it-${r.trackId}`,
      title: r.trackName,
      artist: r.artistName,
      album: r.collectionName,
      year: r.releaseDate ? Number(r.releaseDate.slice(0, 4)) : null,
      durationMs: r.trackTimeMillis || null,
      provider: "itunes",
      providerId: String(r.trackId),
      artworkUrl: r.artworkUrl100 || null,
      previewUrl: r.previewUrl || null,
    });
  }

  window.__fromDeezer = fromDeezer;   // exposed for the provider tests
  window.__fromItunes = fromItunes;

  /* ---------- tier 2: remote, behind a flag ---------- */

  let inflight = null;

  async function searchRemote(query, limit) {
    if (!FLAGS.remoteSearch) return { tracks: [], status: "disabled" };

    if (inflight) inflight.abort();
    const ctrl = new AbortController();
    inflight = ctrl;

    try {
      const res = await fetch(
        `${FLAGS.remoteBase}/search?q=${encodeURIComponent(query)}&limit=${limit}`,
        { signal: ctrl.signal }
      );
      if (!res.ok) return { tracks: [], status: res.status === 429 ? "ratelimited" : "error" };
      const data = await res.json();
      const raw = Array.isArray(data.tracks) ? data.tracks : [];
      const tracks = raw.map((t) =>
        t.provider === "deezer" ? fromDeezer(t.raw || t)
        : t.provider === "itunes" ? fromItunes(t.raw || t)
        : toTrack(t)
      );
      return { tracks, status: "ok" };
    } catch (err) {
      if (err && err.name === "AbortError") return { tracks: [], status: "aborted" };
      return { tracks: [], status: "offline" };
    } finally {
      if (inflight === ctrl) inflight = null;
    }
  }

  /* ---------- the combined search ---------- */

  function dedupe(tracks) {
    const seen = new Set();
    return tracks.filter((t) => {
      const key = `${norm(t.title)}|${norm(t.artist || "")}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Returns { tracks, status, source }.
   * The catalogue answers immediately; remote results are merged in
   * behind it when available. Remote failure is never fatal — the
   * catalogue result stands and the caller shows a quiet note.
   */
  async function search(query, { limit = 8 } = {}) {
    const local = searchCatalog(query, limit);
    const remote = await searchRemote(query, limit);

    if (remote.status === "aborted") return { tracks: local, status: "aborted", source: "catalog" };

    const merged = dedupe([...local, ...remote.tracks]).slice(0, limit);
    return {
      tracks: merged,
      status: remote.status,
      source: remote.tracks.length ? "both" : "catalog",
    };
  }

  window.Search = {
    search,
    searchCatalog,
    searchRemote,
    browseMood,
    toTrack,
    flags: FLAGS,
  };
})();
