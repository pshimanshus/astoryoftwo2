/* ============================================================
   MIXTAPE — tape codec
   A whole tape, encoded into a URL fragment.

   Twelve songs with reasons is ~1KB deflated and base64url'd,
   which fits comfortably in a link. That means sharing needs no
   server, no database and no account — and because a fragment is
   never sent to the origin, a shared tape is private by
   construction.

   Trade-off: a fragment carries no server-rendered OG image, so
   link previews are generic. That is the first thing a backend
   should buy back. See docs/JOURNEY.md.
   ============================================================ */

(() => {
  "use strict";

  const VERSION = 3;

  /* ---------- base64url ---------- */

  function bytesToB64url(bytes) {
    let bin = "";
    const CHUNK = 0x8000; // avoid blowing the argument limit on big inputs
    for (let i = 0; i < bytes.length; i += CHUNK) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
    }
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function b64urlToBytes(s) {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  /* ---------- optional deflate ----------
     CompressionStream is widely available but not universal, and the
     payload is small enough to survive without it — so treat it as a
     bonus rather than a requirement. Prefix marks which path was used. */

  const canDeflate = typeof CompressionStream === "function";

  async function pipeThrough(bytes, stream) {
    const res = new Response(new Blob([bytes]).stream().pipeThrough(stream));
    return new Uint8Array(await res.arrayBuffer());
  }

  /* ---------- what actually travels ----------
     Short keys, and only fields the recipient needs. Nothing local
     (publishedId, ownerToken) and nothing re-derivable. */

  function pack(state) {
    return {
      v: VERSION,
      t: state.title || "",
      to: state.to || "",
      f: state.from || "",
      n: state.note || "",
      th: state.theme || 0,
      s: (state.songs || []).map((s) => {
        const e = [s.title, s.artist || ""];
        // trailing optionals only when present, so short tapes stay short
        const tail = {
          ...(s.reason ? { r: s.reason } : {}),
          ...(s.year ? { y: s.year } : {}),
          ...(s.durationMs ? { d: s.durationMs } : {}),
          ...(s.isrc ? { i: s.isrc } : {}),
          ...(s.resolved && s.resolved.youtubeVideoId
            ? { yt: s.resolved.youtubeVideoId }
            : {}),
        };
        return Object.keys(tail).length ? [...e, tail] : e;
      }),
    };
  }

  function unpack(o) {
    if (!o || typeof o !== "object") throw new Error("not a tape");
    const songs = Array.isArray(o.s) ? o.s : [];
    return {
      v: o.v || VERSION,
      title: String(o.t || ""),
      to: String(o.to || ""),
      from: String(o.f || ""),
      note: String(o.n || ""),
      theme: Number.isInteger(o.th) ? o.th : 0,
      songs: songs.slice(0, 12).map((row) => {
        const [title, artist, tail] = Array.isArray(row) ? row : [];
        const x = tail || {};
        return {
          title: String(title || ""),
          artist: String(artist || ""),
          album: null,
          year: x.y || null,
          durationMs: x.d || null,
          isrc: x.i || null,
          provider: "shared",
          providerId: null,
          artworkUrl: null,
          reason: String(x.r || ""),
          authorId: "p1",
          addedAt: null,
          resolved: x.yt ? { youtubeVideoId: x.yt } : null,
        };
      }).filter((s) => s.title),
    };
  }

  /* ---------- public API ---------- */

  async function encode(state) {
    const json = JSON.stringify(pack(state));
    const raw = new TextEncoder().encode(json);
    if (canDeflate) {
      try {
        const z = await pipeThrough(raw, new CompressionStream("deflate-raw"));
        return "z" + bytesToB64url(z);
      } catch (_) { /* fall through to plain */ }
    }
    return "u" + bytesToB64url(raw);
  }

  async function decode(str) {
    if (!str || typeof str !== "string" || str.length < 2) {
      throw new Error("empty tape");
    }
    const mode = str[0];
    const bytes = b64urlToBytes(str.slice(1));
    let raw = bytes;
    if (mode === "z") {
      if (typeof DecompressionStream !== "function") {
        throw new Error("this browser can't unpack that link");
      }
      raw = await pipeThrough(bytes, new DecompressionStream("deflate-raw"));
    } else if (mode !== "u") {
      throw new Error("unknown tape format");
    }
    return unpack(JSON.parse(new TextDecoder().decode(raw)));
  }

  /** Full shareable URL for a tape. */
  async function toUrl(state, base) {
    const root = base || location.href.replace(/\/[^/]*$/, "/");
    return `${root}tape.html#t=${await encode(state)}`;
  }

  /** Read a tape out of the current location, or null if there isn't one. */
  async function fromLocation(loc) {
    const hash = (loc || location).hash || "";
    const m = hash.match(/[#&]t=([^&]+)/);
    if (!m) return null;
    return decode(decodeURIComponent(m[1]));
  }

  window.TapeCodec = { encode, decode, toUrl, fromLocation, VERSION, canDeflate };
})();
