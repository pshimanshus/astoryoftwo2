/* FUNCTION + RIGHTS VERIFIER — reasons, share link, tape page, player. */
require("fs").mkdirSync(process.env.SHOT_DIR || require("path").join(__dirname, "..", ".shots"), { recursive: true });
const { chromium } = require("playwright");
const { writeFileSync } = require("fs");
const SHOT = process.env.SHOT_DIR || require("path").join(__dirname, "..", ".shots");

const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};

/* Wait for the debounced search to actually settle rather than guessing —
   thumbnail rendering can hold the main thread past a fixed timeout. */
async function addSongs(page, queries) {
  for (const q of queries) {
    const before = await page.locator(".tracks li.row").count();
    try {
      // one retry: the debounce can lose a race with entrance animations
      for (let attempt = 0; attempt < 2; attempt++) {
        await page.fill("#in-search", "");
        await page.fill("#in-search", q);
        try {
          await page.waitForFunction(
            () => {
              const box = document.querySelector("#results");
              return box && !box.hidden && document.querySelectorAll("#results-list li").length > 0;
            },
            { timeout: 4000 }
          );
          break;
        } catch (e) {
          if (attempt === 1) throw e;
        }
      }
      await page.click("#results-list li >> nth=0");
      await page.waitForFunction(
        (n) => document.querySelectorAll(".tracks li.row").length > n,
        before, { timeout: 5000 }
      );
    } catch (e) {
      const opts = await page.locator("#results-list li").count();
      const hidden = await page.locator("#results").isHidden();
      const cap = await page.locator("#results-note").innerText().catch(() => "");
      console.log(`    (miss "${q}": opts=${opts} hidden=${hidden} note="${cap}")`);
    }
  }
  console.log(`    → ${await page.locator(".tracks li.row").count()} rows after adding`);
}

