# PopPop! Product Roadmap

> This file is the single source of truth for feature work.
> Check off items as they are completed. Add notes under each item as needed.
> Last updated: 2026-04-24

---

## AI Cost Model (read before implementing AI features)

### The problem
Every AI generation call costs real money. If you offer it free and unlimited, a single
heavy user can drain your budget fast.

### Chosen model: `gemini-2.5-flash-lite` (Gemini API / AI Studio)
Confirmed stable as of April 2026. Cheapest production-ready model in the Gemini lineup.

| Model | Status | Approx. cost per quiz (10 questions) |
|---|---|---|
| GPT-4o | Active | ~$0.012 |
| Gemini 2.5 Flash | Stable | ~$0.0005 |
| **Gemini 2.5 Flash-Lite** | **Stable — use this** | **~$0.0001** |
| Gemini 3.1 Flash-Lite | Preview — not prod-ready | TBD |
| Gemini 2.0 Flash | **Deprecated — do not use** | — |

Free tier on AI Studio: **1 500 requests/day** during development — no billing needed to start.
When Gemini 3.1 Flash-Lite exits preview, swap the model string in `aiGenerator.ts` — zero other changes.

### Recommended billing model: Token-bucket freemium

| Tier | Price | AI generations/month | Notes |
|---|---|---|---|
| **Free** | $0 | 5 | Enough to evaluate the feature |
| **Educator** | $9/mo | 100 | Target: classroom teachers |
| **Pro** | $19/mo | Unlimited | Target: corporate trainers, power users |
| **School Site** | $99/mo | Unlimited + custom branding | B2B, invoiced annually |

### Implementation plan (before writing any AI code)
1. Add a `plan` field (`free | educator | pro | site`) to the Firestore `users` collection.
2. Add an `aiCreditsUsed` counter (resets monthly via a Cloud Function cron).
3. Gate every AI API call server-side — never expose `GEMINI_API_KEY` to the client.
4. Return a `402 Payment Required` with a `reason: 'quota_exceeded'` JSON body when the
   limit is hit. The client shows an upgrade modal.
5. Use **Stripe** for billing. One-time setup, then it runs itself.
6. Add `cost_per_call` logging to every AI request so you can audit your Gemini bill
   against Stripe revenue at any time.

### Cost ceiling per user (worst case)
- Gemini 2.5 Flash-Lite: ~$0.0001 per call × 100 calls = **$0.01/user/month** on Educator tier
- Revenue on Educator tier: **$9.00/user/month**
- Gross margin on AI alone: **~99.9%**

### What to avoid
- Do NOT expose `GEMINI_API_KEY` in the Vite/client bundle — server `.env` only.
- Do NOT stream responses to the client on free tier (streaming is harder to quota-limit).
- Do NOT let users generate per question — generate a full quiz (10 questions) per credit
  to keep call count low.

---

## Tier 1 — Table Stakes
> Without these, the product is not production-ready.

- [x] **1.1 Game history & analytics**
  - Save `GameResult` document to Firestore at game end (scores, time-per-question, accuracy per player)
  - Build `/results/:gameId` report page visible to the host
  - Show "Recent Games" list on the Dashboard
  - Files to touch: `server/src/services/gameManager.ts`, `src/services/quizzes.ts`, new `src/pages/Results.tsx`

- [x] **1.2 Rejoin / disconnect recovery**
  - Track player socket state in `gameManager` (connected / disconnected)
  - On reconnect with matching `playerName + gameCode`, restore score and re-add to game
  - Show "Reconnecting..." UI on the player client instead of blank screen
  - Files: `server/src/services/gameManager.ts`, `server/src/index.ts`, `src/pages/Game.tsx`

- [x] **1.3 Host controls mid-game**
  - Skip question button (host view)
  - Pause / resume timer button
  - End game early button with confirmation dialog
  - Files: `server/src/index.ts`, `src/pages/Game.tsx`, `src/types/events.ts`

- [x] **1.4 Quick Launch from Dashboard**
  - "Quick Launch" button on each quiz card — one click opens a live lobby without extra steps
  - Show game code + QR code in a modal immediately
  - Files: `src/pages/Dashboard.tsx`, `src/pages/Dashboard.css`

---

## Tier 2 — Differentiation
> Features that give PopPop! a credible edge over Kahoot.

