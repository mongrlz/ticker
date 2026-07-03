# TICKER 🫀

**A Tamagotchi that lives and dies by your team's World Cup match.**

Your team plays. Your heart takes the damage. Don't let it break.

Ticker is a virtual pet whose heartbeat is wired to a live football match via
[TxLINE](https://txline.txodds.com)'s real-time data feed. Danger on the pitch makes it
panic. Goals against you flatline it. Your job — the whole game — is to keep it alive:
**CALM** it when its heart redlines, **REVIVE** it (a real devnet transaction) when it
breaks. Full time hands you a report card: peak BPM, time in danger, heartbreaks, revives.

Every state is real frame-animated pixel art inside a photoreal heart-shaped handheld.
The scarf dyes itself to your team's colors. The VAR review freezes its heart mid-beat.

> ⚠️ Hackathon work-in-progress (Superteam × TxODDS World Cup hackathon, Consumer & Fan track).

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
resulting `{base, jwt, apiToken}` as `.txline-token.json` in the repo root, and a devnet
keypair as `.devnet-keypair.json` for the revive-fee transactions.

## TxLINE endpoints used

- `GET /api/scores/stream` — live per-action SSE feed (goals, cards, corners, danger states)
- `GET /api/scores/updates/{fixtureId}` — full match sequences (replay/demo)
- `GET /api/fixtures/snapshot` — match schedule (the match picker)
- On-chain: devnet SOL transfer per revive (Solana devnet)

## How it works

`lib/txline/` — TxLINE adapter (SSE client w/ reconnect, event normalizer, replay driver)
`engine/` — Ticker's brain: match events → heart state machine (8 states, cardiac
overload, calm cooldown, revive) · `web/` — the device: one page, zero build step ·
`scripts/` — art pipeline (AI concept → true-pixel sprites → PixelLab frame animation)
