// Convert James's flattened punched shell (white bg + white hole, alpha 255)
// into true transparency: flood-fill near-white from image borders AND from a
// seed inside the enclosed LCD hole. Saves as shell.png. Prints hole rect %.
import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";

const DIR = path.resolve(import.meta.dirname, "../assets");
const b = fs.readFileSync(path.join(DIR, "shell-puched.png"));
let pos = 8, w, h, idat = [];
while (pos < b.length) {
  const len = b.readUInt32BE(pos);
  const t = b.toString("ascii", pos + 4, pos + 8);
  if (t === "IHDR") { w = b.readUInt32BE(pos + 8); h = b.readUInt32BE(pos + 12); }
  else if (t === "IDAT") idat.push(b.subarray(pos + 8, pos + 8 + len));
  else if (t === "IEND") break;
  pos += 12 + len;
}
const raw = zlib.inflateSync(Buffer.concat(idat));
const ch = 4, stride = w * ch, prev = Buffer.alloc(stride);
const px = Buffer.alloc(w * h * 4);
for (let y = 0; y < h; y++) {
  const f = raw[y * (stride + 1)];
  const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
  for (let i = 0; i < stride; i++) {
    const a = i >= ch ? row[i - ch] : 0, bb = prev[i], c = i >= ch ? prev[i - ch] : 0;
    let v = row[i];
    if (f === 1) v = (v + a) & 255; else if (f === 2) v = (v + bb) & 255;
    else if (f === 3) v = (v + ((a + bb) >> 1)) & 255;
    else if (f === 4) { const p = a + bb - c, pa = Math.abs(p - a), pb = Math.abs(p - bb), pc = Math.abs(p - c); v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? bb : c)) & 255; }
    row[i] = v;
  }
  row.copy(prev); row.copy(px, y * stride);
}

const isWhite = (o) => px[o] >= 230 && px[o + 1] >= 230 && px[o + 2] >= 230;
const seen = new Uint8Array(w * h);
const stack = [];
for (let x = 0; x < w; x++) stack.push(x, 0, x, h - 1);
for (let y = 0; y < h; y++) stack.push(0, y, w - 1, y);
stack.push(768, 430); // seed inside the enclosed LCD hole
while (stack.length) {
  const y = stack.pop(), x = stack.pop();
  const idx = y * w + x;
  if (x < 0 || y < 0 || x >= w || y >= h || seen[idx]) continue;
  seen[idx] = 1;
  const o = idx * 4;
  if (!isWhite(o)) continue;
  px[o + 3] = 0;
  stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
}
// feather bright edge pixels adjacent to cleared ones
for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
  const o = (y * w + x) * 4;
  if (px[o + 3] === 0) continue;
  if ([o - 4, o + 4, o - w * 4, o + w * 4].some((n) => px[n + 3] === 0)) {
    const bright = (px[o] + px[o + 1] + px[o + 2]) / 3;
    if (bright > 195) px[o + 3] = Math.max(60, Math.round(255 - (bright - 195) * 5));
  }
}

// measure the hole (transparent region NOT connected to border = around seed)
// simple: bbox of transparent pixels in the central zone
let x0 = w, x1 = 0, y0 = h, y1 = 0;
for (let y = Math.floor(h * 0.08); y < h * 0.78; y++) for (let x = Math.floor(w * 0.22); x < w * 0.78; x++) {
  if (px[(y * w + x) * 4 + 3] === 0) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
}

// encode
const CRC_TABLE = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
const crc32 = (buf) => { let c = -1; for (const v of buf) c = CRC_TABLE[(c ^ v) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
const rawOut = Buffer.alloc(h * (w * 4 + 1));
for (let y = 0; y < h; y++) { rawOut[y * (w * 4 + 1)] = 0; px.copy(rawOut, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
fs.writeFileSync(path.join(DIR, "shell.png"), Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(rawOut, { level: 9 })), chunk("IEND", Buffer.alloc(0)),
]));
const pct = (v, t) => +(100 * v / t).toFixed(2);
console.log("saved shell.png", w + "x" + h);
console.log("hole bbox:", { x0, y0, x1, y1 });
console.log("hole %:", JSON.stringify({ left: pct(x0, w), top: pct(y0, h), width: pct(x1 - x0, w), height: pct(y1 - y0, h) }));
