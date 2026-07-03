# Ticker animation plan (2026-07-02) — James's directive: REAL moving pixels
Reference spec saved by James: assets/concepts/fableaniprompt.md (Fable 5 promo, animspec-style).

## Design rule
- INSIDE the LCD: frame-based pixel animation (2–4 frames/state, chunky, authentic Tamagotchi).
- OUTSIDE the LCD (page/share-card/promo): smooth SVG+GSAP allowed (Codrops Fable-mascot technique).
- Scarf stays a tintable layer (team colors from feed) in both worlds.

## Pipeline (PixelLab API v2 — James approved spending the 40-gen trial)
POST /v2/animate-with-text-v3 { first_frame(base64), action, frame_count:4, no_background:true }
-> background_job_id -> poll /v2/background-jobs/{id} (2-5s) -> last_response.images[]
Limits: ≤256px, w*h*frames ≤ 524288. 4 frames = idle loops; 8 = walk-class moves.
Script: scripts/animate-state.mjs <state> "<action>" [frames]
Frames land in assets/sprites/anim/<state>/<n>.png; web cycles them at beat rate.

## Target animation set (priority order)
1. worried idle — breathing loop (pilot)
2. panic — trembling/shaking loop
3. sleepy — slow nodding loop
4. euphoria — bouncing celebration
5. dread — near-still with tiny quiver (stillness IS the drama; maybe skip)
6. broken — crack settling / tiny smoke puff (single dramatic transition)
7. stitched idle — breathing (reuse worried motion timing)

## Later (post-hackathon / marketing)
- SVG rig + GSAP Ticker for landing page & share cards (Codrops article technique;
  timing-map spec format like fableaniprompt.md; 12fps steps() for character,
  60fps for glow — mixed frame rate is the authentic look).
- Claude Design (claude.ai/design) Animation template for demo-video intro cards.