- [x] **2.1 AI question generation**
  - Model: **`gemini-2.5-flash-lite`** — server-side only, `GEMINI_API_KEY` in `server/.env`
  - "Generate with AI" button in QuizBuilder — topic, grade level, question count (max 10)
  - Structured JSON output via `responseSchema`; result wired into existing question flow
  - Files: `server/src/services/aiGenerator.ts` (new), `server/src/index.ts`, `src/pages/QuizBuilder.tsx`, `src/services/aiGenerate.ts` (new), `src/components/ui/AIGenerateModal.tsx` (new)

- [x] **2.2 Assignment mode (async / homework)**
  - Host can set a deadline instead of launching a live session
  - Students visit `/assignment/:code` at any time before the deadline
  - Answers stored per-student in Firestore; host sees aggregated results at `/assignment-report/:id`
  - Files: `src/types/assignment.ts`, `src/services/assignments.ts`, `src/pages/AssignmentTake.tsx`, `src/pages/AssignmentReport.tsx`, `src/pages/AssignmentsPage.tsx`, `src/pages/Dashboard.tsx`

- [x] **2.3 Custom branding per organisation**
  - Paid-tier: upload logo, set primary colour
  - Logo shown in Navbar; primary colour applied globally via CSS variable
  - Stored in Firebase Storage, referenced in `users/{uid}/branding` in Firestore
  - Files: `src/pages/OrgSettings.tsx`, `src/services/branding.ts`, `src/services/firebase.ts`, `src/components/layout/Navbar.tsx`

- [x] **2.4 Accessibility audit and fixes**
  - ARIA roles, `aria-label`, `aria-live` added to game timer, answer buttons, progress bar, banners
  - `role="timer"`, `role="alert"`, `role="status"`, `role="progressbar"`, `aria-pressed` on choice buttons
  - `--color-danger`, `--color-danger-bg`, `--color-surface` design tokens added to `variables.css`
  - Files: `src/pages/Game.tsx`, `src/styles/variables.css`

---

## Tier 3 — Moat Builders
> Hard to copy once you have them. Build after Tier 1 + 2 are solid.

- [x] **3.1 Student accounts with progress tracking**
  - Optional student sign-up (email or Google)
  - Track per-student: games played, average score, accuracy by subject
  - Personal dashboard with streaks and weak-topic highlights
  - Files: new `src/pages/StudentDashboard.tsx`, `src/types/user.ts`, Firestore schema update

- [x] **3.2 Curriculum standards tagging**
  - Tag each question with a CCSS / NGSS standard code (e.g. `CCSS.MATH.3.OA.A.1`)
  - Searchable standards browser in the Library
  - Filter quiz library by standard
  - Files: `src/types/quiz.ts`, `src/pages/QuizBuilder.tsx`, `src/pages/Library.tsx`, `scripts/seedLibrary.ts`

- [x] **3.3 Public quiz marketplace**
  - Creators can publish quizzes as `visibility: 'public'`
  - Browse page: search by subject, grade, rating
  - "Fork" button: copy any public quiz to your own dashboard
  - Rating / upvote system
  - Files: new `src/pages/Marketplace.tsx`, `src/services/quizzes.ts`, Firestore rules update

- [x] **3.4 Team mode**
  - Players grouped into teams at lobby join
  - Individual scores aggregate to team totals in real time
  - Team leaderboard on game screen alongside individual leaderboard
  - Files: `server/src/services/gameManager.ts`, `src/pages/Game.tsx`, `src/types/game.ts`

---

## Technical Debt (resolve before scaling)

- [x] **TD-1** Replace `xlsx` with `@e965/xlsx` (CVE-free community fork, identical API, zero code changes beyond the import line) — also ran `npm audit fix`, cleared all 9 remaining vulnerabilities across lodash, vite, rollup, react-router, socket.io-parser, protobufjs, etc.
- [x] **TD-2** Add `husky` + `lint-staged` to `package.json` — emoji pre-commit hook now lives in `.husky/pre-commit` and auto-installs for all contributors on `npm install` via the `prepare` script; old manual `.git/hooks/pre-commit` removed
- [x] **TD-3** Updated `server/src/validators/schemas.ts` — `QuestionSchema` now accepts `questionType: z.enum(['multiple-choice', 'true-false']).optional()`; T/F imported questions no longer stripped by Zod at game creation
- [x] **TD-4** Add client-side caching (React Query or SWR) for Firestore reads — prevents hot-quiz budget spikes
- [x] **TD-5** Set up Stripe billing — `POST /api/billing/create-checkout` + webhook on server; `src/pages/Pricing.tsx` + `src/services/billing.ts` on client; `stripe` on server, `@stripe/stripe-js` on client

