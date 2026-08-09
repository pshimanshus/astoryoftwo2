/* ============================================================
   MIXTAPE — motion
   Four primitives, one set of physics. Screens call these and
   never hand-tune an easing, the same way they never hand-pick a
   hex outside the palette.

   The rule everything derives from:

     paper is light and settles fast
     the cassette is heavy and turns slowly
     ink is laid down, never faded in

   Built on Motion's `animate()` (mini build, WAAPI, hardware
   accelerated, ~5kb gzipped, no framework). Vendored at
   vendor/motion.min.js so the app still works offline.

   prefers-reduced-motion is handled ONCE, here: every primitive
   jumps to its final state instead of animating. Screens must not
   re-implement that check.
   ============================================================ */

const reduced =
  typeof matchMedia === "function" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

let animate = null;

/* Motion is a progressive enhancement — if the bundle is missing the
   app must still be completely usable, just static. */
async function load() {
  if (animate || reduced) return animate;
  try {
    const mod = await import("./vendor/motion.min.js");
    animate = mod.animate;
  } catch (_) {
    animate = null;
  }
  return animate;
}

/** Run an animation, or apply the end state instantly. Never throws. */
async function run(el, keyframes, options) {
  if (!el) return;
  const fn = await load();
  if (!fn) {
    // reduced motion, or Motion unavailable: land on the final frame
    const final = {};
    for (const [k, v] of Object.entries(keyframes)) {
      final[k] = Array.isArray(v) ? v[v.length - 1] : v;
    }
    Object.assign(el.style, final);
    return;
  }
  try {
    return fn(el, keyframes, options);
  } catch (_) { /* an animation is never worth an exception */ }
}

const ms = (name, fallback) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const n = parseFloat(v);
  return Number.isFinite(n) ? n / 1000 : fallback;
};

/* ---------- the primitives ---------- */

/**
 * settle — paper coming to rest on a desk.
 * Preserves each sticker's own tilt, because the brand's rotation
 * budget is per-element and motion must not flatten it.
 */
export async function settle(el, { delay = 0, from = 10 } = {}) {
  if (!el) return;
  const tilt = getComputedStyle(el).transform;
  const keep = tilt && tilt !== "none" ? tilt : "";
  await run(
    el,
    { opacity: [0, 1], transform: [`translateY(${from}px) ${keep}`, `translateY(0px) ${keep}`] },
    { duration: ms("--dur-settle", 0.28), delay, easing: [0.22, 1, 0.36, 1] }
  );
}

/** settleAll — a stack of stickers landing one after another. */
export async function settleAll(els, { stagger = 0.06 } = {}) {
  const list = Array.from(els || []);
  await Promise.all(list.map((el, i) => settle(el, { delay: i * stagger })));
}

/** writeIn — a row arriving as if written onto the sheet, left to right. */
export async function writeIn(el) {
  if (!el) return;
  await run(
    el,
    { opacity: [0, 1], transform: ["translateX(-8px)", "translateX(0px)"] },
    { duration: ms("--dur-quick", 0.18), easing: [0.4, 0, 0.2, 1] }
  );
}

/** drawOn — ink being laid down along a path (the scribble selection ring). */
export async function drawOn(pathEl, { duration } = {}) {
  if (!pathEl || typeof pathEl.getTotalLength !== "function") return;
  let len = 0;
  try { len = pathEl.getTotalLength(); } catch (_) { return; }
  if (!len) return;
  const prevArray = pathEl.style.strokeDasharray;
  pathEl.style.strokeDasharray = `${len}`;
  await run(
    pathEl,
    { strokeDashoffset: [len, 0] },
    { duration: duration || ms("--dur-settle", 0.32), easing: [0.4, 0, 0.2, 1] }
  );
  // hand the dash pattern back so the ring reads as hand-drawn again
  pathEl.style.strokeDasharray = prevArray || "";
  pathEl.style.strokeDashoffset = "0";
}

/**
 * flip — turning a cassette over. Slower than any UI transition,
 * because the thing being moved is a lump of plastic with mass.
 */
export async function flip(el, toBack) {
  if (!el) return;
  await run(
    el,
    { transform: toBack ? ["rotateY(0deg)", "rotateY(180deg)"] : ["rotateY(180deg)", "rotateY(0deg)"] },
    { duration: ms("--dur-flip", 0.62), easing: [0.32, 0.72, 0.24, 1.02] }
  );
}

/** crossFade — swap one panel's contents for another mid-flip. */
export async function crossFade(el, swap) {
  if (!el) return swap && swap();
  await run(el, { opacity: [1, 0] }, { duration: ms("--dur-quick", 0.15), easing: [0.4, 0, 1, 1] });
  if (swap) swap();
  await run(el, { opacity: [0, 1] }, { duration: ms("--dur-quick", 0.18), easing: [0, 0, 0.2, 1] });
}

/** stepChange — the outgoing scene lifts away, the incoming one settles. */
export async function stepChange(outEl, inEl) {
  if (outEl) {
    await run(
      outEl,
      { opacity: [1, 0], transform: ["translateY(0px)", "translateY(-6px)"] },
      { duration: ms("--dur-step", 0.18), easing: [0.4, 0, 1, 1] }
    );
    outEl.style.opacity = "";
    outEl.style.transform = "";
  }
  if (inEl) await settle(inEl, { from: 8 });
}

export const prefersReducedMotion = reduced;
