*Fable 5 Animation Prompt*

## Overview
A 13.2-second pixel-art animation on a 1080×1080 canvas showing a salmon-pink quadruped character climbing a dotted halftone ladder to place letters spelling "FABLE 5" on a "NOW SHOWING" marquee sign, triggering a warm illumination, then jumping down and exiting right.

## Trigger
Load (autoplay on mount, no user interaction required)

## Elements

**Background Canvas**
- Selector: `.stage`
- Size: 1080px × 1080px
- Color: `#161616` (near-black with slight warmth)
- Position: relative, overflow hidden
- Contains all other elements

**Ladder**
- Selector: `.ladder`
- Size: 420px wide × 520px tall
- Position: absolute, bottom: 80px, left: 50%, transform: translateX(-50%)
- Visual: Dotted halftone pattern using `radial-gradient(circle, #4a4a4a 1.2px, transparent 1.2px)` with 6px spacing
- Pattern density: ~18 dots per inch visually
- Shape: A-frame ladder with 5 visible rungs, slightly tapered top
- No animation except subtle `background-position` drift (see Micro-details)

**Marquee Sign Frame**
- Selector: `.sign-frame`
- Size: 640px × 280px
- Position: absolute, top: 120px, left: 50%, transform: translateX(-50%)
- Border: 3px dotted pattern matching ladder, border-radius: 24px
- Internal area: transparent (shows background through)
- Two horizontal "light bar" extensions on right side: 180px × 40px each, positioned at y+60 and y+160 from frame top, same dotted pattern

**"NOW SHOWING" Label**
- Selector: `.sign-label`
- Size: 280px × 56px
- Position: absolute, top: 88px, left: 50%, transform: translateX(-50%)
- Background: `#161616` (matches stage)
- Border: 2px dotted #5a5a5a, border-radius: 16px
- Text: "NOW SHOWING", uppercase, 24px, `font-family: 'Courier New', monospace` or pixel font
- Color: `#8a8a8a` (dim gray, low contrast)
- Letter-spacing: 4px
- Text-align: center, line-height: 56px

**Marquee Display Board**
- Selector: `.sign-board`
- Size: 560px × 140px
- Position: absolute, top: 200px, left: 50%, transform: translateX(-50%)
- Background: transparent initially
- Border-radius: 8px
- Initial opacity: 0.15 (barely visible)

**Character (Pixel Quadruped)**
- Selector: `.character`
- Size: 80px × 60px body + 20px × 20px head offset
- Built from CSS box-shadow pixel art or single SVG/PNG sprite
- Colors:
- Primary fill: `#e07a65` (salmon/coral)
- Darker shade: `#c96a55` (for right-facing depth)
- Darkest: `#a85a48` (shadow/depth pixels)
- Structure: 4 legs (8px wide, 20px tall), rectangular body (80×40), small head (40×32) with two 8×8 black square eyes, stub tail (16×12)
- Initial position: left edge, bottom: 80px (ground level with ladder base)

**Letters "F", "A", "B", "L", "E"**
- Selector: `.letter` with data-letter attribute
- Size: 64px × 80px each
- Font: Bold monospace/pixel, 72px
- Color: `#e85d75` (pink-magenta)
- Background tile: `#2a2a2a` (dark gray square behind each letter, 72×88px with 4px padding)
- Initial position: off-screen right, top: 0

**Number "5"**
- Selector: `.number-five`
- Size: 64px × 80px
- Same styling as letters but with slight rotation on entry
- Separated from "E" by 32px space (not on same tile grid)

**Arrow Indicator**
- Selector: `.arrow-indicator`
- Size: 32px × 32px
- Position: absolute, top: 60px, right: 280px
- Visual: Dotted halftone arrow pointing right initially
- Color: #6a6a6a

---

## Animation Sequence

### Phase 1: Character Entrance (0ms – 500ms)

**Character**
```
Initial:  { transform: translateX(-120px) translateY(0); opacity: 1 }
Final:    { transform: translateX(180px) translateY(0); opacity: 1 }
Duration: 500ms
Delay:    0ms
Easing:   steps(8) /* discrete pixel-art walk */
```
- Walk cycle: 4-frame leg alternation, body bobs 2px on each step
- Ends at ladder base (x: 180px from left edge of centered stage)

### Phase 2: Ladder Climb (500ms – 2500ms)