---

## Completed

- [x] Git repository setup and initial push
- [x] QR code: transparent background, white foreground, no emoji label
- [x] Navbar: remove emoji from "Try Demo" link (desktop + mobile)
- [x] Landing CTA: remove emoji prefix
- [x] Demo.tsx: remove duplicate CSS import
- [x] CSS tokens: consolidate raw hex into `variables.css`, sweep Demo.css + Landing.css
- [x] `src/services/db.ts`: typed Firestore helper layer (`getCol`, `getDocRef`, `safeFetchDoc`, `safeFetchDocs`)
- [x] `EVENTS` const: socket event names as typed constants, eliminate string literals in Game.tsx + server/src/index.ts
- [x] TypeScript strict mode: confirmed enabled (`tsconfig.app.json`)
- [x] Emoji enforcement: `scripts/check-no-emoji.sh` + `npm run lint:emoji` + `.git/hooks/pre-commit`
- [x] Quiz import feature: `quizImport.ts` parsing engine, `ImportModal.tsx`, variable choices (2-4), True/False type toggle in QuizBuilder
- [x] UX: hide "Try Demo" in navbar for authenticated users
- [x] UX: redirect `/` to `/dashboard` for authenticated users


---

## Tier 4 — Kahoot Parity + Competitive Differentiators
> Competitive analysis against Kahoot. These are the gaps educators cite when choosing platforms. Build these to make switching from Kahoot frictionless and to make staying on Ladle obvious.

### Where We Beat Kahoot Today (Our Moat)
| Feature | Ladle | Kahoot Free | Kahoot Paid |
|---|---|---|---|
| AI quiz generation | ✅ Free | ❌ | ✅ $$$|
| Async homework/assignment mode | ✅ Free | ❌ | ✅ $$$|
| Curriculum standards tagging (CCSS/NGSS) | ✅ | ❌ | ❌ |
| Public marketplace + fork | ✅ | Limited | Limited |
| Team mode | ✅ Free | ❌ | ✅ $$$|
| Custom branding | ✅ Paid | ❌ | ✅ $$$ |
| Host reconnect / pause / extend time | ✅ | ❌ | ❌ |
| Student progress dashboard | ✅ | ❌ | ✅ $$$ |

### Where Kahoot Beats Us Today (The Gaps)

- [ ] **4.1 Per-question time limits (QuizBuilder UI)**
  - **Why it matters:** Harder questions deserve more time. Kahoot lets each question have its own timer. Educators cite this constantly.
  - **Status:** `Question.durationSec` already exists in our type and server. This is purely a **QuizBuilder UI gap**.
  - **Implementation:**
    - In `src/pages/QuizBuilder.tsx`, add a `<select>` per question card (next to the delete button) with preset options: `5s | 10s | 20s | 30s | 60s | 120s`. Default = quiz-level default (currently 30s).
    - Store as `question.durationSec: number` on the question object (already in `src/types/quiz.ts`).
    - No server changes needed — `gameManager.ts` already reads `question.durationSec`.
  - **Effort:** ~2 hours | **Impact:** High (educator-facing, visible)
  - **Files:** `src/pages/QuizBuilder.tsx`, `src/pages/QuizBuilder.css`

- [ ] **4.2 Image support per question**
  - **Why it matters:** Visual questions are the #1 request from science and history teachers. Without images, Ladle is text-only — a significant teaching limitation.
  - **Implementation:**
    - Add `imageUrl?: string` to `Question` in `src/types/quiz.ts`.
    - In `QuizBuilder.tsx`: add an "Add Image" button per question card. Opens a modal with a URL input (paste image link) OR a file upload that pushes to Firebase Storage at `quizImages/{quizId}/{questionIndex}` and stores the returned download URL.
    - In `src/pages/Game.tsx`: if `question.imageUrl` is set, render `<img src={question.imageUrl} className="question-image" />` above the question text for both host and player views.
    - Cap uploads at 2MB client-side with a `file.size` check before upload.
  - **Effort:** ~4 hours | **Impact:** Very High
  - **Files:** `src/types/quiz.ts`, `src/pages/QuizBuilder.tsx`, `src/pages/QuizBuilder.css`, `src/pages/Game.tsx`, `src/pages/Game.css`, `src/services/firebase.ts`

