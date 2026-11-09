# Ladle / PopPop — Execution Plan

> Synthesized 2026-11-08 from eight role-based audits in `docs/audit/` (01 reliability, 02 game mechanics, 03 UX flows, 04 UI/visual/motion, 05 content creation, 06 marketability, 07 revenue, 08 security & code health). Each line below references the audit that owns the detail.
>
> **North star:** a host goes from landing page to a live lobby in **≤3 clicks, no account required**. A guest goes from QR scan to the lobby in **≤2 taps**. Neither ever has to guess what to do next, and a dropped connection never costs anyone their game.

---

## 0. Decisions needed before building

| # | Decision | Recommendation | Why it blocks |
|---|---|---|---|
| D1 | **Product name**: Ladle / Laddle / PopPop! | Retire "Ladle". **LADLE** is a live US trademark in Class 42 (SaaS), and the search results are taken by kitchenware and ladle.dev. Move to **PopPop** (already on every in-app screen) after a USPTO and domain check, with a coined fallback (Quizpop / Popquest). (06) | The visual direction, logo, mascot and copy all depend on it. |
| D2 | **Visual direction**: A Pop Arcade / B Kitchen / C Prime Time / hybrid | Pick from the design options (Section 3). A good default is a hybrid: C's projector-first layout rigor with A's color and personality layer. (04) | Token rebuild and component kit |
| D3 | **Beachhead audience** | US grade 3–8 teachers, with church and youth groups second (06) | Tone, library content, pricing |
| D4 | **Pricing ladder** | Free forever (guests never pay or sign up; 50–60 players; 5 AI/mo), Teacher Plus at about $48/yr, Pro at about $19/mo, a $24 Event Pass, and School site licenses quoted annually (07, 06). Verify competitor prices first. | Paywall placement in UX |

---

## 1. Phases at a glance

| Phase | Goal | Runs in parallel with |
|---|---|---|
| **P0 Stabilize** (1–2 wks) | Nothing crashes, leaks or strands a player | Design exploration |
| **P1 Design system** (2 wks) | Chosen direction becomes tokens, a game component kit and a motion system | Stabilize tail |
| **P2 Core loop rebuild** (3 wks) | Host lobby → question → reveal → podium → recap, with separate host and phone layouts | — |
| **P3 Create anything fast** (2–3 wks) | Builder autosave, a rewritten importer, AI with quotas | P2 tail |
| **P4 Grow & monetize** (2 wks) | No-signup hosting, viral loops, working Stripe, paywalls | — |
| **P5 Depth** (ongoing) | New question types, modes, reports, scale-out | — |

---

## 2. Phase P0: Stabilize (must ship before any classroom pilot)

### Security (08, 05, 07)
- [ ] **Server crash on one packet.** `games` is a plain object, so `{code:"constructor"}` kills the process. Switch to a `Map`, zod-validate every host event, and add `process.on('uncaughtException')` logging. *S*
- [ ] **Firestore rules rewrite.** Remove `allow list: if true` (it leaks every private quiz and answer key). Lock `isTemplate`/`createdBy`/`rating` against client writes. Add rules for `users`, `assignments`, `assignmentResponses`, `gameResults` and `studentProgress`. Move `plan`/credits to a doc only the server can write. Check the deployed rules with `firebase firestore:rules:get`. Add emulator rule tests. *M*
- [ ] Remove the "Seed Library Now" button for non-admins. *S*
- [ ] **Server auth.** Verify Firebase ID tokens on HTTP and in the socket handshake. Put auth, rate limit and quota on `/api/ai/generate`. Make checkout derive `uid` from the token. *M*
- [ ] **Host takeover.** Issue a secret `hostToken` on `host:create` and require it for `host:reconnect`. *S*
- [ ] Stop sending assignment answer keys to the client and grade on the server. *M*
- [ ] Add Privacy and Terms pages (the footer currently links to `/`). Add a COPPA posture statement and data-retention rules, and scrub kids' names from logs. *M*

### Reliability: "leave mid-game and pick back up" (01)
- [ ] **Player session token.** `player:join` returns a `playerToken`, stored in localStorage per game code. A new `session:resume {code, token}` is sent on mount and on every reconnect. The server rebinds the socket and replies with a **full state snapshot**: phase, current question, `remainingMs`, whether the player already answered, score and rank. *M*
- [ ] A valid token **always takes over** the slot (no waiting about 45s for heartbeat death) and kicks the stale socket. *S*
- [ ] **Host refresh in the lobby no longer deletes the game.** Use the same grace period as mid-game. The client handles `host:reconnect:failed`. *S*
- [ ] Never delete disconnected players mid-game (keep their score and show them as "away"). Exclude them from the "everyone answered" early end. *S*
- [ ] Client: set `reconnectionAttempts: Infinity`, move reconnect listeners to `socket.io.on(...)`, enable `connectionStateRecovery`, and show a visible **"Reconnecting…" pill**. *S*
- [ ] **Survive restarts.** Snapshot each game to Upstash Redis (or Firestore) on every state change, rehydrate on boot and restart timers, and handle SIGTERM. Move off Render's free plan, which sleeps. *M*
- [ ] **Server-authoritative timer.** Send `endsAt` plus server time, have the client compute its clock offset, allow 750ms of grace, and always ack or reject an answer. *M*
- [ ] Guard `host:start` and other state transitions with phase checks so double-clicks can't skip questions. *S*
- [ ] Reject duplicate and empty names, add a profanity filter and let the host kick players. Cap games per authenticated host to stop slot exhaustion. *M*

