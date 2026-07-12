/* ============================================================
   MIXTAPE — regional theme painters
   Four design languages, researched from iconic tape scenes:

   · Shibuya '86  — Japanese city pop: Hiroshi Nagai sunsets,
     pastel gradients, chrome type, TDK-era hi-fi labels.
   · Bombay '92   — the Indian cassette boom (T-Series / HMV):
     saffron, magenta and gold, ornate borders, ray bursts.
   · Detroit '68  — Motown / Tamla: cream, mustard and maroon,
     concentric vinyl rings, geometric Futura-style caps.
   · Camden '79   — UK punk & 2-Tone: checkerboard, photocopy
     grain, typewriter ransom strips, a slash of red.

   Painters receive (ctx, …geometry…, U) where U = CoverUtils.
   ============================================================ */

(() => {
  "use strict";

  /* ---------- Shibuya '86 ---------- */

  function shibuyaBackground(ctx, W, H, U) {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#33295e");
    sky.addColorStop(0.34, "#8a4d7e");
    sky.addColorStop(0.58, "#d4708a");
    sky.addColorStop(0.78, "#ef9c6b");
    sky.addColorStop(1, "#f7c873");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // scattered stars, upper sky
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    const stars = [[90,90],[210,150],[330,70],[520,120],[760,90],[900,160],[990,60],[640,55],[150,250],[860,260]];
    stars.forEach(([x, y], i) => {
      ctx.globalAlpha = 0.35 + (i % 3) * 0.2;
      ctx.beginPath();
      ctx.arc(x, y, i % 4 === 0 ? 2.4 : 1.6, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // the retro sun — banded lower half, its crown peeking over the tape
    const scx = W / 2, scy = 448, sr = 252;
    ctx.save();
    ctx.beginPath();
    ctx.arc(scx, scy, sr, 0, Math.PI * 2);
    ctx.clip();
    const sun = ctx.createLinearGradient(0, scy - sr, 0, scy + sr);
    sun.addColorStop(0, "#fff4d6");
    sun.addColorStop(0.55, "#ffd98f");
    sun.addColorStop(1, "#ff9d6b");
    ctx.fillStyle = sun;
    ctx.fillRect(scx - sr, scy - sr, sr * 2, sr * 2);
    // venetian gaps widen toward the bottom
    ctx.fillStyle = "rgba(212,112,138,0.85)";
    let gy = scy + 10, gap = 6;
    while (gy < scy + sr) {
      ctx.fillRect(scx - sr, gy, sr * 2, gap);
      gy += gap + 26;
      gap += 4;
    }
    ctx.restore();

    // palm silhouettes flanking the tape, fronds clear of the tracklist
    palm(ctx, 100, 542, 175, -22, U);
    palm(ctx, W - 92, 532, 195, 26, U);

    // chrome horizon accents
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(60, 636); ctx.lineTo(300, 636); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W - 300, 636); ctx.lineTo(W - 60, 636); ctx.stroke();
  }

  function palm(ctx, x, topY, hgt, lean, U) {
    ctx.save();
    ctx.fillStyle = "#2b2144";
    ctx.strokeStyle = "#2b2144";
    // trunk
    ctx.lineWidth = 13;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - lean, topY + hgt);
    ctx.quadraticCurveTo(x - lean * 0.2, topY + hgt * 0.45, x, topY);
    ctx.stroke();
    // fronds
    const angles = [-2.7, -2.2, -1.7, -1.2, -0.6, -0.1, 0.4];
    angles.forEach((a) => {
      const len = 92;
      const ex = x + Math.cos(a) * len;
      const ey = topY + Math.sin(a) * len * 0.72;
      ctx.beginPath();
      ctx.moveTo(x, topY);
      ctx.quadraticCurveTo(x + Math.cos(a) * len * 0.5, topY + Math.sin(a) * len * 0.2 - 26, ex, ey);
      ctx.quadraticCurveTo(x + Math.cos(a) * len * 0.55, topY + Math.sin(a) * len * 0.38 - 6, x, topY + 6);
      ctx.closePath();
      ctx.fill();
    });
    ctx.restore();
  }

  function shibuyaLabel(ctx, r, state, U) {
    // clean pearl label, TDK-style tech band
    ctx.fillStyle = "#f4f2ec";
    U.rr(ctx, r.x, r.y, r.w, r.h, 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(29,29,31,0.22)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    U.rr(ctx, r.x, r.y, r.w, r.h, 10);
    ctx.clip();

    // diagonal gradient stripe band across the top
    const band = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y);
    band.addColorStop(0, "#37b6d9");
    band.addColorStop(0.5, "#7f6dc9");
    band.addColorStop(1, "#e668a4");
    ctx.fillStyle = band;
    ctx.beginPath();
    ctx.moveTo(r.x, r.y);
    ctx.lineTo(r.x + r.w, r.y);
    ctx.lineTo(r.x + r.w, r.y + 22);
    ctx.lineTo(r.x, r.y + 34);
    ctx.closePath();
    ctx.fill();

    // tech line
    ctx.fillStyle = "#8a8a93";
    ctx.font = "700 13px 'Jost', sans-serif";
    ctx.letterSpacing = "3px";
    ctx.textAlign = "right";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("TYPE II · 90", r.x + r.w - 18, r.y + r.h - 18);
    ctx.letterSpacing = "0px";
    ctx.restore();

    // chrome title
    const title = state.title.trim() || "our mixtape";
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    let size = 46;
    do { ctx.font = `400 ${size}px 'Archivo Black', sans-serif`; size -= 2; }
    while (ctx.measureText(title).width > r.w - 70 && size > 20);
    const ty = r.y + r.h * 0.40;
    const chrome = ctx.createLinearGradient(0, ty - size, 0, ty + 6);
    chrome.addColorStop(0, "#2f9fd0");
    chrome.addColorStop(0.48, "#eaf6fd");
    chrome.addColorStop(0.52, "#ffffff");
    chrome.addColorStop(1, "#6b55b8");
    ctx.translate(r.x + r.w / 2, ty);
    ctx.transform(1, 0, -0.12, 1, 0, 0); // italic skew
    ctx.strokeStyle = "#241f3a";
    ctx.lineWidth = 5;
    ctx.lineJoin = "round";
    ctx.strokeText(title, 0, 0);
    ctx.fillStyle = chrome;
    ctx.fillText(title, 0, 0);
    ctx.restore();

    U.sideBadge(ctx, r, "#241f3a", "#f4f2ec");
  }

  /* ---------- Bombay '92 ---------- */

  function bombayBackground(ctx, W, H, U) {
    ctx.fillStyle = "#3b1355";
    ctx.fillRect(0, 0, W, H);

    // ray burst from behind the header
    ctx.save();
    ctx.translate(W / 2, 250);
    for (let i = 0; i < 28; i++) {
      const a0 = (Math.PI * 2 * i) / 28;
      ctx.fillStyle = i % 2 ? "rgba(232,182,76,0.10)" : "rgba(216,64,120,0.10)";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 1400, a0, a0 + Math.PI / 28);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // ornate double gold frame
    ctx.strokeStyle = "#d8a437";
    ctx.lineWidth = 6;
    ctx.strokeRect(30, 30, W - 60, H - 60);
    ctx.lineWidth = 1.6;
    ctx.strokeRect(48, 48, W - 96, H - 96);

    // corner lotus dots
    const c = 30;
    [[c, c], [W - c, c], [c, H - c], [W - c, H - c]].forEach(([x, y]) => {
      ctx.fillStyle = "#d8a437";
      ctx.beginPath();
      ctx.arc(x, y, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#3b1355";
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
    });

    // scalloped bead row inside the top frame (bottom stays clear for the signature)
    ctx.fillStyle = "rgba(216,164,55,0.65)";
    for (let x = 72; x < W - 60; x += 26) {
      ctx.beginPath(); ctx.arc(x, 62, 3.4, 0, Math.PI * 2); ctx.fill();
    }
  }

  function bombayLabel(ctx, r, state, U) {
    ctx.fillStyle = "#f7ecd4";
    U.rr(ctx, r.x, r.y, r.w, r.h, 10);
    ctx.fill();
    ctx.strokeStyle = "#b3812a";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.save();
    U.rr(ctx, r.x, r.y, r.w, r.h, 10);
    ctx.clip();

    // magenta crown band with gold rule
    ctx.fillStyle = "#c02f6b";
    ctx.fillRect(r.x, r.y, r.w, 30);
    ctx.strokeStyle = "#e8b64c";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(r.x, r.y + 36); ctx.lineTo(r.x + r.w, r.y + 36);
    ctx.stroke();
    ctx.fillStyle = "#f7ecd4";
    ctx.font = "700 16px 'Jost', sans-serif";
    ctx.letterSpacing = "4px";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SUPER HIT · GEET MALA", r.x + r.w / 2, r.y + 16);
    ctx.letterSpacing = "0px";

    // small gold diamond motifs
    ctx.fillStyle = "#d8a437";
    [-1, 1].forEach((s) => {
      const dx = r.x + r.w / 2 + s * (r.w / 2 - 42);
      const dy = r.y + r.h * 0.44;
      ctx.save();
      ctx.translate(dx, dy);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-7, -7, 14, 14);
      ctx.restore();
    });
    ctx.restore();

    // title — gold with maroon outline
    const title = state.title.trim() || "our mixtape";
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    let size = 50;
    do { ctx.font = `400 ${size}px 'Yatra One', serif`; size -= 2; }
    while (ctx.measureText(title).width > r.w - 110 && size > 22);
    const ty = r.y + r.h * 0.47;
    ctx.strokeStyle = "#6b1430";
    ctx.lineWidth = 6;
    ctx.lineJoin = "round";
    ctx.strokeText(title, r.x + r.w / 2, ty);
    ctx.fillStyle = "#e8b64c";
    ctx.fillText(title, r.x + r.w / 2, ty);
    ctx.restore();

    U.sideBadge(ctx, r, "#6b1430", "#f7ecd4");
  }

  /* ---------- Detroit '68 ---------- */

  function detroitBackground(ctx, W, H, U) {
    ctx.fillStyle = "#f4e8cf";
    ctx.fillRect(0, 0, W, H);

    // concentric vinyl rings, top-right
    ctx.save();
    ctx.translate(W - 130, 120);
    for (let rr = 420; rr > 40; rr -= 44) {
      ctx.strokeStyle = (rr / 44) % 2 < 1 ? "rgba(122,34,48,0.30)" : "rgba(217,154,43,0.38)";
      ctx.lineWidth = 15;
      ctx.beginPath();
      ctx.arc(0, 0, rr, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(122,34,48,0.55)";
    ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // mustard starburst, bottom-left
    ctx.save();
    ctx.translate(120, 636);
    ctx.fillStyle = "rgba(217,154,43,0.9)";
    for (let i = 0; i < 12; i++) {
      ctx.rotate(Math.PI / 6);
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(52, 0);
      ctx.lineTo(0, 12);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "#7a2230";
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // baseline rules
    ctx.strokeStyle = "rgba(122,34,48,0.5)";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(60, 74); ctx.lineTo(W * 0.34, 74); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W * 0.66, 74); ctx.lineTo(W - 60, 74); ctx.stroke();
  }

  function detroitLabel(ctx, r, state, U) {
    // Tamla-style: mustard crown band over cream
    ctx.fillStyle = "#f6efdd";
    U.rr(ctx, r.x, r.y, r.w, r.h, 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(58,46,37,0.3)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    U.rr(ctx, r.x, r.y, r.w, r.h, 10);
    ctx.clip();
    ctx.fillStyle = "#d99a2b";
    ctx.fillRect(r.x, r.y, r.w, r.h * 0.30);
    ctx.fillStyle = "#7a2230";
    ctx.fillRect(r.x, r.y + r.h * 0.30, r.w, 5);

    ctx.fillStyle = "#7a2230";
    ctx.font = "700 17px 'Jost', sans-serif";
    ctx.letterSpacing = "5px";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("THE SOUND OF YOUNG LOVE", r.x + r.w / 2, r.y + r.h * 0.15);
    ctx.letterSpacing = "0px";
    ctx.restore();

    // title — geometric caps, maroon
    const title = (state.title.trim() || "our mixtape").toUpperCase();
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    let size = 44;
    do { ctx.font = `700 ${size}px 'Jost', sans-serif`; size -= 2; }
    while (ctx.measureText(title).width > r.w - 80 && size > 18);
    ctx.fillStyle = "#7a2230";
    ctx.fillText(title, r.x + r.w / 2, r.y + r.h * 0.56);
    // mustard underline
    const tw = Math.min(ctx.measureText(title).width, r.w - 100);
    ctx.strokeStyle = "#d99a2b";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(r.x + r.w / 2 - tw / 2, r.y + r.h * 0.60);
    ctx.lineTo(r.x + r.w / 2 + tw / 2, r.y + r.h * 0.60);
    ctx.stroke();
    ctx.restore();

    U.sideBadge(ctx, r, "#7a2230", "#f6efdd");
  }

  /* ---------- Camden '79 ---------- */

  function camdenBackground(ctx, W, H, U) {
    ctx.fillStyle = "#efece4";
    ctx.fillRect(0, 0, W, H);

    // 2-Tone checkerboard bands (single row at the bottom so the
    // signature stays legible)
    const sq = 32;
    const band = (y0, rows) => {
      for (let x = 0; x < W; x += sq) {
        for (let y = y0; y < y0 + sq * rows; y += sq) {
          if (((x + y) / sq) % 2 < 1) {
            ctx.fillStyle = "#131313";
            ctx.fillRect(x, y, sq, sq);
          }
        }
      }
    };
    ctx.fillStyle = "#131313";
    band(0, 2);
    band(H - sq, 1);

    // red slash strip, top-left
    ctx.save();
    ctx.translate(0, 130);
    ctx.rotate(-0.10);
    ctx.fillStyle = "#d5372c";
    ctx.fillRect(-40, 0, 400, 34);
    ctx.restore();

    // halftone dot cluster, mid-right
    ctx.fillStyle = "rgba(19,19,19,0.5)";
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 7; j++) {
        const rr = 4.5 - i * 0.42;
        if (rr <= 0.4) continue;
        ctx.beginPath();
        ctx.arc(W - 60 - i * 20, 330 + j * 20, rr, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // staples & photocopy edge
    ctx.strokeStyle = "rgba(19,19,19,0.75)";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(58, 96); ctx.lineTo(78, 96); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W - 78, 96); ctx.lineTo(W - 58, 96); ctx.stroke();
  }

  function camdenLabel(ctx, r, state, U) {
    // photocopied white label, rough border
    ctx.fillStyle = "#f4f1e8";
    U.rr(ctx, r.x, r.y, r.w, r.h, 6);
    ctx.fill();
    ctx.strokeStyle = "#131313";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = "rgba(19,19,19,0.35)";
    ctx.lineWidth = 1.4;
    U.rr(ctx, r.x + 6, r.y + 6, r.w - 12, r.h - 12, 4);
    ctx.stroke();

    // ransom strip title — typewriter on a tilted white slip
    const title = state.title.trim() || "our mixtape";
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    let size = 40;
    do { ctx.font = `400 ${size}px 'Special Elite', monospace`; size -= 2; }
    while (ctx.measureText(title).width > r.w - 110 && size > 18);
    const tw = ctx.measureText(title).width;
    const ty = r.y + r.h * 0.40;
    ctx.translate(r.x + r.w / 2, ty);
    ctx.rotate(-0.02);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-tw / 2 - 16, -size * 0.92, tw + 32, size * 1.3);
    ctx.strokeStyle = "#131313";
    ctx.lineWidth = 2;
    ctx.strokeRect(-tw / 2 - 16, -size * 0.92, tw + 32, size * 1.3);
    ctx.fillStyle = "#131313";
    ctx.fillText(title, 0, 0);
    ctx.restore();

    // marker scrawl
    ctx.fillStyle = "#d5372c";
    ctx.font = "400 20px 'Permanent Marker', cursive";
    ctx.textAlign = "left";
    ctx.save();
    ctx.translate(r.x + 20, r.y + 30);
    ctx.rotate(-0.03);
    ctx.fillText("play LOUD", 0, 0);
    ctx.restore();

    U.sideBadge(ctx, r, "#131313", "#f4f1e8");
  }

  /* ---------- Studio '26 ---------- */

  function studioBackground(ctx, W, H, U) {
    // cool gray grid paper, like a designer's moodboard
    ctx.fillStyle = "#ececec";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(0,0,0,0.065)";
    ctx.lineWidth = 1.4;
    for (let x = 49; x < W; x += 98) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 49; y < H; y += 98) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // white sticker mat behind the cassette (drawCassette rect is fixed)
    ctx.save();
    ctx.translate(W / 2, 419);
    ctx.rotate(-0.012);
    ctx.shadowColor = "rgba(0,0,0,0.18)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 12;
    ctx.fillStyle = "#ffffff";
    U.rr(ctx, -344, -224, 688, 448, 8);
    ctx.fill();
    ctx.restore();

    // blue marker doodles
    ctx.strokeStyle = "#2b3fd4";
    ctx.fillStyle = "#2b3fd4";
    ctx.lineWidth = 4;
    // little heart, top right
    ctx.save();
    ctx.translate(942, 128);
    ctx.rotate(0.18);
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.bezierCurveTo(-16, -8, -4, -22, 0, -10);
    ctx.bezierCurveTo(4, -22, 16, -8, 0, 8);
    ctx.stroke();
    ctx.restore();
    // hand-drawn oval badge with the date, top left
    const d = new Date();
    const badge = `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
    ctx.save();
    ctx.translate(138, 122);
    ctx.rotate(-0.05);
    ctx.beginPath();
    ctx.ellipse(0, 0, 62, 30, 0, 0, Math.PI * 2);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#1a1a1a";
    ctx.stroke();
    ctx.fillStyle = "#1a1a1a";
    ctx.font = "400 27px 'Instrument Serif', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(badge, 0, 1);
    ctx.restore();
  }

  function studioLabel(ctx, r, state, U) {
    ctx.fillStyle = "#ffffff";
    U.rr(ctx, r.x, r.y, r.w, r.h, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // thin double rule at the top, editorial style
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(r.x + 16, r.y + 18); ctx.lineTo(r.x + r.w - 16, r.y + 18);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(r.x + 16, r.y + 23); ctx.lineTo(r.x + r.w - 16, r.y + 23);
    ctx.stroke();

    ctx.fillStyle = "#8a8a8a";
    ctx.font = "700 14px 'Jost', sans-serif";
    ctx.letterSpacing = "4px";
    ctx.textAlign = "right";
    ctx.fillText("MIX · 90", r.x + r.w - 18, r.y + r.h - 18);
    ctx.letterSpacing = "0px";

    // title in blue felt-tip
    const title = state.title.trim() || "our mixtape";
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    let size = 52;
    do { ctx.font = `700 ${size}px 'Caveat', cursive`; size -= 2; }
    while (ctx.measureText(title).width > r.w - 90 && size > 24);
    ctx.fillStyle = "#2b3fd4";
    ctx.save();
    ctx.translate(r.x + r.w / 2, r.y + r.h * 0.44);
    ctx.rotate(-0.015);
    ctx.fillText(title, 0, 0);
    // marker underline
    const tw = Math.min(ctx.measureText(title).width, r.w - 110);
    ctx.strokeStyle = "#2b3fd4";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-tw / 2, 14);
    ctx.quadraticCurveTo(0, 20, tw / 2, 12);
    ctx.stroke();
    ctx.restore();
    ctx.restore();

    U.sideBadge(ctx, r, "#1a1a1a", "#ffffff");
  }

  /* ---------- theme registry ---------- */

  window.THEMES = [
    {
      id: "studio",
      name: "Studio",
      era: "Moodboard · Now",
      shell: { base: "#f2f0eb", dark: "#c9c6bd", light: "#ffffff" },
      screw: "#9a968c",
      header: { eyebrow: "#8a8a8a", name: "#141414", nameFont: "'Instrument Serif', serif", nameStyle: "italic 400" },
      panel: { fill: "#ffffff", stroke: "rgba(0,0,0,0.16)", head: "#2b3fd4", ink: "#1f1f1f", rule: "rgba(0,0,0,0.13)" },
      listFont: "'Courier Prime', monospace",
      listSize: 20,
      scriptFont: "'Caveat', cursive",
      footer: { note: "#5a5a5a", sig: "#2b3fd4" },
      background: studioBackground,
      label: studioLabel,
    },
    {
      id: "shibuya",
      name: "Shibuya",
      era: "Japan · 1986",
      shell: { base: "#ece9e2", dark: "#b3aea1", light: "#ffffff" },
      screw: "#8f8a7d",
      header: { eyebrow: "rgba(255,255,255,0.85)", name: "#ffffff", nameFont: "'Archivo Black', sans-serif", nameShadow: "rgba(43,33,68,0.55)" },
      panel: { fill: "rgba(255,255,255,0.90)", stroke: "rgba(43,33,68,0.25)", head: "#7f5fc4", ink: "#241f3a", rule: "rgba(43,33,68,0.22)" },
      listFont: "'Jost', sans-serif",
      scriptFont: "'Caveat', cursive",
      footer: { note: "rgba(255,255,255,0.92)", sig: "#ffffff" },
      background: shibuyaBackground,
      label: shibuyaLabel,
    },
    {
      id: "bombay",
      name: "Bombay",
      era: "India · 1992",
      shell: { base: "#a8262e", dark: "#6f1219", light: "#d05a52" },
      screw: "#4a0d12",
      header: { eyebrow: "rgba(232,182,76,0.9)", name: "#e8b64c", nameFont: "'Yatra One', serif", nameShadow: "rgba(38,8,60,0.7)" },
      panel: { fill: "rgba(247,236,212,0.96)", stroke: "#d8a437", head: "#c02f6b", ink: "#3d1c10", rule: "rgba(179,129,42,0.45)" },
      listFont: "'Courier Prime', monospace",
      listSize: 19,
      scriptFont: "'Caveat', cursive",
      footer: { note: "rgba(247,236,212,0.9)", sig: "#e8b64c" },
      background: bombayBackground,
      label: bombayLabel,
    },
    {
      id: "detroit",
      name: "Detroit",
      era: "USA · 1968",
      shell: { base: "#efe3c8", dark: "#c0ae8a", light: "#fdf8ea" },
      screw: "#8a7a5c",
      header: { eyebrow: "#7a2230", name: "#7a2230", nameFont: "'Jost', sans-serif", nameCaps: true, nameSpacing: "6px" },
      panel: { fill: "rgba(255,252,244,0.95)", stroke: "rgba(122,34,48,0.5)", head: "#d99a2b", ink: "#3a2e25", rule: "rgba(122,34,48,0.28)" },
      listFont: "'Jost', sans-serif",
      scriptFont: "'Caveat', cursive",
      footer: { note: "#6d5c4d", sig: "#7a2230" },
      background: detroitBackground,
      label: detroitLabel,
    },
    {
      id: "camden",
      name: "Camden",
      era: "UK · 1979",
      shell: { base: "#2a2a2c", dark: "#131315", light: "#4c4c50" },
      screw: "#0d0d0e",
      header: { eyebrow: "#131313", name: "#131313", nameFont: "'Permanent Marker', cursive", nameShadow: "rgba(213,55,44,0.55)", shadowOffset: 3 },
      panel: { fill: "rgba(255,255,255,0.96)", stroke: "#131313", head: "#d5372c", ink: "#131313", rule: "rgba(19,19,19,0.3)" },
      listFont: "'Special Elite', monospace",
      listSize: 19,
      scriptFont: "'Permanent Marker', cursive",
      footer: { note: "#131313", sig: "#d5372c" },
      background: camdenBackground,
      label: camdenLabel,
    },
  ];
})();
