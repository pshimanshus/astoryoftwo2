/* ============================================================
   POST /api/resolve
   Turns songs into something playable: a YouTube Art Track id.

   An Art Track is the official, label-delivered audio for a
   recording — generated from the label's DDEX feed, keyed by
   ISRC, living on an "Artist - Topic" channel, rendering as
   static album art rather than video. It is an ordinary
   embeddable video id, which is how a tape plays in our page
   without us touching an audio byte.

   The chain, and why it is in this order:

     1. KV cache   the overwhelmingly common case. Global and
                   PERMANENT — a per-session cache passes testing
                   and dies at a few hundred users.
     2. Odesli     free, one call, returns the YouTube link at
                   ZERO YouTube quota. Absorbs most misses.
     3. YouTube    search.list costs 100 units of 10,000/day, i.e.
                   ~100 searches per DAY across all users. Last
                   resort only, filtered to "- Topic" so we get
                   the record and not a fan video.
     4. unresolved not an error. The row still renders, playback
                   skips it, and it keeps an outbound link.

   Bindings: RESOLVE_CACHE (KV), YOUTUBE_API_KEY (secret, optional)
   ============================================================ */

const ODESLI = "https://api.song.link/v1-alpha.1/links";
const YT_SEARCH = "https://www.googleapis.com/youtube/v3/search";

const MAX_TRACKS = 24;
const YT_BUDGET_PER_REQUEST = 3; // never spend the daily quota on one tape

/* ---------- keys ---------- */

export function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s*[\(\[].*?[\)\]]\s*/g, " ")   // "(Remastered 2011)", "[Live]"
    .replace(/\s*-\s*(remaster(ed)?|live|mono|stereo|radio edit).*$/i, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function cacheKey(track) {
  if (track && track.isrc) return `resolve:isrc:${String(track.isrc).toUpperCase()}`;
  return `resolve:ta:${normalize(track && track.title)}|${normalize(track && track.artist)}`;
}

/* ---------- provider parsing (exported for tests) ---------- */

const VIDEO_ID = /(?:[?&]v=|youtu\.be\/|\/embed\/)([\w-]{11})/;

export function videoIdFromUrl(url) {
  const m = String(url || "").match(VIDEO_ID);
  return m ? m[1] : null;
}

export function fromOdesli(payload) {
  const links = (payload && payload.linksByPlatform) || {};
  // youtubeMusic first: it points at the Art Track where one exists
  const url =
    (links.youtubeMusic && links.youtubeMusic.url) ||
    (links.youtube && links.youtube.url) ||
    null;
  const id = videoIdFromUrl(url);
  return id ? { ytVideoId: id, source: "odesli" } : null;
}

export function fromYouTubeSearch(payload) {
  const items = (payload && payload.items) || [];
  const isTopic = (it) =>
    it && it.snippet && /\s-\s*Topic$/i.test(it.snippet.channelTitle || "");
  // an Art Track beats anything else; otherwise take the first result
  const pick = items.find(isTopic) || items[0];
  const id = pick && pick.id && (pick.id.videoId || pick.id);
  return id ? { ytVideoId: id, source: isTopic(pick) ? "art-track" : "youtube-search" } : null;
}

/* ---------- the chain ---------- */

async function askOdesli(track, fetchImpl) {
  const params = new URLSearchParams();
  if (track.isrc) {
    params.set("url", `isrc:${track.isrc}`);
  } else if (track.spotifyId) {
    params.set("url", `spotify:track:${track.spotifyId}`);
  } else {
    return null; // Odesli needs an identifier, not a free-text query
  }
  params.set("songIfSingle", "true");
  const res = await fetchImpl(`${ODESLI}?${params}`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) return null;
  return fromOdesli(await res.json());
}

async function askYouTube(track, key, fetchImpl) {
  if (!key) return null;
  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    videoCategoryId: "10",       // Music
    videoEmbeddable: "true",     // no point resolving to something we can't embed
    maxResults: "5",
    q: `${track.artist || ""} ${track.title}`.trim(),
    key,
  });
  const res = await fetchImpl(`${YT_SEARCH}?${params}`);
  if (!res.ok) return null;
  return fromYouTubeSearch(await res.json());
}

/**
 * Resolve a list of tracks. Never throws — an unresolved track is a
 * normal outcome, not a failure.
 * `deps` is injectable so the ordering is testable with no network.
 */
export async function resolveTracks(tracks, deps) {
  const { cache, youtubeKey, fetchImpl = fetch } = deps || {};
  const out = [];
  let ytSpent = 0;

  for (const track of tracks.slice(0, MAX_TRACKS)) {
    const key = cacheKey(track);

    // 1 — cache
    if (cache) {
      const hit = await cache.get(key, { type: "json" });
      if (hit && hit.ytVideoId) {
        out.push({ key, ...hit, cached: true });
        continue;
      }
    }

    let found = null;

    // 2 — Odesli (free, zero YouTube quota)
    try {
      found = await askOdesli(track, fetchImpl);
    } catch (_) { /* a miss is not a failure */ }

    // 3 — YouTube search, rationed
    if (!found && ytSpent < YT_BUDGET_PER_REQUEST) {
      ytSpent++;
      try {
        found = await askYouTube(track, youtubeKey, fetchImpl);
      } catch (_) { /* ditto */ }
    }

    if (found) {
      // 5 — permanent. covers don't change and neither do recordings.
      if (cache) {
        try {
          await cache.put(key, JSON.stringify({ ...found, at: Date.now() }));
        } catch (_) { /* a cache write failure must not fail the request */ }
      }
      out.push({ key, ...found, cached: false });
    } else {
      // 4 — unresolved is fine
      out.push({ key, ytVideoId: null, source: null, cached: false });
    }
  }

  return out;
}

/* ---------- the handler ---------- */

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch (_) {
    return json({ error: "expected JSON" }, 400);
  }

  const tracks = Array.isArray(body && body.tracks) ? body.tracks : null;
  if (!tracks || !tracks.length) {
    return json({ error: "tracks required" }, 400);
  }

  const results = await resolveTracks(tracks, {
    cache: env && env.RESOLVE_CACHE,
    youtubeKey: env && env.YOUTUBE_API_KEY,
  });

  return json(
    { results },
    200,
    // resolutions are immutable; let the edge and the browser both hold them
    { "cache-control": "public, max-age=86400, s-maxage=31536000" }
  );
}

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...extra },
  });
}