### Scoring correctness (02)
- [ ] Speed score is computed from **time remaining when the answer arrives**, clamped to the max, so Pause and +30s can no longer inflate it. Reject answers while paused, and reject negative `extraSeconds`. *S*
- [ ] Apply saved quiz settings at launch: per-question time, shuffle, points, images and leaderboard cadence (`Dashboard.tsx:112`). *S*
- [ ] Fix student progress saving `leaderboard[0]`'s score when the name doesn't match. *S*

### Billing plumbing (07)
- [ ] Mount the webhook with `express.raw` **before** `express.json()`. Read `uid` from the Checkout Session or set it in `subscription_data.metadata`. Return 500 on write failure so Stripe retries. Handle `trialing` and `past_due` correctly. Add the billing portal. *M*

### Engineering foundation (08)
- [ ] Create a `packages/shared` workspace with typed Socket.IO events and zod schemas (the two `events.ts` copies have drifted). *M*
- [ ] Add Vitest unit tests for `gameManager` and socket integration tests through a `createServer()` factory. *M*
- [ ] Set up GitHub Actions to run tsc, eslint, tests, rules tests and npm audit. Add Sentry with player names scrubbed. *S*
- [ ] Fix the no-emoji lint (`grep -P` silently passes on macOS) and remove the emoji logo. *S*

---

## 3. Phase P1: Design system (starts now, in parallel with P0)

**Design exploration deliverable:** three interactive directions covering the host big screen, guest phone and host create flow, each with motion. See the design artifact links in the session summary.

- [ ] Choose a direction (D2) and a name (D1).
- [ ] **Tokens in three layers:** primitives, then semantics (`surface`, `on-surface`, `accent`, `correct`, `wrong`, `answer-1..4`), then a **stage theme** for the projector. Fix the 6 undefined tokens, the 327 hard-coded font sizes and the 7 breakpoints. Decide on Tailwind (adopt via `@theme` or remove it). Add stylelint rules banning raw hex values and `transition: all`. (04)
- [ ] **Answer identity:** shape + letter + color on every tile. Keep red and green out of the answer palette, and show correctness with an icon and outline, never hue alone. (04)
- [ ] **Game component kit:** TimerRing (rAF from `endsAt`), AnswerTile, LeaderboardRow (layout-animated), Podium, CodeDisplay/JoinCard, Avatar, Badge, Toast, Modal, Sheet, Interstitial, Icon set. (04)
- [ ] **Motion system:** `motion/react`, duration, easing and spring tokens, `canvas-confetti`, a sound sprite and haptics wrapper, and a reduced-motion path plus a host **Calm mode**. (04 §4.3)
- [ ] **Projector type scale:** question 56–72px, answers 40–48px, timer at least 120px, code 140–170px, nothing under 28px, using vh clamps. (04)

---

## 4. Phase P2: Core loop rebuild, by touchpoint

| Touchpoint | Host (big screen) | Guest (phone) | Audits |
|---|---|---|---|
| **Landing** | Real claims only (remove the fake stats). One primary CTA, "Host a game, free", plus a secondary "Join a game" with a code field right on the hero. | Code field on the hero, autofocus | 03, 06 |
| **Pick a quiz** | "Host this now" on every library and sample quiz. **No account needed** for library quizzes. Remove the "Game Ready!" modal. | — | 03 |
| **Lobby** | Full-bleed: code 16vh, QR ≥30vh, join URL ≥4vh. Avatar chips pop in, a player counter ticks, plus kick, copy link, lock room and Start. Controls sit in an auto-hiding bar. | `/j/CODE` deep link, then the name field is **pre-focused and remembered**, then Join. Shows "You're in!" with an avatar picker or nickname generator. No navbar. | 03, 04 |
| **Countdown** | 3-2-1 with ring wipe and tick sound | Same, with haptic | 04 |
| **Question** | Question shown first with a reading beat, then answers stagger in, then the timer starts. The timer is the hero element. The answer counter is a live ticker. | 2×2 full-color tiles in the bottom 60% (thumb zone). Lock-in shows a stamp and a haptic. | 02, 04 |
| **Reveal** | **Host-paced** with a Next button (or auto-advance setting). Bars grow, then the correct tile pops, then an **explanation** shows if present. | **Personal result card:** "Correct! +840 · #4, 60 behind Sam", or a supportive message on a miss. | 02, 03, 04 |
| **Leaderboard** | Top-5 FLIP reshuffle with count-ups. Shown every N questions (a setting). | Own rank and its change | 02, 04 |
| **Podium** | 3rd, then 2nd, then drumroll, then 1st, with confetti and a stinger. The last question is worth double points. | "You placed 7th of 28", best streak, accuracy, a share card | 02, 04 |
| **End / recap** | Report summary (hardest questions), then **Play again** / Assign missed questions / Save results. | **"Join another" / "Host your own (free)"**, replacing "Back to Dashboard", which currently sends guests to a login wall | 03, 06 |
| **Recovery** | Reconnect overlay and host-away interstitial. The game pauses itself while the host is away. | "Reconnecting…" pill, then auto-resume to the exact phase | 01, 03 |

