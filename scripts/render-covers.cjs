/* Export every cover theme at 1080² for the design verifier.
   Usage: npm run render:covers   (writes to .shots/) */
const path = require("path");
const fs = require("fs");
const SHOT = process.env.SHOT_DIR || path.join(__dirname, "..", ".shots");
fs.mkdirSync(SHOT, { recursive: true });
const { chromium } = require("playwright");

const QUERIES = ["fade into", "harvest", "sea of love", "yellow", "first day", "book of love"];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 1250 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("http://127.0.0.1:8321/index.html", { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  // long strings on purpose — short placeholder data hides every collision bug
  await page.fill("#in-title", "Songs I Never Sent You, Volume One");
  await page.fill("#in-to", "Aanya");
  await page.fill("#in-from", "Himanshu");
  await page.click(".pill[data-goto='2']");

  for (const q of QUERIES) {
    await page.fill("#in-search", "");
    await page.fill("#in-search", q);
    try {
      await page.waitForFunction(
        () => {
          const b = document.querySelector("#results");
          return b && !b.hidden && document.querySelectorAll("#results-list li").length > 0;
        },
        { timeout: 4000 }
      );
      await page.click("#results-list li >> nth=0");
    } catch (_) {
      console.log(`  (no catalogue result for "${q}")`);
    }
  }

  const whys = await page.locator(".tracks .why").count();
  for (let i = 0; i < whys; i++) {
    await page.fill(`.tracks .why >> nth=${i}`, `this one is about that night in Bandra (${i + 1})`);
  }

  await page.click(".pill[data-goto='3']");
  await page.fill("#in-note", "Play this when you miss me.");
  await page.waitForTimeout(400);

  const ids = await page.evaluate(() => window.THEMES.map((t) => t.id));
  for (let i = 0; i < ids.length; i++) {
    await page.click(".dock button[data-goto='1']");
    await page.locator(`.polaroid >> nth=${i}`).click();
    await page.click(".dock button[data-goto='3']");
    await page.waitForTimeout(250);
    const url = await page.evaluate(() =>
      document.querySelector("#cover-canvas").toDataURL("image/png"));
    fs.writeFileSync(path.join(SHOT, `cover-${ids[i]}.png`), Buffer.from(url.split(",")[1], "base64"));
    console.log(`  ✓ cover-${ids[i]}.png`);
  }

  console.log(errors.length ? `errors: ${errors.join(" | ")}` : "errors: none");
  process.exitCode = errors.length ? 1 : 0;
  await browser.close();
})();
