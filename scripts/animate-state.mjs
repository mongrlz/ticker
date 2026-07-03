// Animate a Ticker state sprite via PixelLab animate-with-text-v3.
// Usage: node scripts/animate-state.mjs <state> "<action text>" [frameCount]
// Reads assets/sprites/<state>.png, writes assets/sprites/anim/<state>/<n>.png
import fs from "node:fs";
import path from "node:path";

const [state, action, frameCountArg] = process.argv.slice(2);
if (!state || !action) { console.error('usage: node scripts/animate-state.mjs <state> "<action>" [frames]'); process.exit(1); }
const frameCount = Number(frameCountArg ?? 4);

const ROOT = path.resolve(import.meta.dirname, "..");
const envText = fs.readFileSync(path.resolve(ROOT, ".env"), "utf8");
const KEY = envText.match(/PIXELLAB_API_KEY=(\S+)/)?.[1];
if (!KEY) { console.error("no PIXELLAB_API_KEY in TXodds/.env"); process.exit(1); }

const spritePath = path.join(ROOT, "assets/sprites", `${state}.png`);
const b64 = fs.readFileSync(spritePath).toString("base64");
const API = "https://api.pixellab.ai/v2";
const H = { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

console.log(`animating '${state}' — "${action}" (${frameCount} frames)…`);
const res = await fetch(`${API}/animate-with-text-v3`, {
  method: "POST",
  headers: H,
  body: JSON.stringify({
    first_frame: { type: "base64", base64: b64, format: "png" },
    action,
    frame_count: frameCount,
    no_background: true,
  }),
});
const body = await res.json();
if (!res.ok) { console.error("request failed:", res.status, JSON.stringify(body).slice(0, 500)); process.exit(1); }
const jobId = body.background_job_id ?? body.job_id ?? body.id;
console.log("job:", jobId);

let job;
for (let i = 0; i < 90; i++) {
  await new Promise((r) => setTimeout(r, 4000));
  job = await (await fetch(`${API}/background-jobs/${jobId}`, { headers: H })).json();
  process.stdout.write(`\r  status: ${job.status}${" ".repeat(12)}`);
  if (job.status === "completed" || job.status === "failed") break;
}
console.log();
if (job.status !== "completed") { console.error("job did not complete:", JSON.stringify(job).slice(0, 500)); process.exit(1); }

const images = job.last_response?.images ?? job.last_response?.frames ?? [];
if (!images.length) { console.error("no images in response:", JSON.stringify(job.last_response ?? job).slice(0, 400)); process.exit(1); }
const outDir = path.join(ROOT, "assets/sprites/anim", state);
fs.mkdirSync(outDir, { recursive: true });
images.forEach((img, i) => {
  const data = img.base64 ?? img;
  fs.writeFileSync(path.join(outDir, `${i}.png`), Buffer.from(data, "base64"));
});
console.log(`saved ${images.length} frames -> assets/sprites/anim/${state}/`);
if (job.last_response?.usage) console.log("usage:", JSON.stringify(job.last_response.usage));