**Character**
```
Initial:  { transform: translateX(180px) translateY(0) }
Frame 1:  { transform: translateX(190px) translateY(-80px) }   /* 600ms */
Frame 2:  { transform: translateX(170px) translateY(-160px) }  /* 900ms */
Frame 3:  { transform: translateX(200px) translateY(-240px) }  /* 1200ms */
Frame 4:  { transform: translateX(180px) translateY(-320px) }  /* 1500ms */
Frame 5:  { transform: translateX(210px) translateY(-400px) }  /* 1800ms */
Final:    { transform: translateX(200px) translateY(-440px) }  /* 2500ms, top of ladder */
Duration: 2000ms total climb
Delay:    500ms
Easing:   steps(10) /* discrete rung-by-rung movement */
```
- Horizontal wobble: ±20px simulating climbing motion
- At top: character stands on ladder peak, facing right (toward sign)

### Phase 3: Letter Placement Sequence (2500ms – 9000ms)

**Letter "F"**
```
Initial:  { transform: translateX(400px) translateY(-200px) rotate(-10deg); opacity: 0 }
Approach: { transform: translateX(-180px) translateY(0) rotate(0deg); opacity: 1 } /* arrives ~2500ms */
Settle:   { transform: translateX(-180px) translateY(0) scale(1.05); opacity: 1 } /* 2800ms */
Final:    { transform: translateX(-180px) translateY(0) scale(1.0); opacity: 1 }   /* 3000ms */
Duration: 800ms flight + 200ms settle
Delay:    0ms (from 2500ms base)
Easing:   cubic-bezier(0.25, 0.1, 0.25, 1.0) for flight, cubic-bezier(0.34, 1.56, 0.64, 1) for settle
```

**Letter "A"**
```
Initial:  { transform: translateX(400px) translateY(-200px) rotate(-10deg); opacity: 0 }
Final:    { transform: translateX(-100px) translateY(0) scale(1.0); opacity: 1 }
Duration: 800ms flight + 200ms settle
Delay:    800ms (arrives ~3300ms, settles ~3500ms)
Easing:   same as "F"
```

**Letter "B"**
```
Final position: translateX(-20px)
Delay: 1600ms (arrives ~4100ms, settles ~4300ms)
```

**Letter "L"**
```
Final position: translateX(60px)
Delay: 2400ms (arrives ~4900ms, settles ~5100ms)
```

**Letter "E"**
```
Final position: translateX(140px)
Delay: 3200ms (arrives ~5700ms, settles ~5900ms)
```

**Number "5"**
```
Initial:  { transform: translateX(400px) translateY(-300px) rotate(-25deg); opacity: 0 }
Approach: { transform: translateX(260px) translateY(0) rotate(5deg); opacity: 1 }
Settle:   { transform: translateX(260px) translateY(0) rotate(0deg) scale(1.08); opacity: 1 }
Final:    { transform: translateX(260px) translateY(0) rotate(0deg) scale(1.0); opacity: 1 }
Duration: 1000ms flight + 300ms settle
Delay:    4200ms (arrives ~6700ms, settles ~7000ms)
Easing:   cubic-bezier(0.25, 0.1, 0.25, 1.0) for flight, cubic-bezier(0.34, 1.56, 0.64, 1) for settle with more overshoot
```

**Character during letter placement**
```
At 2500ms:  { transform: translateX(200px) translateY(-440px) } /* at top */
At 3000ms:  { transform: translateX(160px) translateY(-440px) } /* nudges left for F */
At 3800ms:  { transform: translateX(120px) translateY(-440px) } /* for A */
At 4600ms:  { transform: translateX(80px) translateY(-440px) }  /* for B */
At 5400ms:  { transform: translateX(40px) translateY(-440px) }  /* for L */
At 6200ms:  { transform: translateX(0px) translateY(-440px) }   /* for E */
At 7200ms:  { transform: translateX(-40px) translateY(-440px) } /* for 5, reaches right */
```
- Character shuffles left-to-right along sign top edge, pausing briefly as each letter settles
- Small "push" gesture: character scaleX compresses to 0.9 then releases on each letter placement

**Arrow Indicator**
```
Initial:  { transform: rotate(0deg); opacity: 0 }
At 4000ms: { opacity: 1 }
At 7000ms: { transform: rotate(-45deg) } /* points up-right */
Final:    { transform: rotate(-45deg); opacity: 0 } /* fades at 9000ms */
Duration: 3000ms rotation
Easing:   steps(3) /* discrete position changes */
```

