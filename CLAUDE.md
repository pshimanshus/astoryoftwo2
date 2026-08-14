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
scripts/      the verifier harnesses
```

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
npm run verify         # function + rights + a11y + perf  (currently 40 checks)
npm run verify:build   # 28 function/rights checks
npm run verify:a11y    # 12 a11y/perf checks
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

**This is a working prototype of two screens, not yet an application.**

Built: create flow, five era covers, catalogue search (170 songs) + mood browse,
reason per track, share-by-URL-fragment, recipient page, the A/B flip, motion
language. All verified — `npm run verify` is 40 checks green.

**Not built, and the reason it isn't an app yet:**

- **Playback.** No track resolves to a video id, so nothing plays. This is
  slice 1 and everything else is secondary to it.
- No backend — no short links, no real OG preview image, no persistence
  beyond `localStorage`
- No live search beyond the built-in catalogue
- No accounts, no library, no voice notes

**Read `docs/BUILD-PLAN.md` before starting work.** It sequences the remaining
slices with acceptance criteria. `docs/PRD.md` is the full product scope,
`docs/TECH-SPEC.md` the contracts, `docs/JOURNEY.md` every flow end to end.

Design principle that governs the sequencing: **anonymous-first.** No slice may
put an account in front of creating, sending or playing a tape.