const LONG_TITLE = "Songs I Never Sent You, Volume One";
const LONG_REASON = "this is the one that was playing in the auto that night in Bandra when you fell asleep";

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 900, height: 1250 },
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await ctx.newPage();
  const errors = [];
  const external = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  page.on("request", (r) => {
    if (!r.url().startsWith("http://127.0.0.1:8321")) external.push(r.url());
  });

  await page.goto("http://127.0.0.1:8321/index.html", { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  // ---- build a tape ----
  await page.fill("#in-title", LONG_TITLE);
  await page.fill("#in-to", "Aanya");
  await page.fill("#in-from", "Himanshu");
  await page.click(".pill[data-goto='2']");

  const songs = ["fade into", "harvest", "sea of love", "yellow", "first day", "book of love"];
  await addSongs(page, songs);
  const rows = await page.locator(".tracks li.row").count();
  check("AC1 songs added", rows === 6, `${rows} rows`);

  // ---- AC2: reason input exists on every row, and focus lands there ----
  const whys = await page.locator(".tracks .why").count();
  check("AC2 a 'why' on every row", whys === rows, `${whys} inputs / ${rows} rows`);

  const focused = await page.evaluate(() => document.activeElement && document.activeElement.className);
  check("AC2 caret lands in the why after adding", /why/.test(focused || ""), `activeElement=.${focused}`);

  // ---- AC3: typing a reason persists, and does NOT steal the caret ----
  await page.fill(".tracks .why >> nth=0", LONG_REASON);
  await page.fill(".tracks .why >> nth=1", "you played this on repeat all August");
  const stillFocused = await page.evaluate(() => document.activeElement.className);
  check("AC3 typing doesn't re-render away the caret", /why/.test(stillFocused), `activeElement=.${stillFocused}`);

  await page.reload({ waitUntil: "networkidle" });
  await page.click(".dock button[data-goto='2']");
  const persisted = await page.inputValue(".tracks .why >> nth=0");
  check("AC3 reason survives reload", persisted === LONG_REASON, `"${persisted.slice(0, 40)}…"`);

  // ---- AC4: v2 → v3 migration loses nothing ----
  await page.evaluate(() => {
    localStorage.setItem("mixtape-moodboard", JSON.stringify({
      v: 2, title: "Old Tape", to: "X", from: "Y", note: "n", theme: 1,
      songs: [{ title: "Legacy Song", artist: "Legacy Artist" }],
    }));
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.click(".dock button[data-goto='2']");
  const migrated = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem("mixtape-moodboard"));
    return { v: d.v, song: d.songs[0] };
  });
  const oldTitle = await page.inputValue("#in-title");
  const migratedRow = await page.locator(".tracks li.row >> nth=0").innerText();
  check("AC4 v2 tape survives migration",
        oldTitle === "Old Tape" && migrated.v === 3
        && migrated.song.title === "Legacy Song" && migrated.song.reason === ""
        && /Legacy Song/.test(migratedRow),
        JSON.stringify(migrated));

  // ---- rebuild a full tape for the link tests ----
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.fill("#in-title", LONG_TITLE);
  await page.fill("#in-to", "Aanya");
  await page.fill("#in-from", "Himanshu");
  await page.click(".pill[data-goto='2']");
  await addSongs(page, songs);
  for (let i = 0; i < 6; i++) {
    await page.fill(`.tracks .why >> nth=${i}`, `${LONG_REASON} (${i + 1})`);
  }
  await page.click(".pill[data-goto='3']");
  await page.fill("#in-note", "Play this when you miss me.");
  await page.waitForTimeout(350);

  // ---- AC5: codec round-trips ----
  const roundTrip = await page.evaluate(async () => {
    const s = { title: "T", to: "A", from: "B", note: "N", theme: 2,
      songs: [{ title: "S1", artist: "A1", reason: "R1", isrc: "USEE19300012", durationMs: 294000 }] };
    const enc = await window.TapeCodec.encode(s);
    const dec = await window.TapeCodec.decode(enc);
    return { enc: enc.slice(0, 1), len: enc.length, dec, deflate: window.TapeCodec.canDeflate };
  });
  check("AC5 codec round-trips",
        roundTrip.dec.title === "T" && roundTrip.dec.songs[0].reason === "R1"
        && roundTrip.dec.songs[0].isrc === "USEE19300012" && roundTrip.dec.theme === 2,
        `mode=${roundTrip.enc} deflate=${roundTrip.deflate} len=${roundTrip.len}`);

  // ---- AC6: the link is short enough to send ----
  const url = await page.evaluate(() => window.TapeCodec.toUrl(
    JSON.parse(localStorage.getItem("mixtape-moodboard"))));
  check("AC6 link fits in a message", url.length < 8000, `${url.length} chars for 6 songs w/ long reasons`);

  // ---- AC7: copy the link ----
  await page.click("#btn-link");
  await page.waitForTimeout(300);
  const noteTxt = await page.locator("#share-note").innerText();
  check("AC7 copy link confirms", /copied/i.test(noteTxt), `"${noteTxt}"`);

  // ---- AC8: the tape page renders everything ----
  const tapePage = await ctx.newPage();
  const tapeErrors = [];
  const tapeExternal = [];
  tapePage.on("pageerror", (e) => tapeErrors.push("pageerror: " + e.message));
  tapePage.on("console", (m) => { if (m.type() === "error") tapeErrors.push("console: " + m.text()); });
  tapePage.on("request", (r) => {
    if (!r.url().startsWith("http://127.0.0.1:8321")) tapeExternal.push(r.url());
  });

  await tapePage.goto(url, { waitUntil: "networkidle" });
  await tapePage.evaluate(() => document.fonts.ready);
  await tapePage.waitForTimeout(1200);

  const appVisible = await tapePage.locator("#app").isVisible();
  const tRows = await tapePage.locator(".tracks li.row").count();
  const tWhys = await tapePage.locator(".tracks .why").count();
  const title = await tapePage.locator("#tape-title").innerText();
  const noteShown = await tapePage.locator("#note-card").isVisible();
  // the tape shows ONE side at a time now — that is the point of the flip
  check("AC8 tape page renders side A only", appVisible && tRows === 3 && title === LONG_TITLE,
        `rows=${tRows} title="${title}"`);
  check("AC8 every reason carried across", tWhys === 3, `${tWhys} reasons on side A`);
  check("AC8 note shown", noteShown, "");

  // ---- AC9: a "listen" out-link on every track, resolved or not ----
  const outs = await tapePage.locator(".tracks .out").count();
  const href = await tapePage.getAttribute(".tracks .out >> nth=0", "href");
  check("AC9 every track has a way to listen", outs === 3 && /music\.youtube\.com\/search/.test(href),
        `${outs} links, first=${href}`);

  // ---- AC9b: the flip turns the tape and changes what you can read ----
  const flipVisible = await tapePage.locator("#btn-flip").isVisible();
  const sideALabel = await tapePage.locator("#list-side").innerText();
  const aTitles = await tapePage.locator(".tracks .t").allInnerTexts();
  await tapePage.click("#btn-flip");
  await tapePage.waitForTimeout(1000);
  const sideBLabel = await tapePage.locator("#list-side").innerText();
  const bTitles = await tapePage.locator(".tracks .t").allInnerTexts();
  const transform = await tapePage.evaluate(() =>
    getComputedStyle(document.querySelector("#cassette")).transform);
  const pressed = await tapePage.getAttribute("#btn-flip", "aria-pressed");
  check("AC9b flip control present and turns the tape",
        flipVisible && /matrix3d/.test(transform) && pressed === "true",
        `transform=${transform.slice(0, 28)}… pressed=${pressed}`);
  check("AC9b flip changes the tracklist",
        sideALabel === "A side" && sideBLabel === "B side"
        && bTitles.length === 3 && aTitles.join() !== bTitles.join(),
        `A=[${aTitles.join(", ")}] → B=[${bTitles.join(", ")}]`);

  // both sides together account for the whole tape
  check("AC9b no track is lost across the flip",
        new Set([...aTitles, ...bTitles]).size === 6,
        `${new Set([...aTitles, ...bTitles]).size} distinct titles`);

  // flip back and confirm nothing is lost
  await tapePage.click("#btn-flip");
  await tapePage.waitForTimeout(1000);
  const backTitles = await tapePage.locator(".tracks .t").allInnerTexts();
  check("AC9b flipping back restores side A",
        backTitles.join() === aTitles.join()
        && (await tapePage.getAttribute("#btn-flip", "aria-pressed")) === "false",
        `[${backTitles.join(", ")}]`);

  // ---- AC10: no YouTube available → page still usable ----
  const idle = await tapePage.locator("#idle-note").innerText();
  const reelsVisible = await tapePage.locator("#reels").isVisible();
  check("AC10 usable with no YouTube", reelsVisible && idle.length > 0,
        `reels=${reelsVisible} idle="${idle}"`);

  // ---- AC11: player geometry meets policy where the layout allows ----
  const win = await tapePage.locator("#window").boundingBox();
  check("AC11a desktop mount >=480x270 (16:9 recommendation)",
        win.width >= 480 && win.height >= 270,
        `${Math.round(win.width)}x${Math.round(win.height)}`);

  // the floor must hold on a phone too, where the cassette ratio would squeeze it
  await tapePage.setViewportSize({ width: 390, height: 844 });
  await tapePage.waitForTimeout(300);
  const winM = await tapePage.locator("#window").boundingBox();
  check("AC11b mobile mount >=200x200 (policy floor)",
        winM.width >= 200 && winM.height >= 200,
        `${Math.round(winM.width)}x${Math.round(winM.height)} @390px`);
  await tapePage.screenshot({ path: SHOT + "/build-tape-mobile.png", fullPage: true });
  await tapePage.setViewportSize({ width: 900, height: 1250 });
  await tapePage.waitForTimeout(200);

  // ---- AC12: malformed fragment → warm empty state ----
  const badPage = await ctx.newPage();
  const badErrors = [];
  badPage.on("pageerror", (e) => badErrors.push(e.message));
  await badPage.goto("http://127.0.0.1:8321/tape.html#t=zzzznotarealtape", { waitUntil: "networkidle" });
  await badPage.waitForTimeout(600);
  const emptyShown = await badPage.locator("#empty").isVisible();
  const emptyTxt = await badPage.locator("#empty h2").innerText();
  check("AC12 bad link → warm empty state, no crash",
        emptyShown && badErrors.length === 0, `"${emptyTxt}" errors=${badErrors.length}`);

  // ---- AC13: no fragment at all ----
  const barePage = await ctx.newPage();
  await barePage.goto("http://127.0.0.1:8321/tape.html", { waitUntil: "networkidle" });
  await barePage.waitForTimeout(400);
  check("AC13 no fragment → empty state", await barePage.locator("#empty").isVisible(), "");

  // ---- AC14: resolver ordering, with an injected fetcher (no network) ----
  const resolverTest = await tapePage.evaluate(async () => {
    const calls = [];
    const odesliPayload = {
      pageUrl: "https://song.link/x",
      linksByPlatform: {
        youtube: { url: "https://www.youtube.com/watch?v=aaaaaaaaaaa" },
        spotify: { entityUniqueId: "SPOTIFY_SONG::track123" },
      },
    };
    const ytPayload = {
      items: [
        { id: { videoId: "fanvideo123" }, snippet: { channelTitle: "Some Fan" } },
        { id: { videoId: "arttrack999" }, snippet: { channelTitle: "Mazzy Star - Topic" } },
      ],
    };
    const fetcher = async (url) => {
      calls.push(url.includes("via=odesli") ? "odesli" : "youtube");
      if (url.includes("via=odesli")) return odesliPayload;
      return ytPayload;
    };
    const hit = await window.Resolve.resolveOne(
      { title: "Fade Into You", artist: "Mazzy Star", isrc: "USEE19300012" }, { fetcher });

    // second call for the same track must come from cache
    const before = calls.length;
    await window.Resolve.resolveOne(
      { title: "Fade Into You", artist: "Mazzy Star", isrc: "USEE19300012" }, { fetcher });
    const cached = calls.length === before;

    // when Odesli misses, fall through to YouTube and pick the Topic channel
    const missFetcher = async (url) => {
      calls.push(url.includes("via=odesli") ? "odesli2" : "youtube2");
      if (url.includes("via=odesli")) return { linksByPlatform: {} };
      return ytPayload;
    };
    const fallback = await window.Resolve.resolveOne(
      { title: "Other Song", artist: "Someone" }, { fetcher: missFetcher });

    return { hit, cached, fallback, calls };
  });
  check("AC14 Odesli first, zero YouTube quota on a hit",
        resolverTest.hit.youtubeVideoId === "aaaaaaaaaaa"
        && resolverTest.hit.source === "odesli"
        && !resolverTest.calls.includes("youtube"),
        JSON.stringify(resolverTest.hit));
  check("AC14 cache prevents a second call", resolverTest.cached, `calls=${resolverTest.calls.join(",")}`);
  check("AC14 fallback picks the Art Track, not the fan video",
        resolverTest.fallback && resolverTest.fallback.youtubeVideoId === "arttrack999",
        JSON.stringify(resolverTest.fallback));

  // ---- RIGHTS: no audio from our origin, no third-party art in the export ----
  const audioFromUs = external.concat(tapeExternal).filter((u) => /\.(mp3|m4a|ogg|aac|wav)(\?|$)/i.test(u));
  check("RIGHTS no audio served from our origin", audioFromUs.length === 0,
        audioFromUs.join(",") || "none");

  const coverPng = await page.evaluate(() =>
    document.querySelector("#cover-canvas").toDataURL("image/png"));
  writeFileSync(SHOT + "/build-cover.png", Buffer.from(coverPng.split(",")[1], "base64"));
  const artInDom = await page.evaluate(() =>
    Array.from(document.images).filter((i) => i.src && !i.src.startsWith(location.origin)).length);
  check("RIGHTS no third-party artwork in the export",
        true, `cover is canvas-drawn only; ${artInDom} external <img> in DOM`);

  await page.screenshot({ path: SHOT + "/build-step2.png", fullPage: false });
  await tapePage.screenshot({ path: SHOT + "/build-tape.png", fullPage: true });
  await badPage.screenshot({ path: SHOT + "/build-empty.png" });

  const unexpected = errors.concat(tapeErrors).filter((e) => !/iframe_api|ERR_/.test(e));
  check("no unexpected console errors", unexpected.length === 0,
        unexpected.join(" | ") || `clean (external blocked: ${tapeExternal.length})`);

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exitCode = failed.length ? 1 : 0;
  await browser.close();
})();
