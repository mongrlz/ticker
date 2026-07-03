// One-off: remove the white studio background from shell-original.png (flood
// fill from borders so interior highlights survive), save shell.png (RGBA),
// and detect the dark LCD rectangle -> prints overlay coordinates as %.
// Zero dependencies: minimal PNG decode/encode over node:zlib.
import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";

const DIR = path.resolve(import.meta.dirname, "../assets");
const src = path.join(DIR, "shell-original.png");
const out = path.join(DIR, "shell.png");

// ---------- minimal PNG decode ----------
const buf = fs.readFileSync(src);
if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("not a PNG");
let pos = 8, width, height, bitDepth, colorType, interlace, idat = [];
while (pos < buf.length) {
  const len = buf.readUInt32BE(pos);
  const type = buf.toString("ascii", pos + 4, pos + 8);
  const data = buf.subarray(pos + 8, pos + 8 + len);
  if (type === "IHDR") {
    width = data.readUInt32BE(0); height = data.readUInt32BE(4);
    bitDepth = data[8]; colorType = data[9]; interlace = data[12];
  } else if (type === "IDAT") idat.push(data);
  else if (type === "IEND") break;
  pos += 12 + len;
}
if (bitDepth !== 8 || interlace !== 0 || ![2, 6].includes(colorType))
  throw new Error(`unsupported PNG variant (bitDepth=${bitDepth} colorType=${colorType} interlace=${interlace})`);
const chIn = colorType === 6 ? 4 : 3;
const raw = zlib.inflateSync(Buffer.concat(idat));
const stride = width * chIn;
const px = Buffer.alloc(width * height * 4); // RGBA out

// unfilter
const prev = Buffer.alloc(stride);
for (let y = 0; y < height; y++) {
  const f = raw[y * (stride + 1)];
  const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
  for (let i = 0; i < stride; i++) {
    const a = i >= chIn ? row[i - chIn] : 0;
    const b = prev[i];
    const c = i >= chIn ? prev[i - chIn] : 0;
    let v = row[i];
    if (f === 1) v = (v + a) & 255;
    else if (f === 2) v = (v + b) & 255;
    else if (f === 3) v = (v + ((a + b) >> 1)) & 255;
    else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255; }
    row[i] = v;
  }
  row.copy(prev);
  for (let x = 0; x < width; x++) {
    const o = (y * width + x) * 4, i = x * chIn;
    px[o] = row[i]; px[o + 1] = row[i + 1]; px[o + 2] = row[i + 2];
    px[o + 3] = chIn === 4 ? row[i + 3] : 255;
  }
}

// ---------- flood fill near-white from borders -> alpha 0 ----------
const isWhite = (o) => px[o] >= 232 && px[o + 1] >= 232 && px[o + 2] >= 232;
const seen = new Uint8Array(width * height);
const stack = [];
for (let x = 0; x < width; x++) { stack.push(x, 0, x, height - 1); }
for (let y = 0; y < height; y++) { stack.push(0, y, width - 1, y); }
while (stack.length) {
  const y = stack.pop(), x = stack.pop();
  const idx = y * width + x;
  if (x < 0 || y < 0 || x >= width || y >= height || seen[idx]) continue;
  seen[idx] = 1;
  const o = idx * 4;
  if (!isWhite(o)) continue;
  px[o + 3] = 0;
  stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
}
// feather: edge pixels adjacent to removed ones get partial alpha by brightness
for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
  const o = (y * width + x) * 4;
  if (px[o + 3] === 0) continue;
  const nbrClear = [o - 4, o + 4, o - width * 4, o + width * 4].some((n) => px[n + 3] === 0);
  if (nbrClear) {
    const bright = (px[o] + px[o + 1] + px[o + 2]) / 3;
    if (bright > 200) px[o + 3] = Math.max(0, Math.min(255, Math.round((232 - bright) * 6 + 200)));
  }
}

// ---------- detect the dark LCD rectangle ----------
// LCD pixels: dark, low-saturation gray-green. Search central region.
let sx0 = width, sx1 = 0, sy0 = height, sy1 = 0, count = 0;
for (let y = Math.floor(height * 0.08); y < height * 0.75; y++) {
  for (let x = Math.floor(width * 0.2); x < width * 0.8; x++) {
    const o = (y * width + x) * 4;
    const r = px[o], g = px[o + 1], b = px[o + 2];
    const maxc = Math.max(r, g, b), minc = Math.min(r, g, b);
    if (maxc < 110 && maxc - minc < 28 && px[o + 3] > 0) {
      count++;
      if (x < sx0) sx0 = x; if (x > sx1) sx1 = x;
      if (y < sy0) sy0 = y; if (y > sy1) sy1 = y;
    }
  }
}

// ---------- encode RGBA PNG ----------
const CRC_TABLE = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
const crc32 = (b) => { let c = -1; for (const v of b) c = CRC_TABLE[(c ^ v) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
const rawOut = Buffer.alloc(height * (width * 4 + 1));
for (let y = 0; y < height; y++) {
  rawOut[y * (width * 4 + 1)] = 0; // filter none
  px.copy(rawOut, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
}
fs.writeFileSync(out, Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", zlib.deflateSync(rawOut, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]));

const pct = (v, total) => +(100 * v / total).toFixed(2);
console.log("saved:", out);
console.log("image:", width + "x" + height);
console.log("LCD detect:", count, "px in bbox", { x0: sx0, y0: sy0, x1: sx1, y1: sy1 });
console.log("LCD as % of image:", JSON.stringify({
  left: pct(sx0, width), top: pct(sy0, height),
  width: pct(sx1 - sx0, width), height: pct(sy1 - sy0, height),
}));
