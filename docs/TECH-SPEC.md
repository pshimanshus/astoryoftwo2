# Technical specification — Mixtape

The *How*. `PRD.md` is the What and Why. `JOURNEY.md` is the flows.
`BUILD-PLAN.md` is the execution order.

---

## 0. Principles that constrain every decision

1. **The app never touches audio bytes.** Playback is an embedded, licensed
   player. Break this and the product needs licensing it can't afford.
2. **No third party is a hard dependency.** Every provider degrades to
   something usable; the app works with all of them down.
3. **Anonymous-first.** Nothing in the create → send → play path requires an
   account. Auth is additive.
4. **The recipient path is sacred.** It must be fast, dependency-light, and up.

---

## 1. Stack and deployment

**Recommended: Cloudflare.** Chosen because the recipient path is latency- and
availability-critical and this puts every read at the edge.

| Concern | Choice |
|---|---|
| Static app | Cloudflare Pages |
| API | Pages Functions (Workers runtime) |
| Tapes, users, sessions | **D1** (SQLite) |
| Resolution cache, rate limits | **KV** (global, eventually consistent — fine, it's a cache) |
| Voice notes | **R2** (object storage, user-owned audio only) |
| OG images | Workers + `@cloudflare/pages-plugin-vercel-og`, cached in KV |
| Email (magic links) | Resend or Postmark |

*(Vercel + Postgres + Blob is an equivalent second choice. The code below is
runtime-agnostic — Web Fetch API handlers, no Node built-ins.)*

**Frontend stays vanilla.** No framework. The canvas cover renderer, the DOM
cassette and the motion layer are all done and verified; a rewrite buys nothing.
Add a bundler only when module count justifies it.

```
/                     index.html   — create flow
/t/:id                tape.html    — recipient page (SSR'd shell + OG tags)
/me                   library.html — my tapes (auth required)
/api/*                Pages Functions
```

---

## 2. Data model (D1)

```sql
CREATE TABLE users (
  id            TEXT PRIMARY KEY,            -- usr_<ulid>
  email         TEXT UNIQUE NOT NULL,
  created_at    INTEGER NOT NULL,
  deleted_at    INTEGER
);

CREATE TABLE tapes (
  id            TEXT PRIMARY KEY,            -- 16 url-safe chars, >=128 bits entropy
  owner_id      TEXT REFERENCES users(id),   -- NULL while anonymous
  owner_token   TEXT NOT NULL,               -- capability for anonymous edit/revoke
  mode          TEXT NOT NULL DEFAULT 'gift',-- gift | duet
  title         TEXT NOT NULL,
  to_name       TEXT,
  from_name     TEXT,
  note          TEXT,
  theme         INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL,
  published_at  INTEGER,
  revoked_at    INTEGER,
  open_count    INTEGER NOT NULL DEFAULT 0,  -- count only. never contents.
  play_count    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE entries (
  id            TEXT PRIMARY KEY,
  tape_id       TEXT NOT NULL REFERENCES tapes(id) ON DELETE CASCADE,
  position      INTEGER NOT NULL,
  side          TEXT NOT NULL,               -- A | B
  author_id     TEXT,                        -- enables duet mode later
  added_at      INTEGER NOT NULL,
  reason        TEXT NOT NULL DEFAULT '',    -- THE product
  voice_key     TEXT,                        -- R2 object key, sender's own audio
  title         TEXT NOT NULL,
  artist        TEXT NOT NULL DEFAULT '',
  album         TEXT,
  year          INTEGER,
  duration_ms   INTEGER,
  isrc          TEXT,                        -- join key for Art Tracks
  provider      TEXT NOT NULL,               -- catalog|deezer|itunes|manual
  provider_id   TEXT,
  artwork_url   TEXT,                        -- hotlinked. NEVER baked into exports.
  yt_video_id   TEXT,                        -- the Art Track. NULL = unresolved
  resolved_at   INTEGER
);
CREATE INDEX idx_entries_tape ON entries(tape_id, position);

CREATE TABLE sessions (
  token_hash    TEXT PRIMARY KEY,            -- sha256(token). never store the token.
  user_id       TEXT NOT NULL REFERENCES users(id),
  created_at    INTEGER NOT NULL,
  expires_at    INTEGER NOT NULL
);

CREATE TABLE magic_links (
  token_hash    TEXT PRIMARY KEY,
  email         TEXT NOT NULL,
  tape_id       TEXT,                        -- claim this tape on sign-in
  expires_at    INTEGER NOT NULL,            -- 15 minutes
  used_at       INTEGER
);
```

### KV: the resolution cache

```
resolve:isrc:USEE19300012        -> { ytVideoId, source, at }
resolve:ta:fade into you|mazzy star -> { ytVideoId, source, at }
```

**Global and permanent.** No TTL. This is the single most important scaling
decision in the system — see §4.

---

## 3. API

All handlers are Web-standard `(request, env) => Response`. JSON in, JSON out.
Auth via `Cookie: mx_session` (HttpOnly, Secure, SameSite=Lax).

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/api/search?q=&limit=` | — | Catalogue is client-side; this is the long tail: Deezer → iTunes, normalised |
| POST | `/api/resolve` | — | `{ tracks:[{title,artist,isrc}] }` → `{ results:[{key,ytVideoId,source}] }` |
| POST | `/api/tapes` | optional | Publish. Requires `Idempotency-Key`. → `{ id, ownerToken, url }` |
| GET | `/api/tapes/:id` | — | Full tape + entries. 410 if revoked. |
| PATCH | `/api/tapes/:id` | owner | Edit. Auth by session **or** `X-Owner-Token`. |
| DELETE | `/api/tapes/:id` | owner | Revoke (soft) |
| POST | `/api/tapes/:id/voice` | owner | Presigned R2 upload for a voice note |
| POST | `/api/auth/request` | — | `{ email, tapeId? }` → sends magic link. Always 200 (no account enumeration). |
| GET | `/api/auth/callback?token=` | — | Verify, create session, claim tape, redirect |
| POST | `/api/auth/signout` | session | Delete session |
| GET | `/api/me` | session | `{ user, tapes: { sent, received } }` |
| DELETE | `/api/me` | session | Delete account + all tapes (GDPR) |
| POST | `/api/events` | — | `{ type: "open"|"play", tapeId }` — counters only |

**Rate limits** (KV, per IP): search 30/min · resolve 10/min · publish 10/hr ·
auth request 5/hr per email.

---

## 4. Resolution — how a song becomes playable

This is the critical path for the whole product. Runs server-side, asynchronously
after publish, and again lazily on read for anything still unresolved.

```
for each track:

 1. KV CACHE          key = isrc || normalize("title|artist")
    hit  → done. zero external calls.            ← the overwhelmingly common case
    miss ↓

 2. ODESLI            api.song.link/v1-alpha.1/links?url=…|isrc=…
    free, ~10 req/min, returns youtube + youtubeMusic links in ONE call
    hit  → extract the 11-char video id → cache → done   ← ZERO YouTube quota
    miss ↓

 3. YOUTUBE DATA API  search.list — 100 units of 10,000/day
    q="{artist} {title}", type=video, videoCategoryId=10, maxResults=5
    keep the first item whose snippet.channelTitle ends " - Topic"   ← Art Track
    else fall back to the first result flagged as official audio
    hit  → cache → done
    miss ↓

 4. UNRESOLVED        yt_video_id stays NULL. The row still renders, it is
                      skipped during playback, and it keeps an outbound link.
```

**The arithmetic that forces this shape.** `search.list` costs 100 units against
10,000/day — about **100 searches per day across all users combined**, no paid
tier, extensions by manual review. Unusable as a per-track lookup. Odesli absorbs
most misses at zero YouTube cost, and because tapes skew hard to well-known
songs, the permanent global cache saturates fast. A per-session or per-tape cache
passes testing and dies at a few hundred users.

**ISRC availability is uneven.** Deezer `/search` and iTunes Search don't return
it (Deezer `/track/{id}` does; Spotify search returns `external_ids.isrc`). The
cache key degrades to normalised `title|artist`.

---

## 5. Playback — the embedded YT Music player

> **Requirement B1–B7. This is what makes it an app rather than a picture.**

### Why Art Tracks are "YT Music"

There is **no public YouTube Music API and `music.youtube.com` is not
embeddable**. But an **Art Track** is *"an automatically generated YouTube
version of a sound recording"* — the official, label-delivered audio, generated
from the label's DDEX feed, keyed by ISRC, living on an `Artist – Topic`
channel, rendering as **static album art rather than video**.

An Art Track is an ordinary `youtube.com` video id. So: resolve to the Art Track,
embed the standard IFrame player, and what plays is the record — not a fan
video. Full length, free, licensed, for everyone, no login.

### Compliance — non-negotiable, and it shapes the UI

| Rule | Consequence here |
|---|---|
| Player viewport **≥200×200**, 16:9 recommended **≥480×270** | It lives in the cassette window, which is sized to satisfy this at every breakpoint |
| Controls fully visible, player not obscured | No overlay, no scrim, no decorative frame on top |
| **Do not override the platform's rendering** | No custom skin, no hiding the video to make an audio-only player |
| Don't strip branding or block ads | Ship it as-is |

The tempting "hide it and build our own transport" is the violation, and since
YouTube is the entire playback layer, losing API access ends the product. The
happy accident: an Art Track *is* album art, so a visible player in the tape
window is also the right design.

### Implementation

```js
// player.js — one player, owned by the tape page
YT.Player(mount, {
  width: "100%", height: "100%",          // container enforces >=480x270
  playerVars: {
    playsinline: 1,   // iOS: play inline, not fullscreen takeover
    rel: 0,           // no unrelated recommendations after a track
    modestbranding: 1,
  },
  events: { onReady, onStateChange, onError },
});
```

**Sequencing.** Do **not** use `cuePlaylist` with the full tape — a tape mixes
resolved and unresolved tracks and the two indexes drift. Instead keep our own
queue of resolved entries and call `loadVideoById(id)` on each advance. Our
index is the source of truth; that index drives which reason is on screen (B5).

**Autoplay.** Browsers block audible autoplay without a gesture. The first tap
on the play button *is* the gesture; every subsequent `loadVideoById` inherits
it. Never attempt to autoplay on page load — it fails silently and looks broken.

**Errors.** `onError` codes 2/5/100/101/150 → mark the entry unavailable, log a
counter, **advance to the next resolved track**. One dead video must never stall
a tape.

**Flip.** Side B continues the same queue. Reaching the end of side A auto-flips
the cassette and keeps playing.

**Voice notes (B8).** A separate `<audio>` element playing our own R2 object.
Pause the YouTube player, play the voice, resume. Only ever the sender's own
recording — never third-party audio.

### Fallback ladder

```
Art Track          → plays in the window
official audio     → plays in the window
unresolved         → skipped in the queue, keeps a "listen" link out
embed blocked      → detected via onReady timeout; whole page falls back to
                     the tracklist + outbound links, with a plain explanation
```

---

## 6. Auth

**Magic link only.** No passwords, no OAuth at launch. One field.

```
POST /api/auth/request { email, tapeId? }
  → token = 32 random bytes, base64url
  → store sha256(token), 15-min TTL, single use
  → email the link. Response is ALWAYS 200 — never reveal whether the email exists.

GET /api/auth/callback?token=…
  → look up sha256(token); reject if used or expired; mark used
  → upsert user; create session (sha256 stored, 30-day expiry)
  → if tapeId present and the tape is unclaimed, set owner_id
  → Set-Cookie: mx_session=…; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000
  → 302 to /me
```

**Anonymous ownership.** Publishing returns an `ownerToken` — a bearer
capability stored in localStorage. It authorises edit and revoke with no
account, and is exchanged for real ownership when the tape is claimed. This is
what lets the entire journey work signed out.

**Security.** Tokens are never logged or stored in plaintext. Sessions are
rotated on sign-in. `DELETE /api/me` hard-deletes tapes, entries and R2 objects.

---

## 7. Sharing and OG previews

Fragment-encoded links (`tape-codec.js`) got the prototype working with no
backend, but a fragment is invisible to crawlers, so shared links preview as a
blank card. Since the preview *is* the first impression, server-backed short
links are P0.

```
POST /api/tapes           → { id: "k3f9x2q1", url: "https://…/t/k3f9x2q1" }
GET  /t/:id               → SSR shell with:
       <meta property="og:image" content="https://…/api/og/k3f9x2q1.png">
       <meta property="og:title" content="A mixtape for Aanya">
       <meta name="robots" content="noindex">
GET  /api/og/:id.png      → 1200×630 rendered from the same theme painters,
                            cached in KV forever (covers are immutable)
```

`tape-codec.js` stays for offline/no-backend sharing and as the fallback when
publishing fails.

---

## 8. Privacy

- **No analytics on tape contents.** Counters and timings only. Titles, names,
  reasons and voice notes are never sent to any analytics surface.
- Tape ids ≥128 bits; `noindex`; revocable.
- Voice notes are private R2 objects served via short-lived signed URLs.
- `DELETE /api/me` removes everything, including R2 objects.
- No third-party scripts on `/t/:id` other than the YouTube IFrame API.

---

## 9. Performance budget

| Thing | Budget |
|---|---|
| JS + CSS, excluding fonts | ≤250KB |
| Fonts | ~220KB self-hosted woff2, `font-display: swap` |
| **Open tape → first note** | **<3s** |
| Tape page TTFB | ≤300ms (edge) |
| Cover render | ≤400ms |
| Search P95 | 200ms cached / 900ms cold |

The YouTube IFrame API script is ~90KB and loads **lazily on first play intent**,
not on page load, so it stays outside first paint.

---

## 10. Testing

Per `.claude/skills/build-loop`, verification is behavioural — drive the app,
don't just unit-test.

- **function** — every journey in `JOURNEY.md`, including failure paths
- **playback** — resolved queue advances; unresolved skipped; `onError` advances;
  reason tracks the now-playing index; flip continues the queue
- **rights** — network log proves no audio from our origin; player ≥480×270 and
  unobscured; no third-party artwork in the exported PNG
- **a11y** — keyboard transport, labelled controls, `prefers-reduced-motion`
- **unit** — pure logic only: side splitting, time budget, schema migration,
  provider normalisation, resolver ordering, codec round-trip

**Sandbox limitation:** this environment's egress proxy 403s `youtube.com`,
`api.deezer.com`, `itunes.apple.com` and `api.song.link`. Playback and live
resolution **cannot be verified here** — build against fixtures that mirror the
real response shapes (the `fromDeezer`/`fromItunes`/`fromOdesli` normalisers
already exist for exactly this) and verify live on a deployed preview.
