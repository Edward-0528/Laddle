# 04 — UI / Visual / Motion Audit

Scope: visual system (tokens, type, spacing, radius, shadow, components), game screens (`src/pages/Game.tsx`, `Game.css`), motion, brand/iconography, and three candidate visual directions for the design phase. No code was modified. All contrast ratios are WCAG 2.x relative-luminance; colorblind checks use Machado 2009 (severity 1.0) simulation with CIELAB delta-E.

---

## 0. Headline findings (prioritized)

| # | Severity | Finding |
|---|----------|---------|
| 1 | Critical | **The emoji lint is a false pass on macOS.** `scripts/check-no-emoji.sh` uses `grep -P`; BSD grep lacks `-P` and `2>/dev/null` swallows the error, so it always prints "No emoji found". There are ~40 emoji in `src/` plus `index.html`: the **logo itself is an emoji** (Navbar.tsx:58, Footer.tsx:20, favicon), `🏆 ✅ ⏸ ▶ ✓` in Game.tsx (431, 488, 635, 668, 747, 838), and ~30 in Demo.tsx. |
| 2 | Critical | **Players never get a personal result.** On `GAME_QUESTION_END`, state flips straight to `reveal`, which renders the same host-style bar chart / score list / leaderboard on the phone. The `correct`/`incorrect` tile states in the player view are dead code (they need `questionResult` while still in `question`). There is no "Correct! +850 / streak 3" moment on the device in the player's hand, which is the emotional core of the genre. |
| 3 | High | **The host screen can't be read from the back of a classroom.** Content is capped at 720px wide (38% of a 1080p projector). Answer text is 16px, question text tops out at 28px, the timer number is 20px in a 64px ring, reveal labels are 12px at 45% white, and the lobby join code tops out at 48px inside a 780px white card. |
| 4 | High | **Answer tiles rely on color plus a letter only, with no shapes.** Red/blue/yellow/green collapses under CVD: protanopia red vs green delta-E 18.6, tritanopia blue vs green 15.6, deuteranopia red vs yellow 21.4. The reveal's "correct" green (#48BB78) is delta-E 10.8 from answer D's green (#38A169), so when D is wrong it still reads "correct-ish". |
| 5 | High | **No `prefers-reduced-motion` handling anywhere**, yet there are infinite pulses (`timerPulse` scale 1.2 at 2Hz, `pulse` on the reveal hint, `dot-bounce`). No dark-mode strategy either: the game hard-codes dark while the lobby is light, so there's a white-to-indigo flash at game start. |
| 6 | High | **Token system is decorative, not enforced.** 327 literal `font-size` declarations vs 30 token uses (~40 distinct values like 0.688/0.7/0.75/0.775/0.78/0.8/0.813rem). About 70 literal radii vs 71 token uses. 174 rgba() literals, 24 literal shadows, ~60 unique off-token hex values. Five greens and six reds are in use for success/error. |
| 7 | Medium | **Tailwind v4 is installed but unused.** There are zero utility classes in TSX, no `@theme` mapping to the tokens, and two resets (preflight plus the custom `*{margin:0}`). That makes two parallel systems ready to diverge. |
| 8 | Medium | **Contrast failures in shipped UI.** White on `--color-error` is 2.78 (danger button, "Time is up!" banner). White on the teal success color is 1.93. White on the reconnect-banner green is 2.10. `--color-text-muted`/`tertiary` on white is 2.54 (used for lobby labels and hints). The lobby team notice (#86efac on white) is 1.40. White "1st" on the gold podium is 2.03, "2nd" on silver 2.26. White letter on yellow choice C is 2.39. |
| 9 | Medium | **Motion moments are missing** (detail in section 4): no join pop-in, no pre-question countdown, weak answer lock-in, a score "count-up" that just jumps, no rank-shuffle (FLIP), a podium with no suspense, no confetti, no sound, no haptics. |
| 10 | Low | **Brand isn't settled** ("Ladle", "Laddle" in package.json, "PopPop!" in UI, title and ROADMAP). Org white-label only overrides `--color-primary` on the navbar. |

**`--color-text-white: #000` fallout check:** commit `5de1315` set it to `#000`, and `abeaa45` three minutes later reverted it to `#FFFFFF` (bundled with a `game-page-dark` fix). It is currently `#FFFFFF`, so there is no live fallout. The name is still a trap: a "white" token that an edit can turn black. It is used in Button, Card, Footer and Navbar (9 places). Rename it to a role-based token (`--color-on-primary`, `--color-on-dark`); `--color-text-inverse` and `--color-text-on-primary` already exist as duplicates (the latter is unused).

---

## 1. Token consistency

### 1.1 Inventory (`src/styles/variables.css`, 127 lines)
- **Color:** primary purple ramp (#6C3FC5…), secondary amber (#F5A623, #FFD93D…), semantic success, error, warning and info, plus game-specific `--color-result-correct` #2ecc71 and `--color-result-wrong` #e74c3c.
- **Text:** 7 tokens, 3 of which are white duplicates (`text-white`, `text-inverse`, `text-on-primary`).
- **Type:** 9 sizes (xs…hero), 5 weights, 4 line-heights, 3 letter-spacings.
- **Space:** 4px base, 12 steps. **Radius:** 6 steps. **Shadow:** 6. **Transitions:** 3 (`ease` only).

### 1.2 Duplicates and aliases
- White text ×3 (above). `--color-danger` → error. `--color-surface` → bg-white. `--color-background-secondary` → bg-light. `--color-text-tertiary` → muted. `--font-primary` → `--font-family`.
- `--color-bg-dark` #1A0A3E vs `--color-bg-hero-deep` #1a0a3c: the same color twice, 2 hex digits apart.
- Successes: `--color-success` #4ECDC4 (actually teal), `--color-result-correct` #2ecc71, plus hard-coded #48BB78, #38A169, #68D391, #10b981 and #86efac.
- Errors: #FF6B6B, #E84545, #e74c3c, plus hard-coded #E53E3E, #FC8181, #ef4444, #e53e3e and #e55555.
- Purple fallbacks that don't match the token: `var(--color-primary, #6c47ff)` ×10 and `#7c3aed` (Game.css:1086). If the token ever fails to load, the brand shifts hue.

### 1.3 Undefined tokens (resolve to nothing)
- `--color-background`: Pricing.css:3, Marketplace.css:3/280, OrgSettings.css:3, StudentDashboard.css:3/136. These pages silently get transparent backgrounds.
- `--color-bg`, `--color-bg-card`, `--color-bg-subtle`, `--color-text`: covered by inline fallbacks (Game.css:17, Results.css:122/150/159, AIGenerateModal.css:95).

### 1.4 Unused tokens
`--color-bg-hero`, `--color-info`, `--color-primary-lighter`, `--color-text-on-primary`, `--font-size-hero`, `--letter-spacing-normal`, `--letter-spacing-wide`, `--line-height-snug`, `--radius-2xl`, `--space-5`, `--space-10`, `--space-24`, `--transition-slow`.

### 1.5 Hard-coded values by file
- **Hex literals outside variables.css:** Game 29, AssignmentTake 27, AssignmentReport 24, AIGenerateModal 17, Dashboard 14, Results 9, Landing 7. The most common are #fff ×19, #6c47ff ×10, #e5e7eb ×9 (that is `--color-border`), and #666, #555, #999 (greys not on the ramp).
- **Choice colors** live in TSX (`CHOICE_COLORS` in Game.tsx:75), not in CSS tokens, and are injected through inline `style`. Game.tsx has 15 inline style objects.
- **Font sizes:** 327 literals vs 30 tokens. Values include 0.688, 0.7, 0.75, 0.775, 0.78, 0.8, 0.813, 0.85, 0.875, 0.9, 0.938, 0.95, 1, 1.1, 1.125, 1.2, 1.25, 1.375, 1.4, 1.5, 1.75, 2, 2.25, 2.5 and 3rem. Effectively there is no scale.
- **Radius literals:** 50% ×16, 999px ×13 (= `--radius-full`), 12px ×9 (= md), 6px ×8 (off-scale), 8px ×7 (= sm), 4px, 3px, 20px, 10px, 0.75rem.
- **Breakpoints:** seven different max-widths (400, 480, 600, 640, 768, 900, 1024) with no shared definition. `globals.css` documents 768/1024/1280, but the code mostly uses 480/640/768.
- `globals.css` mutates the type tokens at ≤768px (`--font-size-4xl: 2rem`, etc.), so "4xl" means two things.

### 1.6 CSS vs Tailwind
`@import "tailwindcss"` in globals.css and `@tailwindcss/vite` are wired up, but no TSX file uses a utility class. The "grid" matches are all bespoke class names. There is no `@theme {}` block, so Tailwind's default palette and spacing (e.g. `text-purple-600`, `p-4` = 1rem) would compete with ours the first time someone uses it.

**Recommendation:** pick one authoring layer. Either (a) adopt Tailwind fully and generate the theme from the tokens via `@theme { --color-primary: …; --text-*: …; --radius-*: … }`, making CSS variables the single source of truth, or (b) remove Tailwind. Don't keep both half-adopted.

### 1.7 Dark mode
There is no `prefers-color-scheme` and no `color-scheme` meta. The game uses an ad-hoc `.game-page-dark`, so the lobby (light) to question (dark) handoff flashes. `Card` has a `glass` variant for dark backgrounds, but the lobby uses `elevated` (white). Recommend semantic surface tokens (`--surface-0/1/2`, `--on-surface`, `--on-surface-muted`) with a `[data-theme="stage"]` dark set used for every in-game screen, lobby included.

### 1.8 Contrast table (computed)

| Pair | Ratio | Where | Verdict |
|---|---|---|---|
| white / #6C3FC5 primary | 6.66 | secondary button | Pass |
| #1A1A2E / #F5A623 | 8.42 | primary CTA | Pass |
| white / #FF6B6B error | **2.78** | danger button, time-up banner | Fail (even large-text 3:1) |
| #FF6B6B / white | **2.78** | input error text | Fail |
| white / #4ECDC4 success | **1.93** | any success fill | Fail |
| white / #2ecc71 | **2.10** | reconnect banner | Fail |
| #9CA3AF muted / white | **2.54** | labels, hints, lobby "waiting" | Fail |
| #D4900E / white | **2.69** | lobby "0 pts" | Fail |
| #86efac / white | **1.40** | "Teams enabled" notice (light lobby) | Fail |
| white / #D69E2E (choice C) | **2.39** | letter chip | Fail |
| white / #38A169 (choice D) | 3.25 | letter chip | Large text only |
| white / #E53E3E, #3182CE | 4.13 / 4.03 | letter chips A/B | Large text only |
| white / gold #F5A623 | **2.03** | podium "1st" | Fail |
| white / silver #A0AEC0 | **2.26** | podium "2nd" | Fail |
| white@0.30 / #1A0A3E | **2.62** | rank-delta "--" | Fail |
| white@0.40 / #1A0A3E | 3.71 | reveal hint | Large text only |
| white@0.45 / #1A0A3E | 4.37 | reveal phase labels (12px!) | Fail at that size |
| white@0.50 on cards at opacity .5 | ~2.2 effective | wrong reveal cards | Fail |
| #F5A623 / #1A0A3E | 8.96 | scores on dark | Pass |

Also, the lobby team-setup input (Game.css:1073) uses dark-theme styling (`rgba(255,255,255,.2)` border, `.08` fill) on a **white** card, so the field has no visible boundary.

---

## 2. Scales and component coverage

### 2.1 Typography
- **Single family:** Poppins with 5 weights (400–800) loaded from Google Fonts. That's a heavy payload for one geometric sans, and it has no display or numeric companion. Codes fall back to system `monospace` in 4 files, while the in-game join code uses Poppins at 0.12em tracking.
- **Codes:** the character set is already unambiguous (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`), which is good. Show it in a face with distinct glyphs, chunked as `ABC 123`.
- **Numbers:** scores animate, so a face with tabular figures (`font-variant-numeric: tabular-nums`) is needed to stop jitter. No `tabular-nums` is set anywhere. Verify Poppins' tnum support before relying on it.
- **Proposed scale:** two scales.
  - UI scale, 1.25 ratio: 12/14/16/20/24/30/36/48.
  - **Stage scale** for host/projector, in `clamp()` vw units: `--stage-caption` 2.2vh, `--stage-body` 3.5vh, `--stage-answer` 4.5vh, `--stage-question` 6.5vh, `--stage-timer` 14vh, `--stage-code` 16vh.

### 2.2 Spacing
The 4px scale exists and is decent, but it's routinely bypassed (1.125rem, 0.625rem, 0.875rem, 0.15rem, 0.375rem paddings). Keep the 4px base, add semantic aliases (`--gap-tile`, `--pad-card`, `--pad-stage`), and lint for literals (stylelint `declaration-strict-value`).

### 2.3 Radius
Current values are 8/12/16/24/32/full, plus literals at 3/4/6/10/20. Choose one shape language per direction (section 6) and collapse to 3–4 values.

### 2.4 Shadows
These are neutral black shadows designed for light surfaces; they're invisible on the dark stage. Two colored shadows exist (purple, yellow). Add an elevation set for dark surfaces (inner highlight plus colored glow) and a "pressed" state for answer tiles.

### 2.5 Component library coverage
**Existing:** `Button` (4 variants × 3 sizes, loading), `Input`, `Card` (default/elevated/outlined/glass), `AIGenerateModal`, `ImportModal`, plus `Navbar`/`Footer` layout.

**Missing (each currently hand-rolled or absent):**

| Component | Status today | Needed for |
|---|---|---|
| Modal / Dialog primitive | Two bespoke modals; `window.confirm` for End Game (5 native alert/confirm calls) | Confirmations, settings |
| Sheet / Drawer | — | Host controls on mobile, player menu |
| Toast | Ad-hoc banners (reconnect, host-away, submitted) | Connection state, errors |
| Avatar | Initial-letter circle on podium only | Lobby, leaderboard, podium |
| Badge / Chip | `.streak-badge`, `.team-badge`, `.rank-delta`, `.host-badge` all separate | Streaks, teams, status |
| Tabs / SegmentedControl | — | Dashboard, results, builder |
| TimerRing | Duplicated SVG in host + player JSX; Demo uses a different conic-gradient ring | Every question |
| AnswerTile | `.game-choice` + inline styles | Phone + host + reveal |
| LeaderboardRow | 4 near-identical row styles (`leaderboard-row`, `reveal-score-row`, `reveal-lb-row`, `podium-rest-row`) | Reveal, results |
| Podium | Inline in Game.tsx | Final |
| CodeDisplay / JoinCard | `.game-code-display` + QR inline | Lobby, big screen |
| ProgressBar | `hat-bar`, `reveal-bar` | Answer tracker, reveal bars |
| Icon | None (emoji + 9 inline SVGs, no icon set) | Everywhere |
| Countdown / Interstitial | — | Pre-question 3-2-1 |
| Skeleton / Spinner | `spin` in App.css, `btn-spin` | Loading |

---

## 3. Game screens

### 3.1 Lobby
- Host and player see the **same** layout: a white 780px card holding the QR (180px), "or go to … /join", the code (≤48px), and a plain player list showing "0 pts" on every row. Players who've already joined are shown the QR and code they no longer need.
- **Low energy.** Joining is a silent list append, with no pop-in, avatar, count ticker or sound. Names render as flat rows, so 30 students produce a scrolling table.
- **On the projector** the code and QR are far too small and the card leaves ~60% of the screen empty. The join URL is 12.8px.
- **Recommendation:** a full-bleed host lobby. The code is 16vh tall in the top band, the QR is ≥30vh, and the join URL is ≥4vh. Players appear as avatar chips in a growing cloud with a spring pop-in and soft "plip" sound, plus a big player counter that ticks. The phone lobby shows "You're in!", the player's avatar or name, an option to change avatar, and a waiting animation.

### 3.2 Question: host view
- Max width 720px; question at `clamp(1.25rem, 3.5vw, 1.75rem)`; answer tiles have white text at 16px on 7%-white fills with a colored border; the timer is a 64px ring with a 20px number.
- **Choreography:** the question and answers appear together. Recommend question first (with a reading beat), then answers stagger in, then the timer starts.
- The answer tracker (15px label, 10px bar) is fine in concept but undersized.
- Host controls (Pause/+30s/Skip/End) sit beside the content in the same visual layer, so the projector shows teacher controls to the class. Move them to an auto-hiding control bar or a second-device remote.
- **Projector math:** a 1080p image on a ~2.4m-wide screen is ~1.25mm per px. At 9m (back row), 16px text has a cap height of ~14mm, which subtends ~0.09°. That's below comfortable legibility of roughly 0.3°. **Targets at 1080p:** question 56–72px, answers 40–48px, timer numeral ≥120px, code 140–170px, nothing under 28px. Use vh-based clamps so 720p and 4K scale.

### 3.3 Question: player phone
- The phone repeats the question text and shows four **white** tiles with a 36px colored letter chip, stacked in one column below 640px. Each tile is min-height 68px with 14px gaps.
- **Thumb zone:** the stack starts after ~32px padding, a 56px timer row and a variable question box. Long questions push tiles to the middle/top and can scroll inside a `position: fixed` page. Recommend a 2×2 grid locked to the bottom 55–60% of the viewport, with tiles ≥ 25% of viewport height. Question text gets a fixed-height, auto-shrinking area above. The timer becomes a thin top bar.
- **Lock-in feedback is weak.** Selection gives a 15% color tint, a -3px lift (hover-like) and a "locked in" banner at the bottom. Recommend: the tile scales in, others shrink and fade, a check-and-ring stamp appears, and the device vibrates (`navigator.vibrate(15)`) with a click sound.
- **Ladle differs from Kahoot here:** phones show full answer text, so color/shape is secondary for identification. Phone tiles can therefore be **full color fields + shape + text**, keeping the host and phone mapping obvious.

### 3.4 Answer colors and shapes
- Current colors: #E53E3E / #3182CE / #D69E2E / #38A169, with redundancy only via A–D letters. There are no shapes.
- **CVD (min pairwise delta-E after simulation):** deuteranopia 21.4 (red vs yellow), protanopia 18.6 (red vs green), tritanopia 15.6 (blue vs green). Below ~25 is risky for a split-second decision.
- **Semantic collision:** answer D is green, and green also means "correct" in the reveal.
- **Recommendation:** assign each answer a fixed shape (triangle / diamond / circle / square), the letter, and a color, and keep red and green **out of** the answer palette, or at least never use them for correctness. Mark correctness with a checkmark icon, a thick outline and dimming the others, never hue alone. Validated palettes are in section 6.

### 3.5 Timer
- An SVG ring with dashoffset that steps once per second with a 1s linear transition. It's driven by a client `setTimeout` decrement rather than `endsAt`, so it drifts.
- Color thresholds are **absolute** (>10s green, >5s amber, else red) regardless of question length, so a 5s question is red from the start. The threshold signal is color-only, and the urgent state is a 2Hz scale pulse.
- **Recommend:** derive from `endsAt` with requestAnimationFrame for a smooth sweep. Use proportional thresholds (50% / 20%). Signal urgency redundantly: ring thickens, numeral grows, tick sound in the last 5s, optional phone haptic at 3-2-1. On the host the timer is a hero element, not a corner chip.

### 3.6 Reveal
- Three auto-advancing phases: correct (2s fixed), scores (2.5s), leaderboard (holds). Phase 1 is too short for a teacher to discuss and isn't host-controlled.
- Bars animate width over 0.8s, but they mount already at their final width, so in practice there's no grow animation. Wrong cards drop to opacity 0.5, giving ~2.2:1 text contrast.
- The correct bar is #48BB78 regardless of answer color. The checkmark is a text glyph.
- **Scores phase:** lists **all** players with no cap, which overflows at 25+ players on the projector. The "count-up" sets the final number after 300ms; `transition: all .6s` can't interpolate text, so it jumps.
- **Leaderboard:** top 8 rows slide in from the left with a stagger. Rank movement is a colored "+2" chip and a 6px bounce on the rank number. There's no positional movement (rows don't swap), which is the most satisfying moment in the genre.
- **On phones** players see the same multi-row host screens, tiny and identical for everyone.
- **Recommend:**
  - Host-paced reveal with a "Next" control or auto timer.
  - Phase 1: suspense beat (bars grow from 0 in sync), then the correct tile pops with a check stamp and the others recede.
  - Phase 2 on host: top-5 FLIP reshuffle with score count-up (tabular numerals).
  - Phase 2 on phone: a personal result card — "Correct / Not quite", the points count-up, streak flame, "You're #4, 120 behind Sam" — on a full-screen green or coral field with an icon, never color alone.

### 3.7 Podium
- All three columns rise within 0.1–0.3s of each other, with no build-up, no confetti, no sound.
- Names truncate at 100px (72px on mobile). Avatars are a single initial. Medal text "1st/2nd" is white on gold (2.03) and silver (2.26). The rest of the list is a plain table.
- The team title uses an emoji.
- **Recommend:** sequential reveal (3rd, beat, 2nd, beat, drum-roll, 1st), confetti burst on 1st, spotlight sweep, names never truncated below ~16ch (wrap or auto-shrink). Phones show the player's own placement card ("You placed 7th of 28", best streak, accuracy) with a share/screenshot affordance.

### 3.8 Status overlays
- **Pause overlay:** an emoji icon ⏸ at 4rem (renders differently per OS).
- **Host-away and reconnect:** ad-hoc banners. The reconnect banner fails contrast (2.10).
- **Recommend:** a Toast system plus a proper `Interstitial` component (icon + title + subtitle) shared by pause, host-away and between-question states.

---

## 4. Motion audit

### 4.1 What exists
- **Keyframes (17):**
  - App `spin`; Button `btn-spin`.
  - Library `fadeIn`, `slideInUp`.
  - Demo `dot-bounce`, `pop-in` (the only real overshoot easing, `cubic-bezier(.175,.885,.32,1.275)`).
  - Game `slideInUp`, `fadeOut`, `timerPulse`, `correctPop`, `fadeIn`, `fadeSlideIn`, `slideInLeft`, `pointsPop`, `rankBounce`, `pulse`, `podiumRise`.
  - `slideInUp` and `fadeIn` are defined in more than one file with the same global names, so whichever loads last wins.
- **Transitions:** ~55 declarations, almost all `ease` and 150–400ms, many `transition: all` (perf and unintended properties).
- **Tokens:** `--transition-fast/base/slow` exist but carry no easing personality, and `slow` is unused. There's no spring or physics library.
- **Reduced motion:** **none**. **Sound:** none. **Haptics:** none.

### 4.2 Moments that lack feedback

| Moment | Today | Should feel like |
|---|---|---|
| Player joins (host) | Row appears | Avatar pops in with spring overshoot + "plip"; counter ticks |
| Player joins (phone) | Lands on the generic lobby card | "You're in!" stamp, own avatar bounces, idle breathing |
| Game start | Instant state swap | Lights-down transition to the stage theme, "Get ready" title |
| Pre-question | None | 3-2-1 countdown (or question-read progress bar) |
| Question in | 350ms slide-up of everything | Question slams in, then answers stagger at 60ms |
| Timer final 5s | Color change + 2Hz pulse | Ring thickens, ticks, numeral heartbeat once per second |
| Answer tap | 15% tint + banner | Press-down squash, then lock stamp; others recede; haptic |
| All answered | Nothing | "Everyone's in!" flourish, early end |
| Time up | Red banner slide | Ring snaps shut, buzzer, tiles lock with a shake-free dim |
| Reveal correct | Cards slide; bars mount at final width | Bars grow together, then correct tile pops + check draws on |
| Points earned | +N scale pop, total jumps | Number count-up 600–900ms with tabular figures; "+N" flies to total |
| Streak | Text badge | Flame/streak chip ignites, scales with streak length |
| Rank change | Colored "+2" chip | FLIP row reorder with spring; climber gets a glow trail |
| Podium | Simultaneous rise | Staged 3rd/2nd/1st, drumroll, confetti, spotlight |
| Reconnect | Banner | Toast with spring, auto-dismiss |

### 4.3 Recommended motion system

**Library:** `motion` (the current Framer Motion package, `import { motion, AnimatePresence, LayoutGroup, useSpring, animate } from "motion/react"`; React 19 compatible).
- `layout` / `LayoutGroup` covers the leaderboard FLIP.
- `AnimatePresence` covers phase transitions.
- `animate()` on a MotionValue covers count-ups.
- `useReducedMotion()` covers the a11y gating.

**Confetti:** `canvas-confetti` (~6KB) with a reduced-motion guard.
**Sound:** `howler` or a thin Web Audio wrapper (see section 5.4).

**Tokens** (as CSS variables for CSS-only cases, mirrored in a `motion.ts` for JS):
```
--dur-instant: 80ms     (press feedback)
--dur-fast:   150ms     (hover, small state)
--dur-base:   240ms     (enter/exit of components)
--dur-slow:   400ms     (screen transitions)
--dur-stage:  700ms     (big-screen reveals, count-ups 600-900ms)
--ease-out:      cubic-bezier(0.22, 1, 0.36, 1)    (entrances)
--ease-in:       cubic-bezier(0.55, 0, 1, 0.45)    (exits)
--ease-in-out:   cubic-bezier(0.65, 0, 0.35, 1)    (moves)
--ease-overshoot: cubic-bezier(0.34, 1.56, 0.64, 1) (CSS pop fallback)
springs (motion):
  snappy  { stiffness: 500, damping: 30 }  (tiles, buttons)
  bouncy  { stiffness: 380, damping: 14 }  (join pop-in, stamps)
  gentle  { stiffness: 180, damping: 24 }  (layout reorder)
stagger: 40ms (lists), 60ms (answer tiles), 120ms (podium beats are 900ms)
```

**Rules:**
1. Animate only `transform`/`opacity` (and `stroke-dashoffset` for the timer).
2. Never `transition: all`.
3. No infinite loops except the idle lobby "breathing", and that is gated.
4. Phones get shorter, haptic-backed motion; the host gets the choreography.
5. Every motion has a reduced-motion variant: cross-fade at `--dur-fast`, with no scale/translate, no confetti, no pulsing.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; scroll-behavior: auto !important; }
}
```
Then opt meaningful fades back in through `useReducedMotion()`. Add a host-level "Calm mode" toggle (less motion, no sound) for sensory-sensitive classrooms. It doubles as the reduced-motion path.

**Choreography map:**
- **Join pop-in:** chip scale 0 to 1, bouncy spring, ±4° random rotation settling to 0, "plip" sound pitched up slightly per join.
- **Countdown:** 3, 2, 1 numerals scale 1.4 to 1 with fade, 700ms each, tick sound, ring wipe.
- **Answer lock-in:** press scale .96 (instant), then release to 1.04 then 1 (snappy); stamp icon pops (bouncy); siblings fade to .35 and scale .97 (base); 15ms haptic.
- **Reveal:** bars grow 0 to N% together (700ms ease-out); 250ms hold; correct tile scales 1.06 with the check path drawn (300ms); wrong tiles desaturate.
- **Score count-up:** animate MotionValue from old to new over 800ms ease-out with tabular-nums; "+N" chip translates up 24px and fades.
- **Rank shuffle:** `layout` with the gentle spring; movers up get a brief accent glow; no more than 5–8 rows visible.
- **Podium:** columns rise in sequence 3, 2, 1 with 900ms beats; 1st gets a spotlight radial and a 1.2s confetti burst; sound stinger.

---

## 5. Brand, graphics, iconography, sound

### 5.1 Identity
- The name is unsettled across three variants (Ladle/Laddle/PopPop!). The theme-color is #6C3FC5.
- The current "logo" is a 🎉 emoji in a purple square, which violates the project's own no-emoji rule (masked by the broken lint). It also renders differently on every OS and can't be white-labeled.
- Comments reference a "LearnFun trivia quiz design reference", so the look is derivative of a template.
- **Decision needed first:** the name drives the whole direction.
  - "PopPop!" suggests bubbles, popping and an arcade feel.
  - "Ladle" suggests serving, scooping, kitchen and nourishment, a warmer story for educators ("serve up a quiz").
  - The directions below cover both, plus a neutral "event" option.

### 5.2 Mascot potential
- **PopPop!:** a bubble or popcorn-kernel character that inflates when players join and pops into confetti on the podium. It's very animatable with squash and stretch.
- **Ladle:** a ladle character ("Scoop") that stirs a pot during the countdown, serves points into each player's bowl, and wears a chef hat on the podium.
- Either one gives ready-made states: idle, cheer, think (timer), oops (wrong), celebrate.
- Keep the mascot **optional and host-side**. Corporate/event hosts may want it off, which ties into white-label.

### 5.3 Icon set
There is none today. Adopt **Lucide** or **Phosphor** (Phosphor has rounded/bold weights that suit a game). Wrap them in an `<Icon>` component, replace all emoji, and define four custom **answer shape glyphs** as SVG components (they're also the answer identity).

### 5.4 Sound hooks
There's no audio today. Hook points, as an event-to-sound map:

| Event | Sound |
|---|---|
| lobby | loop (host only) |
| player join | plip |
| countdown | tick ×3 + go |
| question | whoosh |
| timer last 5s | tick |
| answer lock | phone click + haptic |
| all answered | chime |
| time up | soft buzzer |
| reveal correct | sting |
| rank up | rising arpeggio |
| podium | drumroll + fanfare |

- Default: host sound on (with a visible mute), phones muted by default with a toggle (classroom-friendly).
- Respect "Calm mode".
- Ship as small OGG/MP3 sprites (<150KB total).

---

## 6. Three visual direction concepts

Each answer palette below was validated for (a) the text color on each tile and (b) minimum pairwise delta-E under normal, deuteranopia, protanopia and tritanopia vision. All three directions **require shape + letter redundancy**, and none uses green for an answer.

### Direction A — "Pop Arcade"
*Bubblegum game-show energy: chunky outlines, bouncy springs, things that pop. The natural fit if the brand is PopPop!*

- **Mood:** loud, joyful, toy-like; Saturday-morning cartoon meets modern neo-brutalism. Best for K-8 and casual events.
- **Palette:**

  | Role | Name | Hex |
  |---|---|---|
  | Stage background | Ink | #1B1033 |
  | Surface | Grape Night | #2A1850 |
  | Primary | Grape | #6B2EFF |
  | CTA / accent | Lemon | #FFD23F |
  | Paper (light UI) | Cream | #FFF8EE |
  | Correct semantic | Mint | #2EE6A8 (paired with a check icon) |
  | Wrong semantic | Coral | #FF6B5A (paired with an X icon) |

  **Answers:** Bubblegum #FF4FA3 triangle (ink text 5.9), Sky #3D8BFF diamond (ink 5.4), Lemon #FFC83D circle (ink 11.6), Grape #7B3CFF square (white 5.3). Min CVD delta-E: deu 23.7 / pro 31.0 / tri 31.5 (normal 58.7).
- **Type:** **Fredoka** (display: rounded and chunky, good numerals at size) + **Nunito** (UI body), with **Space Mono** for the join code.
- **Shape language:** pills and squircles, radius 20–28px, a 3px ink outline on everything, hard offset shadows (`4px 4px 0 #1B1033`), sticker-style chips, blob backgrounds with floating bubbles.
- **Motion personality:** bouncy springs (stiffness 380, damping 14); squash and stretch on press; joins inflate like bubbles; points "pop" with particle bursts; podium explodes in confetti. High energy, but reduced-motion collapses to fades.
- **Host screen:** an ink background with drifting soft bubbles. The giant code sits on a lemon sticker (16vh, Space Mono). Player chips pop into a bubble cloud. During questions the question sits in a cream speech-bubble panel, the four tiles are full-color fields with big white-outlined shape glyphs, and a fat lemon timer ring sits at the top-center.
- **Phone screen:** a 2×2 grid of full-bleed color tiles filling the bottom 60%, each with a huge shape glyph and answer text. Tapping squashes the tile and stamps a lemon "LOCKED" sticker. The result card is a full-screen mint or coral field with a giant count-up and a streak flame.

### Direction B — "Ladle Kitchen"
*Warm, crafted, teacher-trusted: a cozy kitchen-table palette, tactile paper and sticker textures, and a friendly ladle mascot that serves up points. The natural fit if the brand is Ladle.*

- **Mood:** warm, nourishing, calm-confident; feels like a beloved classroom tool rather than a slot machine. Strong for teachers, parents and districts, and less "screen-time anxiety".
- **Palette:**

  | Role | Name | Hex |
  |---|---|---|
  | Light UI background | Oat | #F7F1E6 |
  | Raised surface | Paper | #FFFDF8 |
  | Text / stage dark | Cast Iron | #2B2620 |
  | Primary | Blueberry | #2F5DA8 |
  | CTA | Saffron | #EDB23A |
  | Correct | Herb | #4E8A3E (check icon) |
  | Wrong | Paprika | #C8441E (X icon) |
  | Stage background | Deep Pot | #1F2A3A |

  **Answers:** Tomato #C8441E triangle (white 4.9), Blueberry #2F5DA8 diamond (white 6.5), Saffron #EDB23A circle (ink 9.4), Sage-teal #3E8E7E square (white 3.9, large text only). Min CVD delta-E: deu 29.4 / pro 38.4 / tri 17.8 (normal 52.0). Tritanopia is the weakest pair, so the shapes are load-bearing.
- **Type:** **Bricolage Grotesque** (display: characterful, warm, variable width for headlines and big numbers) + **Atkinson Hyperlegible** (body: designed for low-vision legibility, a strong classroom story), with **JetBrains Mono** for codes.
- **Shape language:** soft rounded rectangles (radius 12–16px) with a slight hand-cut irregularity on stickers. Subtle paper grain texture. Bowls and arcs as framing devices (the leaderboard as "bowls" filling up). Line icons with rounded caps. Soft warm shadows (`0 6px 0 rgba(43,38,32,.12)`).
- **Motion personality:** weighted and gentle (spring stiffness 220, damping 24). The ladle stirs during the countdown, points "pour" into each player's bowl, steam rises off the leader, ranks settle like ingredients finding their place. Fewer particles; celebration through warmth (a glow, a mascot cheer) more than chaos.
- **Host screen:** the lobby is a deep-pot navy stage with an oat card. The join code is printed like a recipe card in mono, and players drop in as round "ingredient" avatars into a pot illustration that fills up. During questions the question sits on a paper card, answer tiles are colored stickers with shape glyphs and Atkinson text at 44px+, and the timer is a ladle-sweep arc around the question card.
- **Phone screen:** oat background, a 2×2 sticker grid at the bottom, a gentle haptic and a "served!" stamp on lock-in. The result is "Nicely done, +820" on an herb-green card with a bowl-filling animation; on a miss, a supportive "So close, the answer was B (diamond)" in paprika. Copy tone is encouraging rather than punishing.

### Direction C — "Prime Time Scoreboard"
*Broadcast-grade stadium graphics: dark arena, neon signal colors, condensed numerals, slot-machine digit rolls. Built for projector legibility and corporate or event use.*

- **Mood:** cinematic, high-stakes, slick; esports overlay meets TV game show. Best legibility from the back of a hall. Scales up to conferences, trivia nights and company all-hands, and is easy to white-label.
- **Palette:**

  | Role | Name | Hex |
  |---|---|---|
  | Arena background | Night | #0B0E1A |
  | Panel | Panel | #151A2E |
  | Divider / raised | Steel | #2A3150 |
  | Text | Floodlight | #F5F7FF |
  | Primary / brand slot (white-label hook) | Signal Yellow | #FFE14D |
  | Correct | Volt | #A3F94B (check icon) |
  | Wrong | Alarm | #FF4D6D (X icon) |

  **Answers:** Coral #FF5A5F triangle (navy text 6.3), Cyan #22C8EE diamond (navy 9.7), Signal #FFE14D circle (navy 14.8), Violet #9B6BFF square (navy 5.4). Min CVD delta-E: deu 37.2 / pro 47.5 / tri 43.5 (normal 84.1), the most robust of the three. All tiles use dark text, which keeps contrast consistently high.
- **Type:** **Barlow Condensed** (display and numerals: tall, tabular-friendly, broadcast feel; 700–800 for timers and scores) + **Inter** (UI body, tabular figures available), with **JetBrains Mono** for codes.
- **Shape language:** tight radius (6–8px), angled 12° chevron cuts on banners and lower-thirds, thin 1px light rules, scanline/gradient sheens, glow instead of drop shadow, a grid-based layout with strong edges.
- **Motion personality:** snappy and precise (spring stiffness 500, damping 32; ease-out 200–300ms). Broadcast wipes between phases, slot-machine digit rolls for scores, lower-third slide-ins for streaks, rows reordering like a live race tracker, a light sweep across the podium. Confetti is optional (a "stadium" mode); otherwise flares and light beams.
- **Host screen:** an edge-to-edge 16:9 layout. The top band holds the question at 6.5vh in Inter Bold. The four tiles take up the lower 50% in a 2×2 grid with a big navy shape glyph and 4.5vh text. A 14vh condensed numeral timer sits in a ring at top-right, with the answer counter as a live ticker. The lobby looks like a stadium jumbotron: a giant mono code, the QR in a framed panel, and a player-count odometer.
- **Phone screen:** night background, four signal-color tiles in a 2×2 grid with navy shapes. Lock-in plays a quick wipe plus a "LOCKED IN" lower-third, and the result shows a slot-roll score and a rank odometer ("#4 ▲2" rendered with an SVG arrow icon, not a glyph).

### Choosing between them

| | A Pop Arcade | B Ladle Kitchen | C Prime Time |
|---|---|---|---|
| Name fit | PopPop! | Ladle | Either (neutral) |
| Audience sweet spot | K-8, casual | K-12 teachers, districts | HS/college, events, corporate |
| Projector legibility | Good | Good | Best |
| CVD robustness (min delta-E) | 23.7 | 17.8 (shapes required) | 37.2 |
| White-label friendliness | Low (strong look) | Medium | High |
| Build cost | High (illustration, particles) | High (mascot, texture) | Medium (type and layout driven) |

A hybrid is viable: C's projector-first layout and type rigor, plus A's or B's color and mascot layer as a theme.

---

## 7. Recommended next steps (for the design and implementation phases)
1. **Fix the lint:** replace `grep -P` with `perl -CSD -ne` or `rg`, then remove the emoji (logo first).
2. **Decide the brand name**, then pick a direction.
3. **Restructure the tokens** into three layers: primitives (palette), semantics (`surface`, `on-surface`, `accent`, `correct`, `wrong`, `answer-1..4`), and a stage theme. Fix the undefined tokens, delete duplicates, rename `text-white`, and resolve Tailwind (adopt it via `@theme` or remove it).
4. **Build the game component kit:** TimerRing, AnswerTile (shape+color+letter), LeaderboardRow (layout-animated), Podium, JoinCard/CodeDisplay, Avatar, Badge, Toast, Modal, Sheet, Interstitial, Icon.
5. **Split host and phone views into distinct layouts.** Use the stage type scale for the host. Add a personal result screen for players.
6. **Add `motion`, the motion tokens and a reduced-motion/Calm mode**, then choreograph in this order: lock-in, then reveal, then count-up, then rank shuffle, then podium, then join pop-in.
7. **Add sound sprites and a haptics wrapper.**
8. **Fix the contrast failures** in section 1.8. Add a stylelint rule banning raw hex, px font sizes and `transition: all` outside token files.
