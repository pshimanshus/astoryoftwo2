/* Build a single self-contained HTML file from tape.html.
   Inlines CSS, fonts (data URIs), and every script; bakes in a real tape.
   Usage: node scripts/build-demo.cjs  ->  dist/tape-demo.html */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

/* ---------- the tape we bake in ---------- */
const TAPE = {
  title: "Songs I Never Sent You",
  to: "Aanya",
  from: "Himanshu",
  note: "Play this when you miss me.",
  theme: 0,
  songs: [
    ["Fade Into You", "Mazzy Star", "the one that was playing in the auto that night in Bandra"],
    ["Harvest Moon", "Neil Young", "you hummed this in the kitchen and didn't notice"],
    ["Sea of Love", "Cat Power", "for the walk back from the pier"],
    ["Yellow", "Coldplay", "obvious. i don't care."],
    ["First Day of My Life", "Bright Eyes", "this is the one i actually mean"],
    ["The Book of Love", "The Magnetic Fields", "for whenever you're reading this again"],
  ],
};

// mirrors pack() in tape-codec.js
const packed = {
  v: 3, t: TAPE.title, to: TAPE.to, f: TAPE.from, n: TAPE.note, th: TAPE.theme,
  s: TAPE.songs.map(([title, artist, reason]) => [title, artist, { r: reason }]),
};
const b64url = Buffer.from(JSON.stringify(packed), "utf8")
  .toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const FRAGMENT = "u" + b64url;   // "u" = uncompressed, per the codec

/* ---------- css with fonts inlined ---------- */
let css = read("brand.css").replace(
  /url\("(fonts\/[^"]+\.woff2)"\)/g,
  (_, file) => {
    const b64 = fs.readFileSync(path.join(ROOT, file)).toString("base64");
    return `url("data:font/woff2;base64,${b64}")`;
  }
);

/* ---------- motion, as a module we can import from a blob ---------- */
const motionBundle = read("vendor/motion.min.js");
// motion.js dynamically imports the bundle by path; point it at a blob instead
let motionSrc = read("motion.js")
  .replace(
    'const mod = await import("./vendor/motion.min.js");',
    "const mod = await import(__MOTION_URL__);"
  )
  .replace(/^export /gm, "");

const EXPORTS = ["settle", "settleAll", "writeIn", "drawOn", "flip", "crossFade", "stepChange"];

/* ---------- assemble ---------- */
let html = read("tape.html");

html = html.replace(
  '<link rel="stylesheet" href="brand.css" />',
  `<style>\n${css}\n</style>`
);

for (const file of ["tape-codec.js", "themes.js", "cover.js", "resolve.js", "player.js"]) {
  html = html.replace(
    new RegExp(`<script src="${file}"></script>`),
    `<script>\n${read(file)}\n</script>`
  );
}

// the module script: motion inline, then the page code, with the tape baked in
html = html.replace(
  '<script type="module">\nimport * as M from "./motion.js";',
  `<script type="module">
const __MOTION_SRC = ${JSON.stringify(motionBundle)};
const __MOTION_URL__ = URL.createObjectURL(new Blob([__MOTION_SRC], { type: "text/javascript" }));
${motionSrc}
const M = { ${EXPORTS.join(", ")}, prefersReducedMotion };
// a demo carries its own tape instead of reading one from the address bar
window.TapeCodec.fromLocation = () => window.TapeCodec.decode(${JSON.stringify(FRAGMENT)});`
);

html = html.replace("<title>A tape for you</title>", `<title>${TAPE.title}</title>`);

// strip the doctype/head/body wrapper — the artifact host supplies its own
const inner = html
  .replace(/^[\s\S]*?<head>/, "")
  .replace(/<\/head>\s*<body>/, "")
  .replace(/<\/body>\s*<\/html>\s*$/, "");

fs.mkdirSync(path.join(ROOT, "dist"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "dist", "tape-demo.html"), inner);

const kb = (fs.statSync(path.join(ROOT, "dist", "tape-demo.html")).size / 1024).toFixed(0);
console.log(`dist/tape-demo.html  ${kb}KB`);
console.log(`fragment: ${FRAGMENT.length} chars, ${TAPE.songs.length} songs`);
