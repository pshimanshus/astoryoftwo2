/* ============================================================
   MIXTAPE — GET /api/search?q=&limit=
   The long tail: the song no catalogue has.

     Deezer  ──429/5xx/timeout──▶  iTunes  ──fail──▶  empty, not an error

   Why this exists at the edge rather than in the browser: Deezer
   sends no permissive CORS headers, so the client physically cannot
   call it. Routing through our own origin is also where the cache
   and the rate-limit protection live. See docs/TECH-SPEC.md.

   RIGHTS — this endpoint returns song *identity and links only*.
   `previewUrl` is a URL on the provider's own CDN, passed straight
   through. We never fetch, proxy, store or re-host those bytes; the
   moment audio flows through our origin the product needs licensing
   it cannot afford. Artwork is the same: a URL for transient DOM
   use, never fetched here, never baked into an export.
   ============================================================ */

import { json, preflight, normalizeQuery, fetchJSON, store } from "../_lib.js";

const SEARCH_TTL = 60 * 60 * 24;    // 24h, per the TECH-SPEC endpoint table
const MAX_LIMIT = 25;

/* ---------- normalisation ----------
   Deezer and iTunes disagree on field names, artwork sizes and
   duration units. We normalise here so the client never branches
   on provider — it already knows these two shapes (search.js
   __fromDeezer / __fromItunes), so we return `provider` plus the
   raw row and let the client's tested mappers do the final step. */

function deezerRows(payload, limit) {
  const data = (payload && payload.data) || [];
  return data
    .filter((r) => r && r.id && r.title)
    .slice(0, limit)
    .map((r) => ({ provider: "deezer", raw: r }));
}

function itunesRows(payload, limit) {
  const data = (payload && payload.results) || [];
  return data
    .filter((r) => r && r.trackId && r.trackName)
    .slice(0, limit)
    .map((r) => ({ provider: "itunes", raw: r }));
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return preflight();
  if (request.method !== "GET") return json({ error: "method not allowed" }, { status: 405 });

  const url = new URL(request.url);
  const raw = url.searchParams.get("q") || "";
  const q = normalizeQuery(raw);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(url.searchParams.get("limit")) || 8));

  // An empty query is a no-op, not a 400: the client debounces and can
  // race a cleared input. Returning a shape it understands keeps the
  // finder from flashing an error at someone who just hit backspace.
  if (!q) return json({ tracks: [], source: "empty" }, { cache: "no-store" });

  const cache = store(env, "SEARCH_CACHE");
  const key = `search:${q}:${limit}`;

  const hit = await cache.get(key);
  if (hit) return json({ ...hit, cached: true }, { cache: `public, max-age=${SEARCH_TTL}` });

  const fetchImpl = (context.fetchImpl || globalThis.fetch).bind(globalThis);
  const attempted = [];
  let tracks = null;
  let source = null;

  // 1 — Deezer. Better metadata and a preview URL on most rows.
  try {
    attempted.push("deezer");
    const payload = await fetchJSON(
      fetchImpl,
      `https://api.deezer.com/search?q=${encodeURIComponent(raw)}&limit=${limit}`
    );
    const rows = deezerRows(payload, limit);
    if (rows.length) { tracks = rows; source = "deezer"; }
  } catch (_) { /* fall through — the whole point of the chain */ }

  // 2 — iTunes. No key, generous limits, weaker metadata.
  if (!tracks) {
    try {
      attempted.push("itunes");
      const payload = await fetchJSON(
        fetchImpl,
        `https://itunes.apple.com/search?media=music&entity=song&term=${encodeURIComponent(raw)}&limit=${limit}`
      );
      const rows = itunesRows(payload, limit);
      if (rows.length) { tracks = rows; source = "itunes"; }
    } catch (_) { /* fall through */ }
  }

  // 3 — nobody answered. The client already treats this as "no results",
  // and tier 1 + manual entry still work, so this is not a 5xx.
  if (!tracks) {
    return json({ tracks: [], source: "none", attempted }, { cache: "no-store" });
  }

  const body = { tracks, source, attempted };
  // Only successful lookups are cached; a provider outage must not be
  // remembered for 24 hours.
  await cache.put(key, body, SEARCH_TTL);
  return json(body, { cache: `public, max-age=${SEARCH_TTL}` });
}