- [ ] **4.3 Live answer-distribution chart for host (during reveal)**
  - **Why it matters:** After each question, Kahoot shows the host a bar chart of how many players chose each answer, colour-coded correct/incorrect. This is the moment teachers learn what students don't understand. Without it, Ladle is "less useful for formative assessment."
  - **Implementation:**
    - Server already tracks answers per player in `gameManager`. On question end, emit `question:results` with `answerCounts: Record<string, number>` (choice index → count) alongside the existing leaderboard event.
    - In `Game.tsx` host reveal phase: render a horizontal bar chart using pure CSS flex (no charting library needed — just `div` bars with `width: ${pct}%`). Highlight the correct answer bar in green, wrong in red.
    - Post-game: pass `questionStats[]` into the `gameResult` payload so `Results.tsx` can render a per-question accuracy breakdown table.
  - **Effort:** ~3 hours | **Impact:** Very High (direct teacher value)
  - **Files:** `server/src/services/gameManager.ts`, `server/src/index.ts`, `src/pages/Game.tsx`, `src/pages/Game.css`, `src/pages/Results.tsx`, `src/pages/Results.css`

- [ ] **4.4 Confetti + podium celebration on results**
  - **Why it matters:** Delight matters. Kahoot's confetti + podium music creates the dopamine hit that makes students want to play again. This is a retention mechanic, not just eye candy.
  - **Implementation:**
    - `npm install canvas-confetti` + `npm install --save-dev @types/canvas-confetti`
    - In `Game.tsx`, when the host receives `game:ended` and the podium is shown, fire `confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 } })`.
    - Add a 3-2-1 podium animation using CSS `@keyframes slideUp` with `animation-delay` staggered per rank (3rd = 0ms, 2nd = 300ms, 1st = 600ms).
    - Optional: add a short victory sound using the Web Audio API `AudioContext` (no external dependency).
  - **Effort:** ~2 hours | **Impact:** High (student-facing delight)
  - **Files:** `src/pages/Game.tsx`, `src/pages/Game.css`, `package.json`

- [ ] **4.5 Duplicate question + drag-to-reorder in QuizBuilder**
  - **Why it matters:** Kahoot makes it trivial to clone a question and tweak one option. Ours forces re-typing from scratch. Teachers building 20-question quizzes notice this immediately.
  - **Implementation:**
    - **Duplicate:** Add a "Duplicate" icon button per question card in `QuizBuilder.tsx`. On click, deep-clone the question object, assign a new UUID (`crypto.randomUUID()`), and splice it in directly after the source question.
    - **Drag-to-reorder:** Install `@dnd-kit/core` and `@dnd-kit/sortable`. Wrap the question list in `<SortableContext>`. Each question card becomes a `<SortableItem>`. The drag handle is a `⠿` icon in the top-left of each card. On drag end, reorder the `questions` array via `arrayMove` from `@dnd-kit/sortable`.
  - **Effort:** ~4 hours | **Impact:** High (creator QoL)
  - **Files:** `src/pages/QuizBuilder.tsx`, `src/pages/QuizBuilder.css`, `package.json`

- [ ] **4.6 Additional question types (Poll, Slide)**
  - **Why it matters:** Polls (no correct answer, shows word cloud) let teachers take quick opinions. Slide (content-only, no answer) lets teachers embed a teaching moment between questions. Kahoot uses both heavily.
  - **Implementation (Poll):**
    - Add `'poll'` to `questionType` enum in `src/types/quiz.ts`.
    - In `gameManager.ts`: if `question.questionType === 'poll'`, accept all answers as correct, skip scoring.
    - In `Game.tsx` host reveal: render answer distribution chart (from 4.3) without marking any choice "correct." Show percentage bar per option.
  - **Implementation (Slide):**
    - Add `'slide'` to `questionType` enum.
    - In `gameManager.ts`: a slide question has no timer countdown; server waits for `host:next` event.
    - In `Game.tsx` host view: show only the question text/image, a "Next" button (no choices, no timer). Player view: show question text centered with a "Waiting..." state.
  - **Effort:** ~5 hours | **Impact:** Medium-High
  - **Files:** `src/types/quiz.ts`, `src/pages/QuizBuilder.tsx`, `src/pages/Game.tsx`, `src/pages/Game.css`, `server/src/services/gameManager.ts`, `server/src/validators/schemas.ts`

