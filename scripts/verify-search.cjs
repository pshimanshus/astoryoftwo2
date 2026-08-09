/* FUNCTION VERIFIER — phase 1 search slice.
   Drives the acceptance criteria as a user, including failure paths. */
const { chromium } = require("playwright");
const SHOT = process.env.SHOT_DIR || require("path").join(__dirname, "..", ".shots");

const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 1250 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  await page.goto("http://127.0.0.1:8321/index.html", { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.click(".dock button[data-goto='2']");

  const rows = () => page.locator(".tracks li.row").count();
  const opts = () => page.locator("#results-list li").count();

  // AC1 — typing a song shows results from the built-in catalogue, no network
  await page.fill("#in-search", "fade into");
  await page.waitForTimeout(400);
  const n1 = await opts();
  const first = await page.locator("#results-list li >> nth=0").innerText();
  check("AC1 catalogue search returns hits offline", n1 > 0 && /Fade Into You/i.test(first),
        `${n1} results, first="${first.replace(/\n/g, " ")}"`);

  // AC2 — clicking a result adds it
  await page.click("#results-list li >> nth=0");
  check("AC2 click adds the track", (await rows()) === 1, `${await rows()} row(s)`);
  check("AC2 input clears + results close", (await page.inputValue("#in-search")) === ""
        && (await page.locator("#results").isHidden()), "");

  // AC3 — artist-name search works ("mazzy" should find Mazzy Star)
  await page.fill("#in-search", "mazzy");
  await page.waitForTimeout(400);
  check("AC3 artist search works", (await opts()) > 0, `${await opts()} results`);

  // AC4 — multi-word out-of-order search ("mitchell case")
  await page.fill("#in-search", "mitchell case");
  await page.waitForTimeout(400);
  const mw = await page.locator("#results-list li >> nth=0").innerText().catch(() => "");
  check("AC4 out-of-order multiword", /A Case of You/i.test(mw), `first="${mw.replace(/\n/g, " ")}"`);

  // AC5 — keyboard: ArrowDown + Enter adds
  const before = await rows();
  await page.fill("#in-search", "harvest");
  await page.waitForTimeout(400);
  await page.keyboard.press("ArrowDown");
  const aria = await page.getAttribute("#in-search", "aria-activedescendant");
  await page.keyboard.press("Enter");
  check("AC5 keyboard add (ArrowDown+Enter)", (await rows()) === before + 1,
        `aria-activedescendant=${aria}`);

  // AC6 — Escape closes
  await page.fill("#in-search", "love");
  await page.waitForTimeout(400);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  check("AC6 escape closes results", await page.locator("#results").isHidden(), "");

  // AC7 — mood chip browse
  await page.click(".mood-chip >> nth=0");
  await page.waitForTimeout(200);
  const moodN = await opts();
  const moodNote = await page.locator("#results-note").innerText();
  check("AC7 mood browse returns songs", moodN > 0, `${moodN} results, note="${moodNote}"`);
  const pressed = await page.getAttribute(".mood-chip >> nth=0", "aria-pressed");
  check("AC7 chip reflects pressed state", pressed === "true", `aria-pressed=${pressed}`);

  // AC8 — zero results offers manual, and manual entry works
  await page.fill("#in-search", "zzzqqxnotarealsong");
  await page.waitForTimeout(400);
  const zeroNote = await page.locator("#results-note").innerText();
  check("AC8 zero-results gives a way forward", /add it by hand/i.test(zeroNote),
        `note="${zeroNote}"`);

  await page.click("#btn-manual");
  const prefilled = await page.inputValue("#in-song");
  check("AC8 manual form prefills the query", prefilled === "zzzqqxnotarealsong", `"${prefilled}"`);
  await page.fill("#in-song", "Our Song (unreleased)");
  await page.fill("#in-artist", "Him & Her");
  await page.click("#song-form button[type=submit]");
  const manualRow = await page.locator(".tracks li.row").last().innerText();
  check("AC8 manual track is added", /Our Song \(unreleased\)/.test(manualRow),
        manualRow.replace(/\n/g, " "));

  // AC9 — manual row is visually indistinguishable from a matched one
  const rowClasses = await page.locator(".tracks li.row").last().getAttribute("class");
  check("AC9 manual row not visually second-class", rowClasses.trim() === "row", `class="${rowClasses}"`);

  // AC10 — duration budget uses the 3:30 fallback and stays sane
  const budget = await page.locator("#tape-budget").innerText();
  check("AC10 tape budget renders", /SIDE A \d\d:\d\d/.test(budget), budget.replace(/\n/g, " | "));

  // AC11 — 12-song cap: fill to cap and confirm friendly stop
  await page.click("#btn-manual-cancel");
  let guard = 0;
  while ((await rows()) < 12 && guard++ < 20) {
    await page.click("#btn-manual");
    await page.fill("#in-song", `Filler ${guard}`);
    await page.fill("#in-artist", "Someone");
    await page.click("#song-form button[type=submit]");
    await page.click("#btn-manual-cancel");
  }
  const capped = await rows();
  await page.fill("#in-search", "yellow");
  await page.waitForTimeout(400);
  const capNote = await page.locator("#results-note").innerText();
  check("AC11 cap at 12 with a friendly stop", capped === 12 && /volume two/i.test(capNote),
        `${capped} rows, note="${capNote}"`);

  // AC12 — persistence across reload
  await page.reload({ waitUntil: "networkidle" });
  await page.click(".dock button[data-goto='2']");
  check("AC12 tracks survive reload", (await rows()) === 12, `${await rows()} rows`);

  // AC13 — remote search flag is OFF and makes no network calls
  const reqs = [];
  page.on("request", (r) => { if (!r.url().startsWith("http://127.0.0.1:8321")) reqs.push(r.url()); });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.click(".dock button[data-goto='2']");
  await page.fill("#in-search", "yellow");
  await page.waitForTimeout(500);
  const flag = await page.evaluate(() => window.MIXTAPE_FLAGS.remoteSearch);
  check("AC13 remote flag off, zero external requests", flag === false && reqs.length === 0,
        `flag=${flag}, external=${JSON.stringify(reqs)}`);

  // AC14 — remote failure degrades to catalogue, never blocks
  const degraded = await page.evaluate(async () => {
    window.MIXTAPE_FLAGS.remoteSearch = true;
    window.MIXTAPE_FLAGS.remoteBase = "http://127.0.0.1:8399/nope"; // nothing listening
    const r = await window.Search.search("fade into", { limit: 8 });
    window.MIXTAPE_FLAGS.remoteSearch = false;
    return { n: r.tracks.length, status: r.status, source: r.source };
  });
  check("AC14 remote failure still returns catalogue hits",
        degraded.n > 0 && degraded.source === "catalog",
        JSON.stringify(degraded));

  // AC15 — provider normalisation matches real response shapes
  const norm = await page.evaluate(() => {
    const dz = window.__fromDeezer({
      id: 3135556, title: "Harder Better Faster Stronger", title_short: "Harder Better Faster Stronger",
      duration: 224, preview: "https://cdns-preview.dzcdn.net/x.mp3",
      artist: { name: "Daft Punk" },
      album: { title: "Discovery", cover_medium: "https://e-cdns-images.dzcdn.net/x.jpg" },
    });
    const it = window.__fromItunes({
      trackId: 1440857781, trackName: "Fade Into You", artistName: "Mazzy Star",
      collectionName: "So Tonight That I Might See", releaseDate: "1993-10-05T07:00:00Z",
      trackTimeMillis: 294000, artworkUrl100: "https://is1.mzstatic.com/x.jpg",
      previewUrl: "https://audio-ssl.itunes.apple.com/x.m4a",
    });
    return { dz, it };
  });
  check("AC15 Deezer normalisation",
        norm.dz.provider === "deezer" && norm.dz.artist === "Daft Punk" && norm.dz.durationMs === 224000,
        JSON.stringify(norm.dz));
  check("AC15 iTunes normalisation",
        norm.it.provider === "itunes" && norm.it.year === 1993 && norm.it.durationMs === 294000,
        JSON.stringify(norm.it));

  await page.screenshot({ path: SHOT + "/search-final.png" });

  // AC14 deliberately points at a dead port; that refusal is the test working.
  const unexpected = errors.filter((e) => !/ERR_CONNECTION_REFUSED/.test(e));
  check("no unexpected console errors", unexpected.length === 0,
        unexpected.join(" | ") || `clean (${errors.length} expected refusal(s) from AC14)`);

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exitCode = failed.length ? 1 : 0;
  await browser.close();
})();
