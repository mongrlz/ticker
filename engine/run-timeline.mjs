// Text-mode Ticker: replay a captured match through the engine and print the
// heart's story. Usage: node engine/run-timeline.mjs <match.sse.txt> [--team 1|2]
import path from "node:path";
import { loadMatchFile } from "../lib/txline/replay.mjs";
import { TickerEngine } from "./ticker-engine.mjs";

const file = process.argv[2] ?? path.resolve(import.meta.dirname, "../docs/sample-match-18179550.sse.txt");
const team = Number(process.argv.includes("--team") ? process.argv[process.argv.indexOf("--team") + 1] : 1);

const events = loadMatchFile(file);
const kickoff = events.find((e) => e.action === "kickoff")?.ts ?? events[0].ts;
const engine = new TickerEngine({ team });

const STATE_FACE = {
  idle: "❤️ ", nervous: "💓 ", panic: "💥 ", hype: "🔥 ", dread: "🫀⏸",
  fainted: "💔 ", euphoria: "🎆 ", sleepy: "😴 ",
};

for (const ev of events) engine.update(ev);

console.log(`\nTICKER — match ${events[0].fixtureId}, supporting participant ${team}`);
console.log("─".repeat(64));
for (const entry of engine.log) {
  const min = entry.ts ? Math.max(0, Math.round((entry.ts - kickoff) / 60_000)) : "—";
  console.log(`${String(min).padStart(3)}' ${STATE_FACE[entry.state] ?? "  "} ${entry.state.toUpperCase().padEnd(9)} ${entry.note ?? ""}`);
}
const final = engine.snapshot();
console.log("─".repeat(64));
console.log(`final: ${final.state} | HR ${final.heartRate} | heartbreaks ${final.heartbreaks} | revives ${final.revives}`);