- [ ] **4.7 Scoring mode options (Classic / Equal / No-score)**
  - **Why it matters:** Teachers who use Ladle for surveys or low-stakes review want to disable competitive scoring. Kahoot calls this "No points mode." Classic = speed bonus. Equal = correct = same pts regardless of speed.
  - **Implementation:**
    - Add `scoringMode: 'classic' | 'equal' | 'none'` to `Quiz` type and QuizBuilder settings panel.
    - In `gameManager.ts` `recordAnswer()`: branch on `game.scoringMode`. `classic` = existing formula. `equal` = 1000 pts if correct, 0 if not. `none` = 0 pts always (still tracks correct/incorrect for analytics).
    - Host lobby screen shows the active scoring mode as a badge.
  - **Effort:** ~3 hours | **Impact:** Medium (broadens use cases for teachers)
  - **Files:** `src/types/quiz.ts`, `src/pages/QuizBuilder.tsx`, `server/src/services/gameManager.ts`, `src/pages/Game.tsx`

- [ ] **4.8 Installable PWA (Progressive Web App)**
  - **Why it matters:** Kahoot has native iOS/Android apps. Students expect to install a home-screen icon. A PWA is 90% of the benefit at 5% of the cost.
  - **Implementation:**
    - Create `public/manifest.json` with `name`, `short_name: "Ladle"`, `start_url: "/"`, `display: "standalone"`, `background_color`, `theme_color`, icon sets (192x192, 512x512 PNGs in `public/icons/`).
    - Create `public/sw.js` — a minimal Workbox or hand-rolled service worker that pre-caches the shell (`/`, `/join`, `index.html`, main JS bundle) and implements a network-first strategy for API calls.
    - Add `<link rel="manifest" href="/manifest.json">` and `<meta name="theme-color">` to `index.html`.
    - Register SW in `src/main.tsx`: `if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js')`.
    - The join page (`/join`) should work offline-first showing a "You're offline — connect to join a game" message.
  - **Effort:** ~4 hours | **Impact:** High (student acquisition + retention)
  - **Files:** `public/manifest.json`, `public/sw.js`, `public/icons/`, `index.html`, `src/main.tsx`

- [ ] **4.9 Nickname generator for anonymous players**
  - **Why it matters:** Kahoot auto-suggests funny animal + adjective names (e.g. "QuantumPenguin42"). Students love it. It removes the blank-field anxiety at join and makes sessions feel playful instantly.
  - **Implementation:**
    - Create `src/data/nicknames.ts` — two arrays: `ADJECTIVES` (100 entries) and `NOUNS` (100 entries, animal/food/space themed). Export `generateNickname(): string` → `ADJECTIVES[rand] + NOUNS[rand] + Math.floor(Math.random()*99)`.
    - In `src/pages/JoinGame.tsx`: next to the nickname input field, add a `🎲 Suggest` button that calls `generateNickname()` and sets the field value. Auto-call on page load if the field is empty.
  - **Effort:** ~1 hour | **Impact:** Medium (first-impression delight)
  - **Files:** `src/data/nicknames.ts` (new), `src/pages/JoinGame.tsx`, `src/pages/JoinGame.css`

