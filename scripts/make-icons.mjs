// Code-drawn pixel icons in the LCD ink color — no downloaded assets.
import fs from "node:fs";
import path from "node:path";
import { encodePNG } from "./lib/png.mjs";

const OUT = path.resolve(import.meta.dirname, "../assets/icons");
fs.mkdirSync(OUT, { recursive: true });

const INK = [0xea, 0xff, 0xc8, 255]; // --lcd-ink

function draw(name, rows) {
  const h = rows.length, w = rows[0].length;
  const px = Buffer.alloc(w * h * 4);
  rows.forEach((row, y) => [...row].forEach((c, x) => {
    if (c === "X") Buffer.from(INK).copy(px, (y * w + x) * 4);
  }));
  fs.writeFileSync(path.join(OUT, `${name}.png`), encodePNG(w, h, px));
  console.log(name, `${w}x${h}`);
}

// broken heart with a jagged crack down the middle
draw("broken", [
  ".XXXX...XXXX.",
  "XXXXXX.XXXXXX",
  "XXXXX.XXXXXXX",
  "XXXXXX.XXXXXX",
  "XXXXX.XXXXXXX",
  ".XXXX.XXXXXX.",
  ".XXXXX.XXXXX.",
  "..XXX.XXXXX..",
  "...XX.XXXX...",
  "....X.XXX....",
  ".....XXX.....",
  "......X......",
]);

// whole heart (for streaks / survived states later)
draw("heart", [
  ".XXXX..XXXX.",
  "XXXXXXXXXXXX",
  "XXXXXXXXXXXX",
  "XXXXXXXXXXXX",
  ".XXXXXXXXXX.",
  "..XXXXXXXX..",
  "...XXXXXX...",
  "....XXXX....",
  ".....XX.....",
]);
