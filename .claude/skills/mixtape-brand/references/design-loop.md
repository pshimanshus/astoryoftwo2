# The design loop

This aesthetic depends on physical details — tilt, collision, tracking drift,
truncation — that are invisible in source and obvious in a render. So no UI
change is finished until it has been rendered and reviewed.

## The cycle

1. **Research** — if it's a new visual language (a cover era), gather the real
   reference first: era, place, label, designer, palette, typography. Write it
   into `DESIGN.md`. No generic "retro".
2. **Design** — implement using the tokens and component recipes.
3. **Render** — drive the real app headlessly and export every scene plus
   every theme's 1080px cover.
4. **Critique** — review the images against the checklist below. Look at the
   pictures; do not reason about the CSS.
5. **Refine** — fix, then re-render. Repeat until the checklist passes.

## Running it

Chromium and Playwright are preinstalled (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`).
Do not run `playwright install`. ESM can't see the global install, so use CJS
with `NODE_PATH`:

```bash
python3 -m http.server 8321 &          # serve the repo
NODE_PATH=/opt/node22/lib/node_modules node loop.cjs
```

The script should: clear `localStorage`, `await document.fonts.ready`, fill in
realistic content (a long title, a long artist name, 6+ songs), screenshot each
scene, then loop the themes exporting `canvas.toDataURL()` to PNG. Assert that
the collected `pageerror` / `console.error` list is empty. Keep it in the
scratchpad, not the repo.

Always test with **long** strings. Short placeholder content hides every
truncation and collision bug in the system.

## Checklist

**Layout & physics**
- [ ] Nothing overlaps: doodles vs. text, background ornament vs. cassette,
      cover footer vs. border ornament, dock vs. page content
- [ ] Sticker tilts within ±1.5°, alternating direction down the page
- [ ] Nothing clipped at a card edge or canvas edge
- [ ] Bottom ~110px of a cover stays clear for note + signature

**Type**
- [ ] Centered letterspaced text is optically centered (compensate for the
      trailing tracking — half the value, both in CSS `text-indent` and in
      canvas `x`)
- [ ] Long titles and artists ellipsize instead of overflowing
- [ ] Serif is 400 weight, never bold, with exactly one italic emphasis
- [ ] Only the four brand faces appear in UI chrome

**Color & hierarchy**
- [ ] Blue appears only where a human "wrote" something
- [ ] One filled pill per screen
- [ ] Muted vs. ink contrast reads at a glance; no mid-gray on mid-gray
- [ ] No hex outside the token palette

**Craft**
- [ ] Zero console errors during the run
- [ ] `prefers-reduced-motion` honored by looping animation
- [ ] Reads correctly at ~400px wide (dock collapses to icons, grids to one column)
- [ ] Covers still read when scaled to a 108px polaroid thumbnail

## Log every pass

Append what each iteration changed to `DESIGN.md`. The history is how the
system stays honest about which decisions were deliberate.