- [ ] **4.10 AI quota enforcement + upgrade gate**
  - **Why it matters:** The AI endpoint is currently free and unlimited. One power user could drain the Gemini API budget. This is also the primary conversion trigger for the paid plan.
  - **Implementation:**
    - In Firestore, add `aiCreditsUsed: number` and `aiCreditsResetAt: Timestamp` to the user doc. Free plan = 10 generations/month.
    - In `server/src/index.ts` (or dedicated middleware): before calling Gemini, fetch the user doc, check `aiCreditsUsed < AI_FREE_QUOTA`. If over: return `HTTP 402` with `{ error: 'quota_exceeded' }`.
    - On success: `increment aiCreditsUsed` via `FieldValue.increment(1)`.
    - Monthly reset: Cloud Function (or a cron on Render) that runs on the 1st of each month, queries users where `aiCreditsResetAt < now()`, resets the counter.
    - Client: `src/services/aiGenerate.ts` — check for `402` response, dispatch a `quota-exceeded` event. `AIGenerateModal.tsx` catches it and renders an upgrade CTA button linking to `/pricing`.
  - **Effort:** ~5 hours | **Impact:** Very High (revenue + cost control)
  - **Files:** `server/src/index.ts`, `server/src/middleware/rateLimit.ts`, `src/services/aiGenerate.ts`, `src/components/ui/AIGenerateModal.tsx`, `src/pages/Pricing.tsx`

- [ ] **4.11 Firestore security rules — Tier 3 collections**
  - **Why it matters:** `studentProgress`, `assignments`, and marketplace `quizzes` are live in production but the current rules don't protect them correctly. This is a security and compliance requirement before any educator stores real student data.
  - **Implementation:**
    - `studentProgress/{uid}/entries/{entryId}`: `allow read, write: if request.auth.uid == uid;`
    - `assignments/{assignmentId}`: read allowed if `request.auth.uid == resource.data.hostId` OR `request.auth != null` (students need to load it by code). Write only by `hostId`.
    - `quizzes` marketplace read: `allow read: if resource.data.isPublic == true || request.auth.uid == resource.data.creatorId;`
    - `quizzes` rating/fork write: `allow update: if request.auth != null && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['rating', 'ratingCount', 'forkCount']);`
    - Deploy: `firebase deploy --only firestore:rules`
  - **Effort:** ~2 hours | **Impact:** Critical (compliance/security)
  - **Files:** `firestore.rules`

- [ ] **4.12 Open-ended / short-answer question type**
  - **Why it matters:** Kahoot's "Open Answer" lets teachers see free-text responses in a word cloud. It's their #1 premium feature for discussion prompts. Offering it free on Ladle is a direct conversion wedge.
  - **Implementation:**
    - Add `'open-ended'` to `questionType` enum.
    - In `QuizBuilder.tsx`: when type = open-ended, hide the choices editor; show a "Model answer (for reference)" text field stored as `question.modelAnswer?: string`.
    - In `gameManager.ts`: open-ended questions skip auto-scoring. Record each player's text response in the game state. On question end, emit all responses to the host.
    - In `Game.tsx` host reveal: show a scrollable list of all submitted text answers (anonymised or named based on `showNames` toggle). Host can tap any answer to "mark correct" — this awards full points retroactively. Emit `host:mark-answer` with `{playerId, correct: boolean}`.
    - Player view: show a `<textarea>` instead of choice buttons.
  - **Effort:** ~6 hours | **Impact:** High (unique free feature vs Kahoot)
  - **Files:** `src/types/quiz.ts`, `src/pages/QuizBuilder.tsx`, `src/pages/Game.tsx`, `src/pages/Game.css`, `server/src/services/gameManager.ts`, `server/src/index.ts`, `server/src/validators/schemas.ts`

---

### Tier 4 Priority Order (Senior SWE Recommendation)

Build in this sequence — each item unblocks or amplifies the next:

1. **4.11** — Security rules first. Always. Non-negotiable before more user data accumulates.
2. **4.1** — Per-question timers: zero server work, huge educator impact, ships in 2 hours.
3. **4.9** — Nickname generator: 1 hour, instant first-impression win.
4. **4.3** — Live answer distribution: turns Ladle into a formative assessment tool, not just a game.
5. **4.4** — Confetti/podium: small code change, outsized emotional impact.
6. **4.10** — AI quota: required before any growth/marketing push.
7. **4.5** — Duplicate + drag reorder: creator QoL, reduces quiz build time.
8. **4.2** — Image support: science/history teachers can't live without this.
9. **4.7** — Scoring modes: broadens use to survey/review contexts.
10. **4.8** — PWA: student acquisition channel.
11. **4.6** — Poll + Slide question types: content-teaching workflows.
12. **4.12** — Open-ended: big build, big payoff, our best free-vs-Kahoot wedge.
