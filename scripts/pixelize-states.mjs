// Convert James's high-res faux-pixel state images into true-pixel game sprites:
//   1. flood-fill white bg -> alpha (interior whites like eyes/scarf survive)
//   2. snap the wobbly AI grid to a true NxN grid by sampling each cell center
//   3. align all frames on a common canvas (centered horizontally, feet-anchored)
// Output: assets/sprites/<state>.png (+ a contact sheet for eyeballing)
import fs from "node:fs";
import path from "node:path";
import { decodePNG, encodePNG, whiteBorderToAlpha } from "./lib/png.mjs";

const IN = path.resolve(import.meta.dirname, "../assets/concepts/states");
const OUT = path.resolve(import.meta.dirname, "../assets/sprites");
fs.mkdirSync(OUT, { recursive: true });

const STATES = ["worried", "panic", "dread", "broken", "sleepy", "stitched", "euphoria"];
const GRID = 64;    // sample the source as a 64x64 cell grid
const CANVAS = 72;  // final sprite canvas (leaves headroom for sweat drops / Z)

const frames = {};
for (const state of STATES) {
  const img = whiteBorderToAlpha(decodePNG(fs.readFileSync(path.join(IN, `${state}.png`))));
  const { width: w, height: h, px } = img;

  // sample cell centers -> GRID x GRID RGBA
  const g = Buffer.alloc(GRID * GRID * 4);
  for (let j = 0; j < GRID; j++) {
    for (let i = 0; i < GRID; i++) {
      const sx = Math.min(w - 1, Math.round((i + 0.5) * w / GRID));
      const sy = Math.min(h - 1, Math.round((j + 0.5) * h / GRID));
      const so = (sy * w + sx) * 4, go = (j * GRID + i) * 4;
      // sample a 3x3 neighborhood and take the most opaque, most saturated vote
      // (dodges anti-aliased cell borders)
      let best = so, bestScore = -1;
      for (let dy = -2; dy <= 2; dy += 2) for (let dx = -2; dx <= 2; dx += 2) {
        const x = Math.max(0, Math.min(w - 1, sx + dx)), y = Math.max(0, Math.min(h - 1, sy + dy));
        const o = (y * w + x) * 4;
        const alpha = px[o + 3];
        const mx = Math.max(px[o], px[o + 1], px[o + 2]), mn = Math.min(px[o], px[o + 1], px[o + 2]);
        const score = alpha === 0 ? -2 : (mx - mn) + (255 - mx < 40 ? 0 : 20); // prefer saturated/dark over AA gray
        if (score > bestScore) { bestScore = score; best = o; }
      }
      px.copy(g, go, best, best + 4);
      if (g[go + 3] < 128) g[go + 3] = 0; else g[go + 3] = 255; // binary alpha
    }
  }

  // halo erosion: kill bright low-saturation pixels touching transparency
  // (the white AA fringe) — 3 passes; spares saturated pixels (sweat drops)
  // and interior whites (eyes/scarf are sealed behind the black outline).
  for (let pass = 0; pass < 3; pass++) {
    const kill = [];
    for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) {
      const o = (j * GRID + i) * 4;
      if (!g[o + 3]) continue;
      const nbrs = [[i+1,j],[i-1,j],[i,j+1],[i,j-1]];
      const touchesVoid = nbrs.some(([x,y]) => x<0||y<0||x>=GRID||y>=GRID||!g[(y*GRID+x)*4+3]);
      if (!touchesVoid) continue;
      const mx = Math.max(g[o],g[o+1],g[o+2]), mn = Math.min(g[o],g[o+1],g[o+2]);
      if (mx > 195 && mx - mn < 50) kill.push(o);
    }
    for (const o of kill) g[o + 3] = 0;
    if (!kill.length) break;
  }

  // bbox of opaque pixels
  let x0 = GRID, x1 = -1, y0 = GRID, y1 = -1;
  for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) {
    if (g[(j * GRID + i) * 4 + 3]) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; }
  }
  frames[state] = { g, x0, x1, y0, y1 };
  console.log(`${state.padEnd(9)} bbox ${x1 - x0 + 1}x${y1 - y0 + 1} (y ${y0}..${y1})`);
}

// common feet line: max y1 across body states (sleepy Z / sweat drops extend up, not down)
const feetY = Math.max(...Object.values(frames).map((f) => f.y1));
const outFiles = [];
for (const state of STATES) {
  const { g, x0, x1, y0, y1 } = frames[state];
  const bw = x1 - x0 + 1;
  const cx = Math.floor((CANVAS - bw) / 2);
  const cy = CANVAS - 4 - (feetY - y0) - 1; // anchor feet to common baseline, 4px bottom margin
  const out = Buffer.alloc(CANVAS * CANVAS * 4);
  for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) {
    const src = (j * GRID + i) * 4;
    const dx = cx + (i - x0), dy = cy + (j - y0);
    if (dx < 0 || dy < 0 || dx >= CANVAS || dy >= CANVAS) continue;
    g.copy(out, (dy * CANVAS + dx) * 4, src, src + 4);
  }
  const file = path.join(OUT, `${state}.png`);
  fs.writeFileSync(file, encodePNG(CANVAS, CANVAS, out));
  outFiles.push(file);
}

// contact sheet: all states side by side for eyeballing
const SHEET_W = CANVAS * STATES.length, sheet = Buffer.alloc(SHEET_W * CANVAS * 4);
STATES.forEach((state, k) => {
  const img = decodePNG(fs.readFileSync(path.join(OUT, `${state}.png`)));
  for (let j = 0; j < CANVAS; j++) for (let i = 0; i < CANVAS; i++) {
    img.px.copy(sheet, (j * SHEET_W + k * CANVAS + i) * 4, (j * CANVAS + i) * 4, (j * CANVAS + i) * 4 + 4);
  }
});
fs.writeFileSync(path.join(OUT, "_sheet.png"), encodePNG(SHEET_W, CANVAS, sheet));
console.log(`\nwrote ${outFiles.length} sprites + _sheet.png -> assets/sprites/ (${CANVAS}x${CANVAS} true pixels)`);
