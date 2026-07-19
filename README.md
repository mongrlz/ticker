# TICKER

**A Tamagotchi that lives and dies by your team's World Cup match.**

Your team plays. Your heart takes the damage. Don't let it break.

Ticker is a virtual pet whose heartbeat is wired to a live football match via
[TxLINE](https://txline.txodds.com)'s real-time data feed. Danger on the pitch makes it
panic. Goals against you flatline it. Your job — the whole game — is to keep it alive:
**CALM** it when its heart redlines, **REVIVE** it (a real devnet transaction) when it
breaks. Full time hands you a report card: peak BPM, time in danger, heartbreaks, revives.

Every state is real frame-animated pixel art inside a photoreal heart-shaped handheld.
The scarf dyes itself to your team's colors. The VAR review freezes its heart mid-beat.

> Hackathon work-in-progress (Superteam × TxODDS World Cup hackathon, Consumer & Fan track).

## Run it

```bash
npm install
npm start          # -> http://localhost:8777/web/
```

Works instantly in **replay mode** (a real captured World Cup match: Belgium 3–2 Senegal
AET, 1,316 events). Controls: **A** = select / calm / revive · **B** = move / speed ·
click the speaker grille to mute.

**Live mode** needs a TxLINE devnet token (free): follow the
[World Cup free tier guide](https://txline.txodds.com/documentation/worldcup), save the
resulting `{base, jwt, apiToken}` as `.txline-token.json` in the repo root.
For hosting, provide the same values as `TXLINE_BASE`, `TXLINE_JWT`, and
`TXLINE_API_TOKEN` environment variables instead of uploading the token file.

**Wallet revives** use an injected Solana wallet such as Phantom or Solflare. When Ticker
breaks, the browser asks the connected wallet to sign a 0.001 devnet SOL transfer. The
server never holds the player's key and only verifies the confirmed transfer before the
engine accepts the revive.

## TxLINE endpoints used

- `GET /api/scores/stream` — live per-action SSE feed (goals, cards, corners, danger states)
- `GET /api/scores/updates/{fixtureId}` — full match sequences (replay/demo)
- `GET /api/fixtures/snapshot` — match schedule (the match picker)
- On-chain: player-signed devnet SOL transfer per revive, verified server-side

## Application endpoints

- `GET /fixtures` — normalized TxLINE fixture list for the match desk
- `GET /fixture-info?fixtureId={id}` — selected match names, competition and kickoff
- `GET /live?fixtureId={id}` — browser-safe SSE relay; TxLINE credentials stay server-side
- `GET /wallet-config` — public devnet RPC, treasury and revive amount
- `POST /revive-fee` — verifies a confirmed player-signed transfer before revival

The browser never receives the TxLINE token or a server signing key. Replay mode works
without credentials; live mode degrades to a clear offline state when TxLINE is not
configured. The only on-chain action is initiated and approved by the connected player.

## How it works

`lib/txline/` — TxLINE adapter (SSE client w/ reconnect, event normalizer, replay driver)
`engine/` — Ticker's brain: match events → heart state machine (8 states, cardiac
overload, calm cooldown, revive) · `web/` — the device: one page, zero build step ·
`scripts/` — art pipeline (AI concept → true-pixel sprites → PixelLab frame animation)
