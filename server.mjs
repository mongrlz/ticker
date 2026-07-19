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
const SOLANA_RPC = "https://api.devnet.solana.com";
const REVIVE_LAMPORTS = 1_000_000;
const REVIVE_TREASURY = "Eqqd7rZQGzn2HA9L11NwBMhknxArM3L4KETyUuujK3LB";
// Live mode needs a TxLINE token (see README). Replay mode works without one.
let client = null;
if (process.env.TXLINE_BASE && process.env.TXLINE_JWT && process.env.TXLINE_API_TOKEN) {
  client = new TxLineClient({
    base: process.env.TXLINE_BASE,
    jwt: process.env.TXLINE_JWT,
    apiToken: process.env.TXLINE_API_TOKEN,
  });
} else {
  try { client = TxLineClient.fromTokenFile(path.join(ROOT, ".txline-token.json")); }
  catch { console.warn("no TxLINE environment variables or .txline-token.json — live endpoints disabled, replay mode works"); }
}
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

  if (url.pathname === "/wallet-config") {
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify({
      network: "devnet",
      rpc: SOLANA_RPC,
      treasury: REVIVE_TREASURY,
      reviveLamports: REVIVE_LAMPORTS,
    }));
    return;
  }

  // The browser wallet signs and sends the revive transaction. The server only
  // verifies that the confirmed devnet transfer paid the expected treasury.
  if (url.pathname === "/revive-fee" && req.method === "POST") {
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const { signature, wallet } = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
      if (!signature || !wallet) throw new Error("signature and wallet are required");

      const { Connection } = await import("@solana/web3.js");
      const conn = new Connection(SOLANA_RPC, "confirmed");
      const tx = await conn.getParsedTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
      if (!tx || tx.meta?.err) throw new Error("transaction is not confirmed");
      const paid = tx.transaction.message.instructions.some((ix) => {
        const info = ix?.parsed?.info;
        return ix?.parsed?.type === "transfer"
          && info?.source === wallet
          && info?.destination === REVIVE_TREASURY
          && Number(info?.lamports) === REVIVE_LAMPORTS;
      });
      if (!paid) throw new Error("revive transfer does not match the required payment");

      console.log("[revive-fee] verified:", signature);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ verified: true, signature, lamports: REVIVE_LAMPORTS }));
    } catch (e) {
      res.writeHead(400, { "Content-Type": "application/json" });
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
