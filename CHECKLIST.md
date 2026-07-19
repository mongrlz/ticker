# TICKER — Track 3 Checklist (2026-07-03)
Status: **game feature-complete (~88%)** · gameplay FEATURE-FREEZE in effect —
remaining work is submission plumbing + polish only. Final touches reserved for
the last 5–10 days per plan.

## ✅ DONE — the game
- [x] Core loop: boot → pick match → pick side → play → full time
- [x] Care verbs: CALM (15s cooldown, anti-spam) + REVIVE (real devnet fee tx)
- [x] Stakes: goals-against faint · cardiac overload (unattended redline = death)
- [x] Character: 7 states, real frame animation, Tamagotchi 2-frame motion rule
- [x] Team-color scarf system (both stripe colors, runtime palette swap, current
      TxLINE fixture countries plus a neutral fallback)
- [x] Device: photoreal shell, translucent glass screen, clickable A/B/speaker buttons
- [x] LCD authenticity: pixel font, hard-step animations, quantized block EKG w/ wipe,
      pixel icons (no emojis), scanlines, VAR freeze, GAME OVER arcade ending
- [x] Audio: BPM-synced heartbeat (silent on flatline), goal/heartbreak/calm/button synth
- [x] Live mode: SSE relay (token server-side), real fixtures, match chips, boot menu
- [x] Replay mode: real captured match ships in repo, works with zero credentials
- [x] Full-time report card: portrait, score, HR sparkline, peak BPM / time-in-danger /
      heartbreaks / revives, fate line, #TICKER
- [x] Repo: github.com/mongrlz/ticker (private until submission)

## 🔲 REMAINING — submission checklist
- [x] **Wallet sign-in (RULES ITEM)** — Phantom/Solflare connection, connected
      address in the wallet control, player-signed devnet revive, server proof verification.
- [ ] **Deploy to public URL** — James's Hetzner VPS. Node server + env secrets
      (TXLINE_BASE, TXLINE_JWT, TXLINE_API_TOKEN), domain/port, keep-alive. (~0.5d)
- [ ] **Demo video ≤5 min** — THE screening gate. Script → screen capture (replay +
      live if a match cooperates) → HyperFrames wrap. (~1–2d, near deadline is fine)
- [ ] **Share/save button** on report card (copyable report is done; add PNG download). (small)
- [x] **Mobile pass** — responsive single-column broadcast layout, horizontal fixture rail,
      no horizontal page overflow.
- [x] **Tech doc** — README includes local/hosted configuration, app endpoints,
      TxLINE inputs, wallet signing, and proof verification.
- [ ] **API feedback section** — package the friction log from docs/txline-findings.md. (small)
- [ ] Flip repo public + submit on Superteam Earn.

## 🧼 Polish backlog (optional, last 5–10 days only)
- [ ] Flatline EKG draws through the PRESS A prompt (lift prompt / dim trace behind text)
- [ ] "Survived but lost" grief ending (don't celebrate a 3-2 loss survival)
- [ ] State-flap hysteresis during heavy danger stretches
- [ ] Streak persistence (localStorage) + streak row on report card
- [ ] Boot screen idle animation ("insert coin" energy)
- [ ] Second skin (green-scarf Softie) as customization demo
- [ ] OG Game Boy monochrome mode
