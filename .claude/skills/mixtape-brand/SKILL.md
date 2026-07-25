---
name: mixtape-brand
description: The frozen brand aesthetic for this project — "The Moodboard" editorial-scrapbook design system (grid paper, Instrument Serif headlines, sticker cards, blue felt-tip handwriting, black pill CTAs, floating dock). Load this BEFORE writing or changing any UI, screen, component, page, style, or shareable canvas artwork in this repo, and before adding a new cover theme. Triggers: any request to build/redesign/restyle a screen or view, add a feature with visible UI, adjust layout/color/type/spacing, create an image or cover, or "make it look better".
---

# The Moodboard — brand aesthetic

The frozen visual system for this project. **Every screen, component and
generated image follows it.** Do not invent a second design language; if
something isn't covered here, derive it from the principles below rather
than importing a generic UI kit look.

The feeling to hit: *a page torn out of a designer's scrapbook.* Cool grid
paper, a big editorial serif voice, physical objects taped down at a slight
angle, and a blue felt-tip pen that only the human touches.

## Non-negotiables

Break any of these and it stops looking like this brand:

1. **Grid paper is the ground.** Light `#ececec` with an 88px ruled grid.
   Never a flat white page, never a dark app chrome, never a gradient hero.
2. **The serif carries the voice.** Instrument Serif, weight 400 only, with
   *italic for the emotional half of a phrase* ("Make them ***a mixtape***").
   Never bold it, never letterspace it, never use it for body copy.
3. **Content lives on stickers.** White cards with real padding, a soft
   double shadow, and a small rotation. Content never floats naked on the
   grid and never sits in a flat bordered box.
4. **Blue felt-tip is the human hand.** `#2b3fd4` Caveat is reserved for what
   the *person* contributes or the page says *to* them. Never use it for UI
   labels, system state, or generic decoration.
5. **You write on the object, not into a form.** The title goes on the
   cassette label; the note goes after a handwritten "p.s.". Inputs are
   dotted or single-rule underlines inside the object — never filled boxes
   with visible borders and corner radii.
6. **Navigation floats.** A frosted pill dock fixed to the bottom. Never a
   top tab bar, sidebar, breadcrumb, or stepper rail.

## Tokens

Copy `references/tokens.css` verbatim, or import the repo's `brand.css`
which is generated from it. Never hardcode a hex that isn't in the palette.

| Token | Value | Use |
|---|---|---|
| `--bg` | `#ececec` | the page, always |
| `--grid` | `rgba(0,0,0,0.06)` | 88px ruled lines, 1.2px |
| `--ink` | `#141414` | headlines, primary text, pill fills |
| `--muted` | `#7c7c7c` | eyebrows, secondary text, inactive dock |
| `--blue` | `#2b3fd4` | handwriting only |
| `--card` | `#ffffff` | sticker surfaces |
| `--hairline` | `rgba(0,0,0,0.16)` | card edges, rules |
| `--shadow-sticker` | `0 14px 34px rgba(0,0,0,.16), 0 3px 8px rgba(0,0,0,.08)` | every sticker |

Four typefaces, four jobs — no fifth:

| Token | Family | Job |
|---|---|---|
| `--serif` | Instrument Serif | headlines, kickers, empty states, back links |
| `--sans` | Jost 700 | eyebrows, buttons, dock, micro-labels — always caps + letterspaced |
| `--mono` | Courier Prime | tracklists, times, data, form inputs |
| `--hand` | Caveat 700 | the person's own words, in blue |

Fonts are **self-hosted in `fonts/`**. Never add a `<link>` to Google Fonts
or any external host — the app must work offline.

## Type scale

- Page headline — `--serif` 400, `clamp(46px, 9.5vw, 78px)`, line-height `0.98`
- Section kicker — `--serif` *italic* 24px, centered, sentence case with an em dash
  ("Step one — write on the tape.")
- Card title — `--serif` 400, 34px, with one italic word
- Eyebrow / dock / button — `--sans` 700, 11–12px, `letter-spacing: .18–.32em`,
  uppercase, and **always pair with `text-indent`** equal to the tracking so
  centered text doesn't drift right
- Body / data — `--mono` 15px
- Handwriting — `--hand` 700, 15–23px depending on role

## Motion & angle budget

Tilt is seasoning. Too much and it reads as a novelty template.

- Stickers: **±1.5° maximum**. One rotation per card, never animated.
- Polaroid fans are the exception: `-5°…+4°` with staggered vertical drops,
  because a scattered pile is the point. Selected item straightens to `0°`
  and lifts.
- Hover: lift 2–8px, never scale above `1.06`.
- Transitions: `0.15–0.2s`, `cubic-bezier(.34, 1.45, .64, 1)` for anything
  that should feel picked up.
- Respect `prefers-reduced-motion` for any looping animation (spinning reels).

## Components

Full markup and CSS in `references/components.md`. The vocabulary:

- **Sticker** — the universal container. White, padded, shadowed, tilted.
- **Pill button** — black fill, white caps, `999px` radius. `--ghost` variant
  is transparent with a `1.6px` ink border. One primary pill per screen.
- **Back link** — serif italic, underlined, `--muted`. Never a pill, never an arrow button.
- **Dock** — fixed bottom, `rgba(255,255,255,.82)` + `blur(14px)`, 15px radius
  items, active item is solid `--ink`. Line icons at `1.8` stroke, plus a
  two-digit step number at 55% opacity.
- **Date badge** — hand-drawn oval: `border: 1.8px solid var(--ink)`,
  `border-radius: 50%`, serif, rotated `-2°`.
- **Selection ring** — an inline SVG ellipse in `--blue`, `stroke-width: 3`,
  `stroke-dasharray: 430 60` so it reads as a scribbled circle. This is how
  "selected" is expressed for physical objects.
- **Doodle** — absolutely positioned Caveat glyphs in blue ("♥", "play me!").
  **Two per page maximum**, and they must never overlap real text — check the
  render, not the code.

## Canvas covers (shareable images)

Cover art is 1080×1080 and rendered through `cover.js` + a theme painter in
`themes.js`. When adding a theme:

- Implement `background(ctx, W, H, U)` and `label(ctx, r, state, U)`, then
  register palette + fonts in the `THEMES` array. Use `U.rr`, `U.fit` and
  `U.sideBadge` rather than re-rolling them.
- The cassette geometry is **fixed** — `drawCassette` is called at a constant
  rect. Backgrounds must stay clear of it and of the tracklist panel below.
- Reserve the bottom ~110px for the note + signature. No border ornament,
  checkerboard, or stripe may run through that band.
- Canvas `letterSpacing` adds trailing space, which pushes centered text
  right. Offset by half the tracking when `textAlign = "center"`.
- Always `U.fit(...)` any user string. Nothing may overflow its column.
- Every theme is a *researched* design language — name the era, place and
  reference in `DESIGN.md`. No generic "retro" filler.

## Writing UI copy

The interface talks like a person leaving a note, not like software.

- Lowercase, warm, occasionally imperative: "now pick the era ↓",
  "flip it! side B —", "…nothing on the reel yet."
- Steps are narrated in the kicker, not numbered in a heading.
- Status is lowercase and unglamorous: "saved — now go give it to them".
- Never "Submit", "Success!", "Oops", or exclamation-stacked marketing voice.

## Before you call a screen done

Run the design loop in `references/design-loop.md`. It is not optional —
this system depends on physical details (collisions, tilt, tracking drift)
that only show up in a render. Screenshot every scene and every theme, review
against the checklist there, fix, re-render.
