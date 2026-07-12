/* ============================================================
   MIXTAPE — cover renderer
   Composition + a realistic compact cassette (true 1.575:1
   proportions: 100 × 63.5 mm) drawn with plastic bevels,
   hub teeth, wound tape and a gloss sweep.
   ============================================================ */

(() => {
  "use strict";

  /* ---------- shared drawing utils (used by theme painters too) ---------- */

  const U = {
    rr(ctx, x, y, w, h, r) {
      const rad = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + rad, y);
      ctx.arcTo(x + w, y, x + w, y + h, rad);
      ctx.arcTo(x + w, y + h, x, y + h, rad);
      ctx.arcTo(x, y + h, x, y, rad);
      ctx.arcTo(x, y, x + w, y, rad);
      ctx.closePath();
    },

    fit(ctx, text, maxWidth) {
      if (ctx.measureText(text).width <= maxWidth) return text;
      let t = text;
      while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) t = t.slice(0, -1);
      return t + "…";
    },

    // shared "SIDE A" badge in the label's lower-left corner
    sideBadge(ctx, r, bg, fg) {
      const bx = r.x + 16, by = r.y + r.h - 46, bw = 78, bh = 32;
      ctx.fillStyle = bg;
      U.rr(ctx, bx, by, bw, bh, 6);
      ctx.fill();
      ctx.fillStyle = fg;
      ctx.font = "700 17px 'Jost', sans-serif";
      ctx.letterSpacing = "2px";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("SIDE A", bx + bw / 2, by + bh / 2 + 1);
      ctx.letterSpacing = "0px";
      ctx.textBaseline = "alphabetic";
    },
  };

  /* ---------- the cassette ---------- */

  function drawReel(ctx, cx, cy, tapeRadius) {
    // wound tape
    ctx.fillStyle = "#221710";
    ctx.beginPath();
    ctx.arc(cx, cy, tapeRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    for (let r = 24; r < tapeRadius - 2; r += 4.5) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    // tape edge highlight
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(cx, cy, tapeRadius - 1, -0.8, 0.9);
    ctx.stroke();

    // hub — white ring with drive teeth
    ctx.fillStyle = "#f0e9d8";
    ctx.beginPath();
    ctx.arc(cx, cy, 21, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c7bda5";
    ctx.beginPath();
    ctx.arc(cx, cy, 21, 0, Math.PI * 2);
    ctx.arc(cx, cy, 15, 0, Math.PI * 2, true);
    ctx.fill("evenodd");
    ctx.fillStyle = "#7a715c";
    for (let i = 0; i < 6; i++) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((Math.PI / 3) * i);
      ctx.fillRect(-2.4, -20, 4.8, 8);
      ctx.restore();
    }
    ctx.fillStyle = "#3d3627";
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawScrew(ctx, x, y, tone) {
    const g = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, 9);
    g.addColorStop(0, "rgba(255,255,255,0.35)");
    g.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = tone || "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.arc(x, y, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(x - 4.5, y - 4.5); ctx.lineTo(x + 4.5, y + 4.5);
    ctx.moveTo(x + 4.5, y - 4.5); ctx.lineTo(x - 4.5, y + 4.5);
    ctx.stroke();
  }

  function drawCassette(ctx, x, y, w, h, theme, state) {
    const shell = theme.shell;
    const r = w * 0.032;

    // soft ground shadow
    ctx.save();
    ctx.filter = "blur(14px)";
    ctx.fillStyle = "rgba(0,0,0,0.38)";
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h + 8, w * 0.52, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // body
    const body = ctx.createLinearGradient(0, y, 0, y + h);
    body.addColorStop(0, shell.light);
    body.addColorStop(0.22, shell.base);
    body.addColorStop(1, shell.dark);
    ctx.fillStyle = body;
    U.rr(ctx, x, y, w, h, r);
    ctx.fill();

    // plastic bevel — light rim above, dark rim below
    const bevel = ctx.createLinearGradient(0, y, 0, y + h);
    bevel.addColorStop(0, "rgba(255,255,255,0.55)");
    bevel.addColorStop(0.25, "rgba(255,255,255,0.08)");
    bevel.addColorStop(0.8, "rgba(0,0,0,0.15)");
    bevel.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.strokeStyle = bevel;
    ctx.lineWidth = 3;
    U.rr(ctx, x + 1.5, y + 1.5, w - 3, h - 3, r);
    ctx.stroke();
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = 1.6;
    U.rr(ctx, x, y, w, h, r);
    ctx.stroke();

    // label (theme-designed)
    const label = {
      x: x + w * 0.07,
      y: y + h * 0.085,
      w: w * 0.86,
      h: h * 0.565,
    };
    theme.label(ctx, label, state, U);

    // tape window
    const ww = w * 0.46;
    const wx = x + (w - ww) / 2;
    const wh = h * 0.245;
    const wy = y + h * 0.415;
    ctx.fillStyle = "#15100c";
    U.rr(ctx, wx, wy, ww, wh, 12);
    ctx.fill();
    // window inner shadow + rim
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.lineWidth = 4;
    U.rr(ctx, wx + 2, wy + 2, ww - 4, wh - 4, 10);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 2;
    U.rr(ctx, wx, wy, ww, wh, 12);
    ctx.stroke();

    // reels — mid-song, left roll fuller
    const cy = wy + wh / 2;
    ctx.save();
    U.rr(ctx, wx, wy, ww, wh, 12);
    ctx.clip();
    const leftX = wx + ww * 0.235;
    const rightX = wx + ww * 0.765;
    drawReel(ctx, leftX, cy, 44);
    drawReel(ctx, rightX, cy, 32);
    // taut tape run along the bottom of the window
    ctx.strokeStyle = "#1b120c";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(leftX - 6, cy + 44);
    ctx.lineTo(rightX + 4, cy + 32);
    ctx.stroke();
    // glass reflection across the window
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.lineTo(wx + ww * 0.45, wy);
    ctx.lineTo(wx + ww * 0.25, wy + wh);
    ctx.lineTo(wx, wy + wh);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // bottom transport plate
    const bw = w * 0.36;
    const bx = x + (w - bw) / 2;
    const by = y + h - h * 0.135;
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.moveTo(bx + 20, by);
    ctx.lineTo(bx + bw - 20, by);
    ctx.lineTo(bx + bw, by + h * 0.115);
    ctx.lineTo(bx, by + h * 0.115);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#15100c";
    [0.16, 0.5, 0.84].forEach((t) => {
      ctx.beginPath();
      ctx.arc(bx + bw * t, by + h * 0.058, t === 0.5 ? 6 : 9, 0, Math.PI * 2);
      ctx.fill();
    });

    // screws
    const inset = w * 0.036;
    drawScrew(ctx, x + inset, y + inset, theme.screw);
    drawScrew(ctx, x + w - inset, y + inset, theme.screw);
    drawScrew(ctx, x + inset, y + h - inset, theme.screw);
    drawScrew(ctx, x + w - inset, y + h - inset, theme.screw);
    drawScrew(ctx, x + w / 2, y + h - inset, theme.screw);

    // gloss sweep across the shell
    ctx.save();
    U.rr(ctx, x, y, w, h, r);
    ctx.clip();
    ctx.fillStyle = "rgba(255,255,255,0.09)";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w * 0.42, y);
    ctx.lineTo(x + w * 0.18, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /* ---------- tracklist panel ---------- */

  function drawTracklist(ctx, state, theme) {
    const songs0 = state.songs.length;
    const rows = Math.min(6, Math.max(2, Math.ceil((songs0 || 2) / 2)));
    const px = 96, py = 668, pw = 1080 - 192, ph = 94 + rows * 32;
    const p = theme.panel;

    ctx.save();
    ctx.fillStyle = p.fill;
    U.rr(ctx, px, py, pw, ph, 18);
    ctx.fill();
    ctx.strokeStyle = p.stroke;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    const songs = state.songs.length
      ? state.songs
      : [{ title: "your songs will appear here", artist: "" }];
    const aCount = Math.ceil(songs.length / 2);
    const sides = [
      { label: "SIDE A", list: songs.slice(0, aCount), x: px + 40 },
      { label: "SIDE B", list: songs.slice(aCount), x: px + pw / 2 + 24 },
    ];
    const colW = pw / 2 - 70;
    const topY = py + 52;

    // center divider
    ctx.strokeStyle = p.rule;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px + pw / 2, py + 28);
    ctx.lineTo(px + pw / 2, py + ph - 28);
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    sides.forEach((side) => {
      ctx.font = "700 21px 'Jost', sans-serif";
      ctx.letterSpacing = "4px";
      ctx.fillStyle = p.head;
      ctx.fillText(side.label, side.x, topY);
      ctx.letterSpacing = "0px";
      ctx.strokeStyle = p.rule;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(side.x, topY + 10);
      ctx.lineTo(side.x + colW, topY + 10);
      ctx.stroke();

      side.list.slice(0, 6).forEach((song, i) => {
        const yy = topY + 48 + i * 32;
        ctx.font = `400 ${theme.listSize || 21}px ${theme.listFont}`;
        ctx.fillStyle = p.ink;
        const line = song.artist ? `${song.title} — ${song.artist}` : song.title;
        ctx.fillText(U.fit(ctx, `${i + 1}.  ${line}`, colW), side.x, yy);
      });
    });
    ctx.restore();
  }

  /* ---------- full composition ---------- */

  function render(canvas, state, theme) {
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.letterSpacing = "0px";

    theme.background(ctx, W, H, U);

    // header
    const hd = theme.header;
    ctx.textAlign = "center";
    ctx.font = "700 22px 'Jost', sans-serif";
    ctx.letterSpacing = "8px";
    ctx.fillStyle = hd.eyebrow;
    // trailing tracking shifts centered text right — compensate by half
    ctx.fillText("A MIXTAPE FOR", W / 2 - 4, 92);
    ctx.letterSpacing = "0px";

    let to = state.to.trim() || "you";
    if (hd.nameCaps) to = to.toUpperCase();
    let nsize = 76;
    do {
      ctx.font = `${hd.nameStyle || "400"} ${nsize}px ${hd.nameFont}`;
      if (hd.nameSpacing) ctx.letterSpacing = hd.nameSpacing;
      nsize -= 3;
    } while (ctx.measureText(to).width > 860 && nsize > 34);
    const nameX = W / 2 - (hd.nameSpacing ? parseFloat(hd.nameSpacing) / 2 : 0);
    if (hd.nameShadow) {
      ctx.fillStyle = hd.nameShadow;
      const off = hd.shadowOffset || 4;
      ctx.fillText(to, nameX + off, 178 + off);
    }
    ctx.fillStyle = hd.name;
    ctx.fillText(to, nameX, 178);
    ctx.letterSpacing = "0px";

    // the tape
    drawCassette(ctx, W / 2 - 310, 222, 620, 394, theme, state);

    // tracklist
    drawTracklist(ctx, state, theme);

    // footer
    ctx.textAlign = "center";
    const note = state.note.trim();
    const from = state.from.trim() || "me";
    const date = new Date().toLocaleDateString(undefined, { month: "short", year: "numeric" });
    let fy = 998;
    if (note) {
      ctx.font = `400 27px ${theme.scriptFont}`;
      ctx.fillStyle = theme.footer.note;
      ctx.fillText(U.fit(ctx, `“${note}”`, 860), W / 2, fy);
      fy += 40;
    } else {
      fy += 16;
    }
    ctx.font = `700 31px ${theme.scriptFont}`;
    ctx.fillStyle = theme.footer.sig;
    ctx.fillText(U.fit(ctx, `with love, ${from}  ♥  rec. ${date}`, 880), W / 2, fy);

    // fine grain over everything
    ctx.save();
    ctx.globalAlpha = theme.id === "camden" ? 0.07 : 0.035;
    for (let i = 0; i < 3000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? "#111" : "#fff";
      ctx.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5);
    }
    ctx.restore();
  }

  window.Cover = { render, utils: U };
})();
