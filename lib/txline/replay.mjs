// Replay a captured SSE-format match file (or updates-endpoint text) through the
// same normalized-event interface as the live stream. Doubles as the demo driver.
import fs from "node:fs";
import { parseSSEBlock } from "./client.mjs";
import { normalizeEvent } from "./events.mjs";

export function parseSSEText(text) {
  const out = [];
  for (const block of text.split(/\n\n/)) {
    const rec = parseSSEBlock(block);
    if (rec && typeof rec.data === "object") out.push(rec);
  }
  return out;
}

export function loadMatchFile(path) {
  return parseSSEText(fs.readFileSync(path, "utf8"))
    .map((r) => normalizeEvent(r.data))
    .filter(Boolean);
}

// Async generator that replays events. speed=0 → as fast as possible;
// speed=1 → real time (paced by Ts deltas); speed=60 → 60x.
export async function* replay(events, { speed = 0, signal } = {}) {
  let prevTs = null;
  for (const ev of events) {
    if (signal?.aborted) return;
    if (speed > 0 && prevTs !== null && ev.ts > prevTs) {
      const wait = (ev.ts - prevTs) / speed;
      if (wait > 0) await new Promise((r) => setTimeout(r, Math.min(wait, 30_000)));
    }
    prevTs = ev.ts;
    yield ev;
  }
}
