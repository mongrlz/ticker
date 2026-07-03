// TxLINE API client — auth, REST fetchers, SSE streams with reconnect.
// Schema notes: real payloads are PascalCase (see docs/txline-findings.md §7).
import fs from "node:fs";

export class TxLineClient {
  constructor({ base, jwt, apiToken }) {
    this.base = base;
    this.jwt = jwt;
    this.apiToken = apiToken;
  }

  static fromTokenFile(path) {
    const t = JSON.parse(fs.readFileSync(path, "utf8"));
    return new TxLineClient({ base: t.base, jwt: t.jwt, apiToken: typeof t.apiToken === "string" ? t.apiToken : JSON.stringify(t.apiToken) });
  }

  headers(extra = {}) {
    return { Authorization: `Bearer ${this.jwt}`, "X-Api-Token": this.apiToken, ...extra };
  }

  // Session JWTs expire; the long-lived apiToken persists. Refresh the JWT and retry once on 401.
  async refreshJwt() {
    const res = await fetch(`${this.base}/auth/guest/start`, { method: "POST" });
    if (!res.ok) throw new Error(`guest/start -> HTTP ${res.status}`);
    this.jwt = (await res.json()).token;
    return this.jwt;
  }

  async #get(path) {
    let res = await fetch(this.base + path, { headers: this.headers() });
    if (res.status === 401) {
      await this.refreshJwt();
      res = await fetch(this.base + path, { headers: this.headers() });
    }
    if (!res.ok) throw new Error(`GET ${path} -> HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return res;
  }

  async fixtures() {
    return (await this.#get("/api/fixtures/snapshot")).json();
  }

  async scoresSnapshot(fixtureId) {
    return (await this.#get(`/api/scores/snapshot/${fixtureId}`)).json();
  }

  // Full sequence for a fixture as raw SSE-format text (works for finished matches).
  async scoresUpdatesText(fixtureId) {
    return (await this.#get(`/api/scores/updates/${fixtureId}`)).text();
  }

  async oddsSnapshot(fixtureId) {
    return (await this.#get(`/api/odds/snapshot/${fixtureId}`)).json();
  }

  async statValidation({ fixtureId, seq, statKey, statKey2 }) {
    const q = new URLSearchParams({ fixtureId, seq, statKey });
    if (statKey2 !== undefined) q.set("statKey2", statKey2);
    return (await this.#get(`/api/scores/stat-validation?${q}`)).json();
  }

  // SSE stream as an async generator of {id, event, data:<parsed json>}.
  // Reconnects with Last-Event-ID until `signal` aborts.
  async *stream(path, { fixtureId, signal } = {}) {
    const url = new URL(this.base + path);
    if (fixtureId) url.searchParams.set("fixtureId", fixtureId);
    let lastEventId;
    let backoff = 1000;
    while (!signal?.aborted) {
      try {
        const res = await fetch(url, {
          headers: this.headers(lastEventId ? { "Last-Event-ID": lastEventId } : {}),
          signal,
        });
        if (res.status === 401) { await this.refreshJwt(); continue; }
        if (!res.ok) throw new Error(`stream ${path} -> HTTP ${res.status}`);
        backoff = 1000;
        for await (const record of parseSSE(res.body)) {
          if (record.id) lastEventId = record.id;
          yield record;
        }
      } catch (e) {
        if (signal?.aborted || e.name === "AbortError") return;
        await new Promise((r) => setTimeout(r, backoff));
        backoff = Math.min(backoff * 2, 15_000);
      }
    }
  }

  scoresStream(opts) { return this.stream("/api/scores/stream", opts); }
  oddsStream(opts) { return this.stream("/api/odds/stream", opts); }
}

// Incremental SSE parser: yields {id, event, data} per blank-line-terminated block.
export async function* parseSSE(body) {
  const dec = new TextDecoder();
  let buf = "";
  for await (const chunk of body) {
    buf += dec.decode(chunk, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n\n")) >= 0) {
      const block = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const rec = parseSSEBlock(block);
      if (rec) yield rec;
    }
  }
}

export function parseSSEBlock(block) {
  const rec = { id: undefined, event: undefined, data: undefined };
  const dataLines = [];
  for (const line of block.split("\n")) {
    if (line.startsWith("id:")) rec.id = line.slice(3).trim();
    else if (line.startsWith("event:")) rec.event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
  }
  if (!dataLines.length) return null;
  try { rec.data = JSON.parse(dataLines.join("\n")); } catch { rec.data = dataLines.join("\n"); }
  return rec;
}
