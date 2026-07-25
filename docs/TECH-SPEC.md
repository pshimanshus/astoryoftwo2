# Technical specification

Companion to `docs/PRD.md`. Music/licensing architecture is in `docs/MUSIC.md`.
This document is the *How*; the PRD is the *What and Why*.

## Guiding constraints

1. **The app works with zero backend.** Everything in phase 0–1 runs from static
   files + localStorage. The server is an accelerant for sharing, never a
   requirement for making.
2. **No third party is a hard dependency.** Every provider degrades to manual.
3. **No audio, ever.** See the rights checklist.
4. **The brand is enforced in code** via `brand.css`, not by convention.

## Architecture

```
┌───────────────────────────────────────────────────────┐
│  BROWSER                                              │
│                                                       │
│  index.html ── brand.css ── themes.js ── cover.js     │
│       │                                               │
│       ├── state (in-memory) ──▶ localStorage          │
│       ├── canvas renderer ────▶ 1080² PNG             │
│       └── search client ──┐                           │
└───────────────────────────┼───────────────────────────┘
                            │  (only when online + flag on)
                  ┌─────────▼──────────┐
                  │  EDGE FUNCTIONS    │
                  │                    │
                  │  /api/search       │──▶ Deezer → iTunes
                  │  /api/resolve      │──▶ Odesli      (cache 7d)
                  │  /api/tapes        │──▶ KV/Postgres
                  │  /t/:id  (SSR)     │──▶ tape page + OG tags
                  └────────────────────┘
```

**Why edge functions rather than a full backend:** the only genuinely
server-shaped needs are (a) hiding provider calls behind a cache to respect rate
limits, (b) CORS — Deezer doesn't send permissive headers, (c) server-rendered
OG tags so a shared link previews properly, (d) persisting published tapes.
None of that needs a long-running server.

**Stack recommendation:** keep the app dependency-free vanilla (it already is,
and the canvas work has no framework to gain from), deploy static + edge
functions on Cloudflare Pages or Vercel, with KV/D1 or Postgres for tapes. If
this ever needs a framework, that's a decision to make with evidence, not now.

## Data model

### Client state (localStorage, key `mixtape-moodboard`)

```jsonc
{
  "v": 2,                       // schema version — migrate on read, never on write
  "title": "Songs I Never Sent You",
  "to": "Aanya",
  "from": "Himanshu",
  "note": "Play this when you miss me.",
  "theme": 0,                   // index into THEMES
  "songs": [ /* Track[] */ ],
  "publishedId": "…",           // present once shared
  "publishedAt": "2026-07-25T…"
}
```

Version the schema now. Migrating a saved tape someone spent an hour on is not
a place to improvise later.

### Track

```jsonc
{
  "id": "uuid",
  "title": "Fade Into You",     // always user-editable, even when matched
  "artist": "Mazzy Star",
  "album": "So Tonight That I Might See",
  "durationMs": 294000,         // null ⇒ budget assumes 3:30
  "isrc": "USEE19300012",       // cross-platform key when available
  "provider": "deezer",         // deezer | itunes | manual
  "providerId": "3135556",
  "artworkUrl": "https://…",    // hotlinked; NEVER baked into an export
  "previewUrl": "https://…",    // provider CDN; fetched at play, never cached
  "links": { "universal": "https://song.link/…" }   // resolved lazily
}
```

### Published tape (server)

```jsonc
{
  "id": "8f3a…",                // ≥128-bit, unguessable, url-safe
  "tape": { /* client state minus publishedId */ },
  "createdAt": "…",
  "revokedAt": null,
  "ownerToken": "…"             // returned once to the sender; enables edit/revoke
                                // without an account
}
```

`ownerToken` is how "edit after publish" works before accounts exist — the sender
keeps a capability, not an identity.

## API surface

Design these to be callable by something that isn't our UI — the MCP server in
PRD Epic E reuses them directly.

| Endpoint | Method | Purpose | Cache | Notes |
|---|---|---|---|---|
| `/api/search?q=` | GET | track search | 24h edge | Deezer → iTunes fallthrough; returns normalised `Track[]` with a `provider` field so the UI can render the right badge |
| `/api/resolve` | POST | universal + platform links | 7d edge | batch of ISRC/provider ids; lazy, never blocks the UI |
| `/api/tapes` | POST | publish | — | idempotency key required; returns `{id, ownerToken}` |
| `/api/tapes/:id` | GET | fetch a tape | 60s | 404 if revoked |
| `/api/tapes/:id` | PATCH/DELETE | edit/revoke | — | requires `ownerToken` |
| `/t/:id` | GET | SSR tape page | 60s | OG/Twitter tags, `noindex`, no third-party scripts |

