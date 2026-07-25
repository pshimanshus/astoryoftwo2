# Mixtape — a tape for your love ♥

Make someone a mixtape in three steps, then share an era-authentic
cassette cover as a picture.

1. **Create the album** — write the title and dedication directly on the
   cassette label, then pick an era from the polaroid fan.
2. **Add the songs** — keep a track sheet with a real C-90 time budget
   (each song burns ~3:30 of tape, 45:00 a side). Reorder, remove,
   flip to Side B.
3. **Share the picture** — a 1080×1080 cover is drawn on canvas in the
   design language of the era you picked. Download the PNG or send it
   through the native share sheet.

## Running it

No build step, no dependencies. Serve the folder statically and open
`index.html`:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

(Fonts are self-hosted in `fonts/`, so it works fully offline.)

## The five cover eras

| Theme | Reference | Language |
|---|---|---|
| **Studio '26** | editorial moodboard / scrapbook | grid paper, serif italic, blue felt-tip, sticker mats |
| **Shibuya '86** | Japanese city pop, Hiroshi Nagai, TDK hi-fi | sunset gradient, banded sun, palms, chrome type |
| **Bombay '92** | T-Series / HMV cassette boom | saffron–magenta–gold, ray bursts, ornate gold frames |
| **Detroit '68** | Motown / Tamla | cream, mustard + maroon, vinyl rings, geometric caps |
| **Camden '79** | UK punk / 2-Tone | checkerboard, photocopy grain, ransom-strip type |

## Planning docs

- [`docs/PRD.md`](docs/PRD.md) — product requirements: problem, hypothesis,
  personas, jobs, user journeys, requirements, edge cases, metrics, rollout
- [`docs/TECH-SPEC.md`](docs/TECH-SPEC.md) — architecture, data model, API
  surface, offline, performance and security
- [`docs/MUSIC.md`](docs/MUSIC.md) — how songs get found, previewed and played,
  and why the app never hosts audio
- [`docs/GROWTH.md`](docs/GROWTH.md) — the productised reframe: why the current
  shape is a greeting card, and the two-sided tape that fixes it

## How we build

`.claude/skills/build-loop/` — the maker/verifier workflow. Three gates (plan →
loop → ship) with five independent verifiers (design, function, rights,
a11y/perf, copy) and a hard 3-round limit before escalating to a human.

## Design system

The look — "The Moodboard" — is frozen as the project's brand aesthetic.
Before building or restyling any screen, component or cover, load the
skill at `.claude/skills/mixtape-brand/`. It defines the non-negotiables,
tokens, type scale, component recipes, copy voice, and the render →
critique → refine loop that every visual change goes through.

`brand.css` is the runtime half of that system: tokens, the grid-paper
ground, and shared primitives. Screens import it and add only their own
specifics.

## Files

- `index.html` — the app (screens + interactions)
- `brand.css` — brand tokens and shared primitives
- `themes.js` — the five era painters (backgrounds + cassette labels)
- `cover.js` — cover composition + the realistic cassette renderer
- `prototype.html` — earlier "Listening Room" design exploration
- `fonts/` — self-hosted woff2 fonts
- `DESIGN.md` — aesthetic rationale, references, and the iteration log
- `.claude/skills/mixtape-brand/` — the frozen brand aesthetic skill
