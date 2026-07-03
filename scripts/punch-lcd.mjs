// Punch the LCD interior out of shell.png (alpha 0, rounded corners, feathered
// edge) so the live screen layer shows through the device. Reads/writes our own
// filter-0 RGBA encoding from cut-shell.mjs.
import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";

const file = path.resolve(import.meta.dirname, "../assets/shell.png");
const b = fs.readFileSync(file);
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

// "Sandwich" approach (James): keep the photo's real LCD glass — corners,
// frame, reflection all genuine — but make the glass INTERIOR translucent so
// the live screen glows through it like a backlit LCD. No hole, no seams.
const X0 = 493, Y0 = 241, X1 = 1036, Y1 = 641, R = 26, FEATHER = 2.5;
const GLASS_ALPHA = 92; // 0=open hole, 255=opaque; ~36% glass tint
function sdRoundRect(x, y) { // signed distance to rounded-rect edge (<0 inside)
  const cx = Math.max(X0 + R - x, 0, x - (X1 - R));
  const cy = Math.max(Y0 + R - y, 0, y - (Y1 - R));
  const inX = x >= X0 && x <= X1, inY = y >= Y0 && y <= Y1;
  if (!inX || !inY) return 1; // outside bounding box
  return Math.hypot(cx, cy) - R;
}
let punched = 0;
for (let y = Y0 - 2; y <= Y1 + 2; y++) {
  for (let x = X0 - 2; x <= X1 + 2; x++) {
    const d = sdRoundRect(x, y);
    if (d >= FEATHER) continue;
    const o = y * (w * 4 + 1) + 1 + x * 4;
    if (d < 0) { raw[o + 3] = GLASS_ALPHA; punched++; }
    else { // feather ring: blend from glass tint back to opaque
      const t = d / FEATHER;
      raw[o + 3] = Math.min(raw[o + 3], Math.round(GLASS_ALPHA + (255 - GLASS_ALPHA) * t));
    }
  }
}

// re-encode
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
fs.writeFileSync(file, Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]));
const pct = (v, t) => +(100 * v / t).toFixed(2);
console.log(`punched ${punched}px LCD hole`);
console.log("hole as %:", JSON.stringify({ left: pct(X0, w), top: pct(Y0, h), width: pct(X1 - X0, w), height: pct(Y1 - Y0, h) }));