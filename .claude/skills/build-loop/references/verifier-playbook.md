# Verifier playbook

How each verifier actually runs. Keep harness scripts in the scratchpad, not the
repo — they are throwaway per slice.

## Shared harness

Chromium + Playwright are preinstalled (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`).
**Do not run `playwright install`.** ESM can't resolve the global install, so use
CJS with `NODE_PATH`:

```bash
(python3 -m http.server 8321 >/dev/null 2>&1 &) ; sleep 1
NODE_PATH=/opt/node22/lib/node_modules node harness.cjs
```

Every harness must:
- clear `localStorage`, then reload (stale state hides first-run bugs)
- `await page.evaluate(() => document.fonts.ready)` before any screenshot
- collect `pageerror` + `console.error` and assert the list is empty
- use **long, real content** — a 34-char title, long artist names, 8+ songs.
  Short placeholder data hides every truncation and collision bug in this app.

## design-verifier

1. Screenshot every changed screen at 900×1250 and 400×900.
2. Export every cover theme via `canvas.toDataURL()` to PNG.
3. Open the images. Critique against the checklist in
   `mixtape-brand/references/design-loop.md` — collisions, ±1.5° tilt budget,
   optical centering of letterspaced text, truncation, blue-ink discipline, one
   filled pill per screen.
4. Verify covers still read at 108px (the polaroid thumbnail size).

**Look at the pictures.** Reasoning about the CSS is how these bugs survive.

## function-verifier

Drive the acceptance criteria literally, in a browser, as a user:

- Every GIVEN/WHEN/THEN from Gate 1, as a real interaction
- The unhappy paths: offline, provider 429, empty search, duplicate song,
  12-song cap, back-navigation mid-flow, reload-and-resume
- Persistence: reload and confirm state survives
- Assert zero console errors

Report the actual observed values, not "works as expected".

## rights-verifier

See `rights-checklist.md`. Additionally capture a network log during a full
session and confirm: no audio bytes from our origin, previews come from provider
CDNs, and the exported PNG contains no third-party artwork.

## a11y-perf-verifier

- axe-core on each screen; zero serious/critical violations
- Full keyboard path: tab to every control, activate with Enter/Space, visible
  focus ring, no trap
- Contrast: `--muted` on `--bg` and on `--card` both ≥4.5:1 for body text
- `prefers-reduced-motion` actually stops the spinning reels
- Budget: first load ≤250KB JS+CSS excluding fonts; cover render ≤400ms

## copy-verifier

Every new user-visible string against the `mixtape-brand` copy voice: lowercase
and warm, no "Submit"/"Success!"/"Oops", no exclamation stacking, status lines
plain ("saved — now go give it to them"). Error copy must say what to do next,
not what went wrong internally.

## Escalation report

On the 3rd failed round, hand over exactly this:

```
ESCALATION — [slice name] — 3 failed rounds

What we tried:
  Round 1: [change] → failed [verifier]: [finding]
  Round 2: [change] → failed [verifier]: [finding]
  Round 3: [change] → failed [verifier]: [finding]

What I think is actually wrong: [hypothesis about the plan, not the code]

Decision needed from you: [one specific question]
```