**Scoring rework (02):** any correct answer earns 500–1000 points (instead of 0–1000). Cap the streak bonus at +150. Team score is the average of members, not the sum. Add Classic, Accuracy and No-score modes.

**IA (03):** four primary destinations (**My Quizzes · Discover** (merges Library and Marketplace) **· Reports · + New quiz**), with Settings and Branding in the account menu. Separate student and teacher navigation. Add a 404 page.

---

## 5. Phase P3: Create anything fast (05)

- [ ] **Builder:** autosave drafts to local storage and Firestore, a warning on unsaved navigation, and inline validation that matches the server schema (one shared zod schema). Add reorder and duplicate, plus keyboard flow (Enter adds a choice, Ctrl/Cmd+Enter adds a question). Add a preview-as-player mode, image upload, and per-question time and points. Fix the type-button reset bug and the Standards field `undefined` bug.
- [ ] **Quiz schema v2:** a `schemaVersion` field, and `answers[]` with `correct: boolean` to support multi-select, type-answer, ordering and poll questions.
- [ ] **Importer rewrite** (26 failing cases are documented in 05):
  1. Plain-text and ChatGPT paste parser ("1. Q? a) b) *c)", markdown bold, blank lines) **P0**
  2. Kahoot XLSX template **P0**
  3. Quizlet tab-separated paste, and Blooket/Quizizz CSV **P1**
  4. PDF or notes to AI **P1**
  5. Google Forms, URL or YouTube to AI, and worksheet photo to AI **P2**
  - Questions the parser couldn't resolve are unchecked by default, with a "fix inline" step on review.
- [ ] **AI:** server-side quota (402 + upgrade modal), zod-validated output, cost logging, and Gemini paid tier.
- [ ] **Discover:** fix the Marketplace (missing `rating` field, missing indexes, broken Fork and Upvote). Add a share-quiz link, folders and tags.

---

## 6. Phase P4: Grow & monetize (06, 07)

- [ ] **Host now, sign up after:** an anonymous Firebase session can host a library quiz, and the results are saved when they sign up.
- [ ] **Viral loops:** "Host your own" on the guest end screen, a "made with PopPop" mark on free-tier host screens, public quiz pages (SEO, schema.org Quiz markup), shareable result cards.
- [ ] **SEO basics:** og:image, robots.txt, sitemap, and prerendered public pages.
- [ ] **Paywall moments** (never shown to players, never during a live game): a lobby-full banner shown only to the host, a blurred report preview after the game, the AI quota running out at creation time.
- [ ] Enforce the plan on the server: player cap, AI credits and branding.
- [ ] Launch sequence: launch gates, then 100 Founding Teachers, then TikTok micro-creators, teacher Facebook groups, Reddit, TpT and Pinterest, then Product Hunt.

---

## 7. Phase P5: Depth

- **Question types in order:** images, poll, type-answer, multi-select, slider, ordering. (02)
- **Modes:** Accuracy/Mastery (no speed pressure, plus a second-chance round), co-op Boss Battle, and a student-paced live race with a teacher heatmap. (02)
- **Learning:** per-question stats stored for live games, a hardest-questions report, assigning missed questions, and spaced repetition. (02)
- **Scale:** Socket.IO Redis adapter, sticky sessions and per-game timer ownership. (01)

---

## 8. By category: where each owner starts

| Category | First three moves |
|---|---|
| **UI** | Token rebuild · answer tile (shape+letter+color) · projector type scale |
| **UX** | No-signup host path · `/j/CODE` with remembered name · personal result card |
| **Graphics / brand** | Name decision · logo (replacing the emoji) · icon set and mascot (if A or B) |
| **Motion & sound** | `motion` + tokens · lock-in/reveal/count-up choreography · sound sprite + Calm mode |
| **Game mechanics** | Scoring clock fix · host-paced reveal · scoring curve and modes |
| **Playability / reliability** | Player token + `session:resume` · Redis snapshots · server-authoritative timer |
| **Content creation** | Autosave · plain-text/ChatGPT importer · Kahoot XLSX |
| **Marketability** | Rename · honest landing page and legal pages · guest "Host your own" loop |
| **Revenue** | Fix Stripe webhook · server-only plan doc · pricing ladder and Event Pass |
| **Security / code health** | Map + zod crash fix · Firestore rules · shared types, tests and CI |