### Phase 4: Sign Illumination (9000ms – 9750ms)

**Sign Board**
```
Initial:  { opacity: 0.15; background: transparent; box-shadow: none }
At 9000ms: { opacity: 0.6; background: #f5e6c8; box-shadow: 0 0 40px 20px rgba(245, 230, 200, 0.3) }
At 9400ms: { opacity: 0.9; background: #fff8e7; box-shadow: 0 0 60px 40px rgba(255, 248, 231, 0.5), 0 0 120px 80px rgba(255, 248, 231, 0.2) }
Final:    { opacity: 0.95; background: #fff8e7; box-shadow: 0 0 80px 60px rgba(255, 248, 231, 0.6), 0 0 160px 100px rgba(255, 248, 231, 0.15), inset 0 0 40px rgba(232, 93, 117, 0.1) }
Duration: 750ms
Delay:    0ms (from 9000ms trigger)
Easing:   cubic-bezier(0.16, 1, 0.3, 1)
```

**"NOW SHOWING" Label Text**
```
Initial:  { color: #8a8a8a }
Final:    { color: #d4a574 } /* warm amber/gold */
Duration: 600ms
Delay:    0ms
Easing:   ease-out
```

**"FABLE 5" Text**
```
Initial:  { color: #e85d75; text-shadow: none; transform: scale(1.0) }
At 9200ms: { color: #ff6b8a; text-shadow: 0 0 20px rgba(232, 93, 117, 0.6); transform: scale(1.03) }
Final:    { color: #e85d75; text-shadow: 0 0 8px rgba(232, 93, 117, 0.4), 0 0 24px rgba(232, 93, 117, 0.2); transform: scale(1.0) }
Duration: 750ms total, with 200ms scale pulse at midpoint
Easing:   cubic-bezier(0.16, 1, 0.3, 1)
```

**Character at illumination trigger**
```
At 9000ms:  { transform: translateX(-40px) translateY(-440px) scaleX(1) } /* facing right */
At 9100ms:  { transform: translateX(-40px) translateY(-440px) scaleX(-1) } /* flips to face viewer */
At 9250ms:  { transform: translateX(-40px) translateY(-200px) scaleX(-1) rotate(180deg) } /* begins jump */
```

### Phase 5: Landing and Exit (9750ms – 13227ms)

**Character Landing**
```
At 9750ms:  { transform: translateX(-40px) translateY(0) scaleX(-1) scaleY(0.6) scaleX(1.3); transform-origin: bottom center } /* impact */
At 9900ms:  { transform: translateX(-40px) translateY(0) scaleX(-1) scaleY(1.1) scaleX(0.9) }
At 10000ms: { transform: translateX(-40px) translateY(0) scaleX(-1) scaleY(1.0) scaleX(1.0) }
Duration: 250ms squash, 150ms recovery
Easing:   cubic-bezier(0.68, -0.55, 0.265, 1.55) /* back-in-out */
```

**Character Walk/Exit**
```
At 10000ms: { transform: translateX(-40px) translateY(0) scaleX(1); opacity: 1 } /* turns right, begins walk */
At 10500ms: { transform: translateX(60px) translateY(0) } /* passes ladder */
At 11500ms: { transform: translateX(260px) translateY(0) }
At 12500ms: { transform: translateX(500px) translateY(0) }
At 13227ms: { transform: translateX(620px) translateY(0); opacity: 1 } /* off-screen */
Duration: 3227ms
Easing:   linear /* constant velocity */
```
- Walk cycle: 4-frame leg animation, period 400ms, body bobs 4px amplitude
- Final frame holds at off-screen position (or opacity 0 at 13227ms)

**Post-Illumination Sign Glow Pulse**
```
Continuous from 9750ms onward:
@keyframes
 glowPulse {
0%, 100% { box-shadow: 0 0 80px 60px rgba(255, 248, 231, 0.6), 0 0 160px 100px rgba(255, 248, 231, 0.15) }
50% { box-shadow: 0 0 76px 58px rgba(255, 248, 231, 0.58), 0 0 156px 98px rgba(255, 248, 231, 0.14) }
}
Duration: 500ms loop
Easing:   ease-in-out
```

---

## Stagger Pattern

Letters arrive in strict sequence with 800ms intervals (F→A→B→L→E), then 1000ms gap before "5" which has longer flight path. Character position updates track with current letter being placed, maintaining spatial relationship (character always slightly left of arriving letter).

---

## Micro-details

