# Mixtape — project brief

Make someone a mixtape: write on the tape, say **why** you chose each song,
share a cassette cover they can actually play.

Read this first. It is the map; the skills below are the law.

---

## What this is (and what it isn't)

A **gift to one person**, not a music profile. Every competitor in this space
(supertape, getmixtape, MusicThread, Owline…) is a social network for taste —
feeds, followers, discovery. We are a love letter. That positioning is the
whole differentiation, so:

**Never build:** a social feed, public tape discovery, taste profiles, follower
graphs. See `docs/GROWTH.md`.

**The product is the reason, not the song.** Anyone can send a playlist link.
Nobody else has a place to write *"this one's about that night in Bandra."*
The cassette aesthetic is the wrapping.

---

## Architecture

Static, dependency-light, no build step required to run it.

```
index.html    the create flow (3 scenes: album → songs → share)
tape.html     the recipient page (cover, note, tracklist, player, the flip)
brand.css     design tokens + shared primitives — the frozen brand, in code
motion.js     settle / writeIn / drawOn / flip / crossFade / stepChange
catalog.js    ~170 curated songs, facts only (no audio, no artwork)
search.js     catalogue index + Deezer/iTunes provider layer (flag-gated)
tape-codec.js packs a whole tape into a URL fragment — sharing with no backend
player.js     YouTube IFrame wrapper, mounts an Art Track in the cassette window
resolve.js    cache → Odesli → YouTube-search resolution chain (flag-gated)
themes.js     five era painters (backgrounds + cassette labels)
cover.js      1080² cover composition + the cassette renderer
vendor/       motion.min.js (Motion mini, ~5kb gzipped, built from npm)
functions/    the two edge functions — /api/search, /api/resolve
scripts/      the verifier harnesses
```

The edge functions are **optional**: the app runs without them, with catalogue
search and fallback links. They are plain web-standard `Request`/`Response`
with `fetch` injectable, so they run unmodified under the verifier with no
network at all. Deploying is `docs/DEPLOY.md`.

**Feature flags** live on `window.MIXTAPE_FLAGS`: `remoteSearch`,
`remoteResolve`, both **off** by default. Every third-party integration must be
independently killable without breaking tape creation.

---

## Skills — load these, don't improvise

| Skill | When |
|---|---|
| **`mixtape-brand`** | before ANY UI, style, component, or cover work. Non-negotiables, tokens, motion physics, copy voice. |
| **`build-loop`** | before any multi-step feature. Three gates, five verifiers, hard 3-round limit. |
| `motion-dev-animations` | third-party (MIT). Its spring-physics and API references are useful; **its React/JSX code generation is not** — this app is vanilla. Use `motion.js` primitives. |

---

## Commands

```bash
npm run dev            # static server on :8321
npm run verify         # function + rights + a11y + perf  (currently 81 checks)
npm run verify:build   # 28 function/rights checks
npm run verify:a11y    # 12 a11y/perf checks
npm run verify:search  # 21 search/mood/manual-entry checks
npm run verify:api     # 20 edge-function checks (no network — injected fetch)
npm run render:covers  # export all five cover themes to .shots/
```

Playwright + Chromium are preinstalled (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`).
**Never run `playwright install`.** ESM can't resolve the global install, so
harnesses are CJS with `NODE_PATH=/opt/node22/lib/node_modules`.

---

## Hard boundaries

**Rights** — see `build-loop/references/rights-checklist.md`. These are blocking:

- The app **never hosts, caches or serves audio.** It stores song identity and
  links. Break this and the whole product needs licensing it cannot afford.
- **No third-party artwork in the exported PNG.** Album art may appear in
  transient DOM only. The cover is 100% our own canvas drawing.
- Embedded players must stay **visible, ≥200×200** (≥480×270 where the layout
  allows), branding intact. Hiding the video to build a custom skin is the
  violation — and YouTube is our entire playback layer, so losing API access
  ends the product.

**Privacy** — a tape is one person's message to another. No analytics on tape
*contents*, ever. Counts and timings only.

---

## Gotchas already paid for

Each of these cost a debugging cycle. Don't rediscover them.

- **Canvas `letterSpacing` adds a trailing gap**, which shifts centred text
  right. Offset by half the tracking when `textAlign = "center"`.
- **Fonts must be loaded before any canvas paint** (`document.fonts.load`), or
  the first render silently uses fallback glyphs.
- **`drawCassette` is called at a fixed rect.** Theme backgrounds must avoid it
  and the tracklist panel; the bottom ~110px is reserved for the signature.
- **A per-session resolution cache fails in week one.** YouTube search is 100
  quota units of 10,000/day — ~100 searches per day across *all* users. The
  cache must be global and permanent.
- **Never re-render a list while someone is typing in it.** The reason inputs
  save on input but never call `renderTracks()`, or the caret is lost.
- **A node that re-renders itself during a click is detached before that click
  finishes bubbling**, so `container.contains(e.target)` calls it an *outside*
  click. This silently broke mood browse: the chip opened the results, then the
  document's click-outside handler closed them again. Guard with
  `if (!e.target.isConnected) return;`.
- **Anything that focuses must run last in its handler.** `addTrack` focuses the
  reason input; a caller that focuses something afterwards wins, and the caret
  lands in the wrong field.
- **Don't `scheduleThumbs()` on every keystroke** — that's five 1080² canvas
  renders competing with search.
- **Test with long strings.** A 34-char title and 90-char reasons. Short
  placeholder data hides every truncation and collision bug in this app.
- **On mobile the cassette faces must stay absolutely positioned** or the 3D
  flip breaks; give the tape an explicit height instead of an aspect ratio.

---

## Environment

This sandbox's egress proxy **403s most external hosts** — `youtube.com`,
`api.deezer.com`, `itunes.apple.com`, `instagram.com`, `api.song.link`.
`registry.npmjs.org` and `github.com` (git) do work.

Consequences: remote search, resolution and real playback **cannot be verified
here**. Everything else can, including the player's DOM, geometry and fallback.
Don't route around a 403 — report it.

---

## State of play

Shipped: create flow, five era covers, catalogue search + mood browse, reason
per track, share-by-link, recipient page, the A/B flip, motion language.

Written but never run against a live provider: `/api/search` and `/api/resolve`
(`functions/`). The sandbox 403s all four upstreams, so they are verified only
against injected fetch. **Nothing has played in this app yet** — until the edge
is deployed and `remoteResolve` is flipped, every track falls back to a link
that opens a YouTube Music search. `docs/DEPLOY.md` stages this.

Next, in order (`docs/GROWTH.md`): voice notes → the physical printed tape →
two-sided daily mode. A real backend — tapes in a datastore, `/t/:id`, OG
images — still hasn't earned its place; the two edge functions are a cache in
front of other people's APIs, not a home for anyone's data.

Open decision: `docs/PRD.md` §16 — whether the premise is validated enough to
build past phase 2. The stop-gate is a 25% share rate.
