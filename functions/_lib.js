/* ============================================================
   MIXTAPE — edge helpers
   Shared by /api/search and /api/resolve.

   Underscore-prefixed, so Cloudflare Pages does not route it.

   Everything here is plain web-standard Request/Response and
   fetch, which is the point: the handlers run unmodified in
   Node 22 under the verifier, with fetch injected. There is no
   Cloudflare-only API in the request path.
   ============================================================ */

/** JSON response with the cache posture stated explicitly, never by default. */
export function json(body, { status = 200, cache = "no-store", extra = {} } = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cache,
      // The API is meant to be callable by something that isn't our UI
      // (TECH-SPEC "API surface"), but only for reads.
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      ...extra,
    },
  });
}

export function preflight() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-max-age": "86400",
    },
  });
}

/** Query normalisation. This MUST stay character-for-character identical to
    `norm` in catalog.js — the client computes cache keys too, and a key the
    edge computes differently is a permanent cache miss on every request. */
export function normalizeQuery(s) {
  return String(s == null ? "" : s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** ISRC when we have it, else the song's identity. Mirrors resolve.js. */
export function cacheKey(track) {
  if (!track) return "";
  if (track.isrc) return `isrc:${track.isrc}`;
  return `ta:${normalizeQuery(track.title)}|${normalizeQuery(track.artist || "")}`;
}

/** Abort an upstream that is taking longer than the user will wait. */
export async function fetchJSON(fetchImpl, url, { timeoutMs = 4000, ...init } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { ...init, signal: ctrl.signal });
    if (!res.ok) {
      const err = new Error(`upstream ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/* ---------- the store ----------
   A KV binding in production; an in-memory Map when one isn't bound,
   so a misconfigured deploy degrades to "slow but correct" rather
   than "500". The memory fallback is explicitly NOT good enough to
   run on — see docs/DEPLOY.md. */

const memory = new Map();

export function store(env, binding) {
  const kv = env && env[binding];
  if (kv) {
    return {
      kind: "kv",
      get: (k) => kv.get(k, "json"),
      // ttlSeconds omitted === permanent, which is what resolve needs.
      put: (k, v, ttlSeconds) =>
        kv.put(k, JSON.stringify(v), ttlSeconds ? { expirationTtl: ttlSeconds } : undefined),
    };
  }
  return {
    kind: "memory",
    get: async (k) => {
      const hit = memory.get(k);
      if (!hit) return null;
      if (hit.expires && hit.expires < Date.now()) { memory.delete(k); return null; }
      return hit.value;
    },
    put: async (k, v, ttlSeconds) => {
      memory.set(k, { value: v, expires: ttlSeconds ? Date.now() + ttlSeconds * 1000 : 0 });
    },
  };
}

export function __resetMemoryStore() { memory.clear(); }
