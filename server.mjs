// Ticker dev server: static files + live TxLINE SSE relay.
// The API token stays server-side — the browser only ever talks to us.
//   GET /live?fixtureId=N     -> SSE stream of score events (plain `data:` messages)
//   GET /fixture-info?fixtureId=N -> {p1, p2, startTime, competition}
//   everything else           -> static from the TXodds root (dotfiles denied)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { TxLineClient } from "./lib/txline/index.mjs";

const ROOT = import.meta.dirname;
const PORT = 8777;
// Live mode needs a TxLINE token (see README). Replay mode works without one.
let client = null;
try { client = TxLineClient.fromTokenFile(path.join(ROOT, ".txline-token.json")); }
catch { console.warn("no .txline-token.json — live endpoints disabled, replay mode works"); }
const needClient = (res) => {
  if (client) return false;
  res.writeHead(503, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "no TxLINE token configured (replay mode only)" }));
  return true;
};

const MIME = {
  ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript",
  ".css": "text/css", ".png": "image/png", ".json": "application/json",
  ".txt": "text/plain", ".woff2": "font/woff2", ".svg": "image/svg+xml",
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === "/live") {
    if (needClient(res)) return;
    const fixtureId = url.searchParams.get("fixtureId");
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write(":connected\n\n");
    const ac = new AbortController();
    req.on("close", () => ac.abort());
    console.log(`[live] client attached (fixture ${fixtureId ?? "ALL"})`);
    try {
      for await (const rec of client.scoresStream({ fixtureId, signal: ac.signal })) {
        // strip event names so the browser's plain `onmessage` gets everything
        res.write(`data: ${JSON.stringify(rec.data)}\n\n`);
      }
    } catch { /* aborted or upstream died; reconnect handled client-side */ }
    res.end();
    return;
  }

  // devnet revive fee: a REAL on-chain transfer (0.001 devnet SOL) from the app
  // wallet to the treasury — verifiable on explorer, no browser wallet needed.
  if (url.pathname === "/revive-fee" && req.method === "POST") {
    try {
      const { createRequire } = await import("node:module");
      const require = createRequire(path.join(ROOT, "package.json"));
      const { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } = require("@solana/web3.js");
      const kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(path.join(ROOT, ".devnet-keypair.json"), "utf8"))));
      const conn = new Connection("https://api.devnet.solana.com", "confirmed");
      const TREASURY = new PublicKey("Eqqd7rZQGzn2HA9L11NwBMhknxArM3L4KETyUuujK3LB"); // txoracle token_treasury_v2 PDA
      const tx = new Transaction().add(SystemProgram.transfer({ fromPubkey: kp.publicKey, toPubkey: TREASURY, lamports: 1_000_000 }));
      const signature = await sendAndConfirmTransaction(conn, tx, [kp]);
      console.log("[revive-fee] paid:", signature);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ signature, lamports: 1_000_000 }));
    } catch (e) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(e.message) }));
    }
    return;
  }

  if (url.pathname === "/fixtures") {
    if (needClient(res)) return;
    try {
      const fixtures = await client.fixtures();
      const list = fixtures
        .map((f) => ({ fixtureId: f.FixtureId, p1: f.Participant1, p2: f.Participant2, startTime: f.StartTime, competition: f.Competition }))
        .sort((a, b) => a.startTime - b.startTime);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(list));
    } catch (e) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(e.message) }));
    }
    return;
  }

  if (url.pathname === "/fixture-info") {
    if (needClient(res)) return;
    const id = Number(url.searchParams.get("fixtureId"));
    try {
      const fixtures = await client.fixtures();
      const f = fixtures.find((x) => x.FixtureId === id);
      res.writeHead(f ? 200 : 404, { "Content-Type": "application/json" });
      res.end(JSON.stringify(f ? {
        p1: f.Participant1, p2: f.Participant2,
        startTime: f.StartTime, competition: f.Competition,
      } : { error: "fixture not found" }));
    } catch (e) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(e.message) }));
    }
    return;
  }

  // static
  let p = decodeURIComponent(url.pathname);
  if (p.endsWith("/")) p += "index.html";
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT) || file.split(path.sep).some((seg) => seg.startsWith("."))) {
    res.writeHead(403); res.end("forbidden"); return;
  }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end("not found"); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] ?? "application/octet-stream" });
    res.end(data);
  });
}).listen(PORT, () => console.log(`Ticker server -> http://localhost:${PORT}/web/`));
