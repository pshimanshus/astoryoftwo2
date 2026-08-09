/* A11Y + PERF VERIFIER */
require("fs").mkdirSync(process.env.SHOT_DIR || require("path").join(__dirname, "..", ".shots"), { recursive: true });
const { chromium } = require("playwright");
const { statSync } = require("fs");
const SHOT = process.env.SHOT_DIR || require("path").join(__dirname, "..", ".shots");
const REPO = "/home/user/astoryoftwo2";

const results = [];
const check = (n, p, d) => { results.push({ n, p }); console.log(`${p ? "PASS" : "FAIL"}  ${n}${d ? "  — " + d : ""}`); };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 1250 } });
  await page.goto("http://127.0.0.1:8321/index.html", { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });

  // build a small tape
  await page.fill("#in-title", "Test");
  await page.click(".pill[data-goto='2']");
  await page.fill("#in-search", "fade into");
  await page.waitForFunction(() => document.querySelectorAll("#results-list li").length > 0, { timeout: 5000 });
  await page.click("#results-list li >> nth=0");

  // --- labels on every interactive control ---
  const unlabelled = await page.evaluate(() => {
    const bad = [];
    document.querySelectorAll("input, button, a[href]").forEach((el) => {
      if (el.offsetParent === null) return;                       // hidden
      const t = (el.textContent || "").trim();
      const has = el.getAttribute("aria-label") || el.getAttribute("title")
        || el.getAttribute("placeholder") || t
        || (el.labels && el.labels.length);
      if (!has) bad.push(el.tagName + "#" + (el.id || "") + "." + (el.className || ""));
    });
    return bad;
  });
  check("every visible control is labelled", unlabelled.length === 0, unlabelled.join(", ") || "none");

  // --- the reason input specifically ---
  const whyLabel = await page.getAttribute(".tracks .why", "aria-label");
  check("reason input has an accessible name", !!whyLabel && /why you chose/i.test(whyLabel), whyLabel);

  // --- keyboard: reach and operate the reason without a mouse ---
  const kb = await page.evaluate(() => {
    const why = document.querySelector(".tracks .why");
    why.focus();
    return document.activeElement === why;
  });
  await page.keyboard.type("typed with the keyboard");
  const typed = await page.inputValue(".tracks .why");
  check("reason is keyboard operable", kb && typed === "typed with the keyboard", `"${typed}"`);

  // --- visible focus ring somewhere on the focused control ---
  const focusVisible = await page.evaluate(() => {
    const el = document.querySelector(".tracks .why");
    el.focus();
    const cs = getComputedStyle(el);
    return { outline: cs.outlineStyle, border: cs.borderBottomColor };
  });
  check("focused reason is visually distinct",
        focusVisible.border.includes("43, 63, 212") || focusVisible.outline !== "none",
        JSON.stringify(focusVisible));

  // --- contrast: muted text on both surfaces ---
  const contrast = await page.evaluate(() => {
    const lum = (rgb) => {
      const [r, g, b] = rgb.match(/\d+/g).map(Number).map((v) => {
        v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a, b) => {
      const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
      return (x + 0.05) / (y + 0.05);
    };
    const s = getComputedStyle(document.documentElement);
    const muted = s.getPropertyValue("--muted").trim();
    const blue = s.getPropertyValue("--blue").trim();
    const toRgb = (hex) => {
      const h = hex.replace("#", "");
      return `rgb(${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)})`;
    };
    return {
      mutedOnCard: ratio(toRgb(muted), "rgb(255,255,255)"),
      mutedOnGround: ratio(toRgb(muted), "rgb(236,236,236)"),  // the grid paper
      blueOnCard: ratio(toRgb(blue), "rgb(255,255,255)"),
    };
  });
  check("muted text contrast >= 4.5:1 on card", contrast.mutedOnCard >= 4.5,
        contrast.mutedOnCard.toFixed(2) + ":1");
  check("muted text contrast >= 4.5:1 on the grid ground", contrast.mutedOnGround >= 4.5,
        contrast.mutedOnGround.toFixed(2) + ":1");
  check("blue handwriting contrast >= 4.5:1 on card", contrast.blueOnCard >= 4.5,
        contrast.blueOnCard.toFixed(2) + ":1");

  // --- reduced motion actually stops the reels ---
  const rm = await browser.newContext({ reducedMotion: "reduce" });
  const rmPage = await rm.newPage();
  await rmPage.goto("http://127.0.0.1:8321/tape.html#t=zzz", { waitUntil: "networkidle" });
  await rmPage.goto("http://127.0.0.1:8321/index.html", { waitUntil: "networkidle" });
  const anim = await rmPage.evaluate(() => {
    const hub = document.querySelector(".reel .hub");
    return hub ? getComputedStyle(hub).animationName : "none";
  });
  check("prefers-reduced-motion stops the reels", anim === "none", `animation-name=${anim}`);

  // --- reduced motion: the flip lands instantly instead of animating ---
  const tapeUrl = await page.evaluate(() => window.TapeCodec.toUrl({
    title: "T", to: "A", from: "B", note: "", theme: 0,
    songs: [
      { title: "S1", artist: "A1" }, { title: "S2", artist: "A2" },
      { title: "S3", artist: "A3" }, { title: "S4", artist: "A4" },
    ],
  }));
  const rmTape = await rm.newPage();
  await rmTape.goto(tapeUrl, { waitUntil: "networkidle" });
  await rmTape.waitForTimeout(800);
  const t0 = Date.now();
  await rmTape.click("#btn-flip");
  // poll for the final transform; with reduced motion it should be near-instant
  await rmTape.waitForFunction(
    () => /matrix3d\(-1/.test(getComputedStyle(document.querySelector("#cassette")).transform),
    { timeout: 2000 }
  );
  const elapsed = Date.now() - t0;
  check("reduced motion: flip is instant, not a 620ms animation", elapsed < 250,
        `${elapsed}ms to reach final transform`);

  const rmMotion = await rmTape.evaluate(async () => {
    const m = await import("./motion.js");
    return m.prefersReducedMotion;
  });
  check("motion.js reports reduced motion centrally", rmMotion === true, `flag=${rmMotion}`);

  // --- bundle budget ---
  const files = ["index.html", "tape.html", "brand.css", "catalog.js", "search.js",
                 "cover.js", "themes.js", "tape-codec.js", "player.js", "resolve.js"];
  const total = files.reduce((n, f) => n + statSync(`${REPO}/${f}`).size, 0);
  check("bundle <= 250KB excluding fonts", total <= 250 * 1024,
        `${(total / 1024).toFixed(1)}KB across ${files.length} files`);

  // --- cover render time ---
  const renderMs = await page.evaluate(() => {
    const c = document.createElement("canvas"); c.width = 1080; c.height = 1080;
    const s = JSON.parse(localStorage.getItem("mixtape-moodboard"));
    const t0 = performance.now();
    window.Cover.render(c, s, window.THEMES[0]);
    return performance.now() - t0;
  });
  check("cover renders <= 400ms", renderMs <= 400, `${renderMs.toFixed(0)}ms`);

  const failed = results.filter((r) => !r.p);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exitCode = failed.length ? 1 : 0;
  await browser.close();
})();
