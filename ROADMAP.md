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

- [ ] **3.1 Student accounts with progress tracking**
  - Optional student sign-up (email or Google)
  - Track per-student: games played, average score, accuracy by subject
  - Personal dashboard with streaks and weak-topic highlights
  - Files: new `src/pages/StudentDashboard.tsx`, `src/types/user.ts`, Firestore schema update

- [ ] **3.2 Curriculum standards tagging**
  - Tag each question with a CCSS / NGSS standard code (e.g. `CCSS.MATH.3.OA.A.1`)
  - Searchable standards browser in the Library
  - Filter quiz library by standard
  - Files: `src/types/quiz.ts`, `src/pages/QuizBuilder.tsx`, `src/pages/Library.tsx`, `scripts/seedLibrary.ts`

- [ ] **3.3 Public quiz marketplace**
  - Creators can publish quizzes as `visibility: 'public'`
  - Browse page: search by subject, grade, rating
  - "Fork" button: copy any public quiz to your own dashboard
  - Rating / upvote system
  - Files: new `src/pages/Marketplace.tsx`, `src/services/quizzes.ts`, Firestore rules update

- [ ] **3.4 Team mode**
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
