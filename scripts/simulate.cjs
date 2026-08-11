/* Drive the app on an emulated phone and shoot every scene.

   Not a simulator in the native sense — there is no native app. This is
   Chromium with an iPhone's viewport, pixel ratio, touch flags and user
   agent, which for a static web app is the same rendering path a real
   phone takes. Anything it gets wrong (actual Safari quirks, real touch
   latency) needs a real device; see docs/DEPLOY.md stage 1.

   Run:  npm run simulate            # iPhone 13
         DEVICE="Pixel 5" npm run simulate
*/

const { chromium, devices } = require("playwright");
const path = require("path");
const fs = require("fs");

const BASE = process.env.BASE || "http://127.0.0.1:8321";
const DEVICE = process.env.DEVICE || "iPhone 13";
const OUT = path.join(__dirname, "..", ".shots", "sim");

// Long strings on purpose: short placeholder data hides every truncation
// and collision bug in this app.
const TITLE = "Songs I Never Sent You, Volume One";
const REASONS = [
  "this one's about that night in Bandra, the rain and the bad chai and you laughing",
  "you played this on repeat all August and i pretended not to notice",
  "for the drive back, when neither of us wanted to get there",
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices[DEVICE] });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  const shot = async (name) => {
    await page.waitForTimeout(450);            // let the motion settle
    const file = path.join(OUT, `${name}.png`);
    await page.screenshot({ path: file });
    console.log("  shot  " + path.relative(process.cwd(), file));
  };

  await page.goto(`${BASE}/index.html`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  console.log(`\n${DEVICE} — ${devices[DEVICE].viewport.width}x${devices[DEVICE].viewport.height}\n`);

  // scene 1 — the album
  await shot("1-album-empty");
  await page.fill("#in-title", TITLE);
  await page.fill("#in-to", "Aanya");
  await page.fill("#in-from", "Himanshu");
  await shot("2-album-filled");

  // scene 2 — songs, and the reason on each
  await page.click(".pill[data-goto='2']");
  await shot("3-songs-empty");

  await page.fill("#in-search", "fade into");
  await page.waitForTimeout(450);
  await shot("4-search-results");

  const picks = ["fade into", "harvest moon", "sea of love"];
  for (let i = 0; i < picks.length; i++) {
    await page.fill("#in-search", picks[i]);
    await page.waitForTimeout(450);
    await page.click("#results-list li >> nth=0");
    await page.waitForTimeout(150);
    await page.fill(".tracks .why >> nth=" + i, REASONS[i]);
  }
  await shot("5-songs-with-reasons");

  // mood browse — the one that was broken until this branch
  await page.fill("#in-search", "");
  await page.click(".mood-chip >> nth=0");
  await shot("6-mood-browse");
  await page.keyboard.press("Escape");

  // scene 3 — the cover and the share link
  await page.click(".pill[data-goto='3']");
  await shot("7-share-cover");

  // The recipient's side. The share button goes through the clipboard, which
  // a headless context can't read, so build the same URL the app builds —
  // TapeCodec.toUrl is exactly what the copy button calls.
  const tapeUrl = await page.evaluate(async () => {
    const state = JSON.parse(localStorage.getItem("mixtape-moodboard") || "null");
    return (window.TapeCodec && state) ? await window.TapeCodec.toUrl(state) : null;
  });
  if (tapeUrl) {
    await page.goto(tapeUrl, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await shot("8-tape-side-a");

    const flip = page.locator("#btn-flip");
    if (await flip.isVisible()) {
      await flip.click();
      await shot("9-tape-side-b");
    } else {
      console.log("  (flip hidden — a one-sided tape has no B side)");
    }
  } else {
    console.log("  (could not derive a tape URL — skipped the recipient page)");
  }

  console.log(errors.length ? `\n!! ${errors.length} console error(s):` : "\nno console errors");
  errors.forEach((e) => console.log("   " + e));

  await browser.close();
  process.exit(errors.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