1. **Halftone drift**: Background dotted patterns on ladder and sign frame have `background-position` animation, 0.5px/20s drift, creating subtle Moiré shimmer
2. **Letter tile depth**: Each letter's dark gray backing tile (`#2a2a2a`) has 1px inset shadow suggesting physical letter board depth
3. **Character eye blink**: At 9100ms (facing viewer), eyes blink once—scaleY 1.0→0.1→1.0 over 100ms
4. **"5" rotation energy**: The number enters with -25° rotation versus -10° for letters, and overshoots to +5° before settling, giving it more "tossed" character
5. **Sign illumination chromatic fringe**: The glow has subtle color separation—inner ring warm white, outer ring faint pink (matching letter color), created by layered box-shadows with different rgba values
6. **Ladder rung interaction**: Character feet align to rung centers during climb; slight y-offset correction (±4px) on each rung arrival
7. **Ground plane**: Implicit at y=1000px (80px from bottom), character's shadow would appear here if rendered
8. **Frame rate mixing**: Character animation at 12fps (steps), glow effects at 60fps smooth interpolation

---

## Implementation

```css
/* === CORE STAGE === */
.stage {
width: 1080px;
height: 1080px;
position: relative;
background: #161616;
overflow: hidden;
}

/* === HALFTONE PATTERN UTILITY === */
.halftone {
background-image: radial-gradient(circle, #4a4a4a 1.2px, transparent 1.2px);
background-size: 6px 6px;
background-position: 0 0;
animation: halftoneDrift 20s linear infinite;
}

@keyframes
 halftoneDrift {
to { background-position: 0.5px 0.5px; }
}

/* === LADDER === */
.ladder {
position: absolute;
bottom: 80px;
left: 50%;
transform: translateX(-50%);
width: 420px;
height: 520px;
/* A-frame shape via clip-path or SVG mask */
clip-path: polygon(20% 100%, 35% 0%, 38% 0%, 25% 100%, 75% 100%, 62% 0%, 65% 0%, 80% 100%);
}

/* === SIGN FRAME === */
.sign-frame {
position: absolute;
top: 120px;
left: 50%;
transform: translateX(-50%);
width: 640px;
height: 280px;
border: 3px dotted transparent;
border-radius: 24px;
/* dotted border via background gradient technique or SVG */
}

.sign-label {
position: absolute;
top: 88px;
left: 50%;
transform: translateX(-50%);
width: 280px;
height: 56px;
background: #161616;
border: 2px dotted #5a5a5a;
border-radius: 16px;
color: #8a8a8a;
font-family: 'Courier New', monospace;
font-size: 24px;
letter-spacing: 4px;
text-align: center;
line-height: 56px;
transition: color 600ms ease-out;
}

.sign-board {
position: absolute;
top: 200px;
left: 50%;
transform: translateX(-50%);
width: 560px;
height: 140px;
border-radius: 8px;
opacity: 0.15;
transition: all 750ms cubic-bezier(0.16, 1, 0.3, 1);
}

.sign-board.illuminated {
opacity: 0.95;
background: #fff8e7;
box-shadow:
0 0 80px 60px rgba(255, 248, 231, 0.6),
0 0 160px 100px rgba(255, 248, 231, 0.15),
inset 0 0 40px rgba(232, 93, 117, 0.1);
}

/* === CHARACTER === */
.character {
position: absolute;
width: 80px;
height: 60px;
/* Pixel art via box-shadow or use SVG */
will-change: transform;
}

/* Character states managed via CSS classes and JS timing */
.character.facing-right { transform: scaleX(1); }
.character.facing-viewer { transform: scaleX(-1); }

/* === LETTERS === */
.letter, .number-five {
position: absolute;
width: 72px;
height: 88px;
display: flex;
align-items: center;
justify-content: center;
background: #2a2a2a;
color: #e85d75;
font-family: 'Courier New', monospace;
font-size: 72px;
font-weight: bold;
line-height: 1;
}

.marquee-text {
position: absolute;
top: 226px; /* centered in board */
left: 50%;
transform: translateX(-50%);
display: flex;
gap: 0;
width: 560px;
justify-content: center;
}

/* Letter spacing: F-A-B-L-E tight, gap before 5 */
.marquee-text .letter:nth-child(5) {
margin-right: 32px;
}

/* === ANIMATION KEYFRAMES === */
@keyframes
 letterArrive {
0% {
transform: translateX(400px) translateY(-200px) rotate(-10deg);
opacity: 0;
}
70% {
transform: translateX(var(--final-x)) translateY(0) rotate(0deg);
opacity: 1;
}
85% {
transform: translateX(var(--final-x)) translateY(0) scale(1.05);
}
100% {
transform: translateX(var(--final-x)) translateY(0) scale(1);
opacity: 1;
}
}

@keyframes
 numberFiveArrive {
0% {
transform: translateX(400px) translateY(-300px) rotate(-25deg);
opacity: 0;
}
60% {
transform: translateX(260px) translateY(0) rotate(5deg);
opacity: 1;
}
80% {
transform: translateX(260px) translateY(0) rotate(0deg) scale(1.08);
}
100% {
transform: translateX(260px) translateY(0) rotate(0deg) scale(1);
opacity: 1;
}
}

@keyframes
 glowPulse {
0%, 100% {
box-shadow:
0 0 80px 60px rgba(255, 248, 231, 0.6),
0 0 160px 100px rgba(255, 248, 231, 0.15),
inset 0 0 40px rgba(232, 93, 117, 0.1);
}
50% {
box-shadow:
0 0 76px 58px rgba(255, 248, 231, 0.58),
0 0 156px 98px rgba(255, 248, 231, 0.14),
inset 0 0 38px rgba(232, 93, 117, 0.09);
}
}

/* === ILLUMINATION STATE === */
.illuminated .sign-label {
color: #d4a574;
}

.illuminated .marquee-text {
animation: textPulse 750ms cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes
 textPulse {
0% { transform: translateX(-50%) scale(1); }
40% { transform: translateX(-50%) scale(1.03); }
100% { transform: translateX(-50%) scale(1); }
}
```

