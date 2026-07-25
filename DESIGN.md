# Design notes

> **The Moodboard aesthetic is frozen as the project's brand.**
> It is codified as a skill at `.claude/skills/mixtape-brand/` and enforced
> in code by `brand.css`. Load the skill before building or restyling any
> screen, component, or cover. This document is the rationale and the
> iteration log; the skill is the spec.

## Aesthetic direction: "The Moodboard"

The app is an editorial scrapbook page — the aesthetic of curated
Instagram design accounts (studio.baseline-style collages, dopamine
decor grids, wall-art shops):

- **Grid paper** background, light and airy (`#ececec`, 88px cells)
- **Big editorial serif** headlines (Instrument Serif) with italic
  emphasis — *"Make them a mixtape"*
- Objects as **stickers**: white-bordered cards, tilted a few degrees,
  soft double shadows — the cassette, the polaroid era fan, the track
  sheet, the final print
- **Blue felt-tip handwriting** (Caveat, `#2b3fd4`) for everything
  personal: what you write on the tape, side stamps, captions, doodles
- **Hand-drawn oval badges** (the date stamp, the selection ring around
  the chosen era)
- **Black pill buttons** with letterspaced caps; thin hairlines; mono
  type for the track sheet
- A frosted, floating **dock** for step navigation (a nod to the macOS
  dock motif in the reference collages)

Interaction principles: write *on* the objects (title goes on the
cassette label, not in a form), physical metaphors carry meaning (the
C-90 time budget, Side A/Side B flip, reels that spin), and the final
artifact is a print you could tape to a door.

## The five cover eras (researched references)

- **Studio '26** — the moodboard itself as a cover: grid paper, serif
  name, blue marker title, white sticker mat.
- **Shibuya '86** — Japanese city pop: Hiroshi Nagai's pastel sunsets,
  banded retro sun, palm silhouettes; TDK/Maxell-era label with a
  gradient tech band and chrome italic title.
- **Bombay '92** — the Indian cassette boom (T-Series, HMV): deep
  indigo with ray bursts, double gold frames, bead rows, Yatra One
  display type in gold with maroon outlines.
- **Detroit '68** — Motown/Tamla: Bernie Yeszin's geometric caps,
  Tamla's mustard + maroon, concentric vinyl rings, starburst.
- **Camden '79** — UK punk & 2-Tone: checkerboard bands, photocopy
  grain, halftone dots, typewriter ransom strip, a slash of red.

## The design-loop workflow

Every visual change goes through this loop before it ships:

1. **Research** — gather the visual language (era, region, medium).
2. **Design** — implement against that language.
3. **Render** — headless Chromium drives the real app and exports
   every theme's 1080px cover + UI screenshots
   (`scratchpad/mood.cjs`).
4. **Critique** — review the renders against a checklist: hierarchy,
   proportion, contrast, era-authenticity, collisions/clipping,
   legibility at share size.
5. **Refine** — fix and re-render until the critique passes.

### Iteration log

1. **Apple-clean** — system font stack, segmented stepper, white cards.
   Correct but generic; the covers carried all the personality and the
   chrome carried none.
2. **The Listening Room** — walnut desk, brass plaque, amber LEDs, a
   record crate. Atmospheric, but the heavy dark furniture fought the
   artwork and read as skeuomorphic pastiche.
3. **The Moodboard** *(frozen)* — editorial scrapbook. Light grid paper
   lets the covers be the color in the room; the serif gives it a voice;
   blue felt-tip makes the user's contribution visibly *theirs*.

Per-pass fixes found only by rendering: cassette occluding its own label
text, the Camden checkerboard and Bombay bead row colliding with the
signature line, Courier tracklists truncating early, centered
letterspaced text drifting right (both CSS and canvas), fixed-height
tracklist panel leaving dead space, the "play me!" doodle overlapping the
eyebrow copy.

### Enforcement

The system is codified twice so it can't drift:

- `.claude/skills/mixtape-brand/` — the spec (principles, tokens, type
  scale, angle budget, component recipes, copy voice, design-loop
  checklist). Loaded before any UI work.
- `brand.css` — the runtime foundation: tokens, the grid ground, and the
  shared primitives (`.sticker`, `.pill`, `.backlink`, `.date-badge`,
  `.doodle`, `.dock`, `.footing`). Screens import it and add only what is
  specific to them.

## Cassette realism

True compact-cassette proportions (100 × 63.5 mm → 1.575:1), plastic
bevel highlights, label window with rimmed glass, hubs with drive
teeth, asymmetric tape spools (mid-song), taut tape run, transport
plate with capstan holes, five screws, gloss sweep. Same geometry is
drawn twice: in DOM/CSS for the interactive cassette you write on, and
on canvas for the shareable cover.