**Normalisation matters.** Deezer and iTunes disagree on field names, artwork
sizes, and duration units. Normalise at the edge so the client never branches on
provider except to pick the attribution badge.

## Search behaviour

```
keystroke → debounce 300ms → abort in-flight → /api/search
                                                  │
                    ┌─────────────────────────────┤
                    ▼                             ▼
              cache hit (24h)              Deezer  ──429/5xx──▶ iTunes
                    │                        │                    │
                    └────────────┬───────────┴────────────────────┘
                                 ▼                         all fail
                          normalised Track[]                  │
                                                              ▼
                                             inline note + manual entry stays open
```

Rules:
- Abort superseded requests — out-of-order responses that repaint stale results
  are the classic search bug.
- **Manual entry is always visible**, not revealed on zero results. It's the
  canonical path (PRD J7).
- Never block the UI on `/api/resolve`; links fill in behind the tape.

## Rendering

Unchanged and working. Key invariants for anyone touching it:

- `cover.js` composes; `themes.js` paints per era; `U.rr`/`U.fit`/`U.sideBadge`
  are shared — don't re-roll them.
- `drawCassette` is called at a **fixed rect**; backgrounds must avoid it and the
  tracklist panel.
- Bottom ~110px is reserved for note + signature.
- Canvas `letterSpacing` adds a trailing gap; offset centred text by half.
- Fonts must be loaded (`document.fonts.load`) before any canvas paint, or the
  first render silently uses fallback glyphs.
- **The exported PNG contains only our own drawing.** Album artwork lives in the
  DOM, never on the export canvas. This is a rights boundary, not a style choice.

## Offline

Service worker, cache-first for the shell (`index.html`, `brand.css`, `themes.js`,
`cover.js`, `fonts/*`). Creating, editing, theming, rendering and downloading all
work with no network — none of it needs one today, and the SW just makes that
durable. Publishing queues via Background Sync where available, otherwise retries
on next load.

## Performance budget

| Thing | Budget |
|---|---|
| JS + CSS (excl. fonts) | ≤250KB |
| Fonts | ~220KB, self-hosted, `swap` |
| Cover render | ≤400ms |
| Search P95 cached / uncached | 200ms / 900ms |
| Tape page TTFB | ≤300ms (edge-cached) |

Fonts are the largest asset. Subset to latin at build time if the budget tightens.

## Security & privacy

- Recipient OAuth (Spotify/Apple) runs in the recipient's browser; **tokens are
  never sent to or stored on our server.**
- Tape ids are ≥128-bit — enumeration must be infeasible.
- Tape pages are `noindex` and carry no third-party scripts.
- CSP: `default-src 'self'`; allow provider image + audio CDNs explicitly; no
  inline script once the code is split out of `index.html`.
- Analytics are content-blind — counts and timings, never titles, names or notes.
- `ownerToken` is a bearer capability: single-use display, never logged.

## Testing

Per `build-loop`, verification is behavioural, not unit-first:

- **Function:** Playwright drives the real flows and the failure paths (offline,
  429, empty results, duplicate publish, 12-song cap, reload-resume).
- **Design:** renders every screen and every cover theme; critiques images.
- **Rights:** network log proves no audio from our origin and no third-party art
  in the export.
- **A11y/perf:** axe, keyboard path, contrast, Lighthouse budget.

Unit tests earn their place for pure logic only — side-splitting, time budget,
schema migration, provider normalisation. Everything else is verified by
driving the app.

## Build phases

| Phase | Work | New infra |
|---|---|---|
| 1 | `/api/search`, search UI, manual entry, fallback chain | edge fn + cache |
| 2 | `/api/tapes`, `/t/:id` SSR, share link | KV/Postgres |
| 3 | previews + badges, `/api/resolve`, Spotify export | Odesli key, Spotify app |
| 4 | accounts (magic link), my-tapes, edit-after-publish | auth, mail |
| 5 | `mixtape-mcp`, CC-catalogue mode | MCP host, Jamendo key |

Phase 1 and 2 are the product. Everything after is amplification — and per the
PRD, phase 3 onward is gated on the phase-2 share rate clearing 25%.