```javascript
// Animation orchestration using Web Animations API or GSAP
// Timing map (all values in ms, relative to start)

const TIMING = {
characterEnter: { start: 0, duration: 500 },
characterClimb: { start: 500, duration: 2000 },
letterF: { start: 2500, duration: 1000, finalX: -180 },
letterA: { start: 3300, duration: 1000, finalX: -100 },
letterB: { start: 4100, duration: 1000, finalX: -20 },
letterL: { start: 4900, duration: 1000, finalX: 60 },
letterE: { start: 5700, duration: 1000, finalX: 140 },
number5: { start: 6700, duration: 1300, finalX: 260 },
illumination: { start: 9000, duration: 750 },
characterJump: { start: 9000, duration: 750 },
characterLand: { start: 9750, duration: 250 },
characterExit: { start: 10000, duration: 3227 }
};

// Implementation approach:
// 1. Create all elements in initial state
// 2. Use requestAnimationFrame or GSAP timeline for precise sequencing
// 3. Character position updates interpolated between letter positions
// 4. Add 'illuminated' class to .stage or .sign-board at 9000ms
// 5. Start glowPulse animation on sign-board after illumination settles
```

---

## The Details That Matter

- [ ] **Character climb wobble**: Horizontal ±20px irregular oscillation during vertical climb, not straight line—critical for "climbing" read
- [ ] **Letter settle overshoot**: Each letter scales to 1.05 then snaps to 1.0; "5" overshoots to 1.08 with rotation swing
- [ ] **"5" separation**: 32px gap between "E" tile and "5", breaking the tight letter spacing—visually groups "FABLE" and separates "5"
- [ ] **Illumination cascade**: Board brightens first (9000ms), label text shifts to gold at same time, "FABLE 5" text gets pink glow with scale pulse at 9200ms—staggered by 200ms
- [ ] **Character flip at jump**: Must face viewer (scaleX: -1) at 9100ms, then rotate 180° during fall to land facing forward
- [ ] **Squash-and-stretch landing**: scaleY 0.6 / scaleX 1.3 at impact with transform-origin: bottom center—wrong origin breaks the physics read
- [ ] **Halftone pattern consistency**: All dotted elements use identical 6px grid, 1.2px dot size, #4a4a4a color—variation breaks cohesive aesthetic
- [ ] **Arrow indicator rotation**: Discrete 3-step rotation (right → diagonal-up → up-right) not smooth, matching pixel-art style
- [ ] **Post-illumination glow pulse**: Continuous 500ms loop at ±3% brightness variation—static glow feels dead
- [ ] **12fps character vs 60fps effects**: Character and letter movements use `steps()` or frame holds; glow/opacity use smooth interpolation—mixed frame rate is essential to source aesthetic