# Component recipes

Copy these. They are the whole vocabulary — build new screens by composing
them, not by inventing new shapes.

## Sticker (the universal container)

Everything the user reads or manipulates sits on one.

```html
<div class="sticker sticker--sheet">…</div>
```

```css
.sticker {
  background: var(--card);
  padding: 22px;
  box-shadow: var(--shadow-sticker);
  border-radius: var(--radius-sticker);
}
/* per-instance tilt — one angle, within ±1.5° */
.sticker--sheet { transform: rotate(0.7deg); width: min(620px, 94vw); padding: 26px 30px 28px; }
.sticker--tape  { transform: rotate(-1.1deg); width: min(620px, 94vw); }
```

Alternate the sign of the tilt between stacked stickers so the page reads as
a pile, not a lean.

## Pill button

```css
.pill {
  appearance: none;
  font-family: var(--sans);
  font-size: 12px; font-weight: 700;
  letter-spacing: 0.22em; text-indent: 0.22em; text-transform: uppercase;
  border-radius: 999px; padding: 12px 26px; cursor: pointer;
  border: 1.6px solid var(--ink);
  background: var(--ink); color: #fff;
  transition: transform 0.1s ease, background 0.15s ease, color 0.15s ease;
}
.pill:hover  { background: #000; }
.pill:active { transform: scale(0.97); }
.pill--ghost { background: transparent; color: var(--ink); }
.pill--ghost:hover { background: rgba(0, 0, 0, 0.06); }
.pill--small { padding: 9px 18px; }
```

One filled pill per screen. Secondary actions take `--ghost`; tertiary
actions are back links, not buttons.

## Back link

```css
.backlink {
  appearance: none; border: none; background: none; cursor: pointer;
  font-family: var(--serif); font-style: italic; font-size: 17px;
  color: var(--muted); text-decoration: underline; text-underline-offset: 3px;
}
.backlink:hover { color: var(--ink); }
```

## Dock

```css
.dock {
  position: fixed; bottom: 22px; left: 50%; transform: translateX(-50%);
  display: flex; gap: 6px; padding: 9px; z-index: 10;
  border-radius: var(--radius-dock);
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  box-shadow: var(--shadow-dock);
}
.dock button {
  appearance: none; border: none; background: transparent; cursor: pointer;
  font-family: var(--sans); display: flex; align-items: center; gap: 9px;
  padding: 11px 20px; border-radius: 15px;
  font-size: 12px; font-weight: 700; letter-spacing: 0.18em; text-indent: 0.1em;
  text-transform: uppercase; color: var(--muted);
  transition: background 0.15s ease, color 0.15s ease, transform 0.1s ease;
}
.dock button:hover     { transform: translateY(-2px); color: var(--ink); }
.dock button.is-active { background: var(--ink); color: #fff; }
.dock button svg       { width: 19px; height: 19px; flex: none; }
.dock button .step-no  { font-size: 10px; opacity: 0.55; }
```

Icons are 24-viewBox line drawings, `stroke-width: 1.8`, `fill: none`. Give
`body` bottom padding (~140px) so content clears the dock. Below 560px hide
the `.lbl` text and keep icon + number.

## Hand-drawn oval badge

```css
.date-badge {
  display: inline-block; font-family: var(--serif); font-size: 17px;
  padding: 5px 18px; border: 1.8px solid var(--ink); border-radius: 50%;
  transform: rotate(-2deg); background: var(--bg);
}
```

## Selection ring (scribbled circle)

How a *physical* object shows it's chosen. Inline SVG, absolutely positioned
over the item, revealed by opacity.

```html
<svg class="ring" viewBox="0 0 140 160">
  <ellipse cx="70" cy="78" rx="64" ry="72" />
</svg>
```

```css
.polaroid .ring { position: absolute; inset: -12px -14px -10px; pointer-events: none;
                  opacity: 0; transition: opacity 0.15s ease; }
.polaroid.is-selected .ring { opacity: 1; }
.polaroid .ring ellipse {
  fill: none; stroke: var(--blue); stroke-width: 3;
  stroke-linecap: round; stroke-dasharray: 430 60;  /* the gap = hand-drawn */
}
```

## Polaroid fan

```css
.polaroid {
  appearance: none; border: none; cursor: pointer; position: relative;
  background: var(--card); padding: 7px 7px 6px; box-shadow: var(--shadow-sticker);
  transform: rotate(var(--lean, 0deg)) translateY(var(--drop, 0px));
  transition: transform 0.2s var(--ease-pickup), box-shadow 0.2s ease;
}
.polaroid:nth-child(1) { --lean: -5deg;   --drop: 10px; }
.polaroid:nth-child(2) { --lean: 2.5deg;  --drop: 0px;  }
.polaroid:nth-child(3) { --lean: -2deg;   --drop: 14px; }
.polaroid:nth-child(4) { --lean: 4deg;    --drop: 2px;  }
.polaroid:nth-child(5) { --lean: -3.5deg; --drop: 8px;  }
.polaroid:hover        { transform: rotate(var(--lean)) translateY(calc(var(--drop) - 8px)); }
.polaroid.is-selected  { transform: rotate(0deg) translateY(-10px) scale(1.06); z-index: 2; }
.polaroid canvas       { display: block; width: 108px; height: 108px; background: #ddd; }
.polaroid figcaption   { font-family: var(--hand); font-weight: 700; font-size: 15.5px;
                         color: var(--ink); text-align: center; padding-top: 4px; }
```

## Inputs — write on the object

Never a filled box. Two forms only:

```css
/* on an object (cassette label): dotted, handwritten, blue */
.label input {
  font-family: var(--hand); font-weight: 700;
  background: transparent; border: none;
  border-bottom: 2px dotted rgba(0, 0, 0, 0.28);
  color: var(--blue); outline: none; text-align: center;
}
.label input:focus { border-bottom-color: var(--blue); }

/* in a data sheet: single rule, mono */
.songline input {
  font-family: var(--mono); font-size: 15px; color: var(--ink);
  background: transparent; border: none; border-radius: 0;
  border-bottom: 1.6px solid rgba(0, 0, 0, 0.5);
  padding: 7px 4px 6px; outline: none;
}
.songline input:focus { border-bottom-color: var(--blue); }
```

## Doodles

```css
.doodle { position: absolute; font-family: var(--hand); font-weight: 700;
          color: var(--blue); pointer-events: none; user-select: none; }
.doodle--heart { font-size: 30px; right: -34px; top: 4px;   transform: rotate(12deg); }
.doodle--note  { font-size: 21px; left: -74px;  top: 46%;   transform: rotate(-8deg); }
```

Two per page, outside the text column, and verified in a screenshot — the
"play me!" doodle collided with the eyebrow copy on the first pass and it was
only visible in a render.

## Empty state

Serif italic, `--muted`, lowercase, with an ellipsis. Never an illustration,
never a bordered dashed box.

```css
.tracks-empty { font-family: var(--serif); font-style: italic;
                font-size: 18px; color: var(--muted); padding: 22px 0 10px; }
```
