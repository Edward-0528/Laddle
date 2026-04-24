# PopPop! Product Roadmap

> This file is the single source of truth for feature work.
> Check off items as they are completed. Add notes under each item as needed.
> Last updated: 2026-04-24

---

## AI Cost Model (read before implementing AI features)

### The problem
Every AI generation call costs real money (OpenAI GPT-4o is ~$0.005 per quiz generation
at ~1 500 tokens). If you offer it free and unlimited, a single heavy user can drain $50/month.

### Recommended model: Token-bucket freemium

| Tier | Price | AI generations/month | Notes |
|---|---|---|---|
| **Free** | $0 | 5 | Enough to evaluate the feature |
| **Educator** | $9/mo | 100 | Target: classroom teachers |
| **Pro** | $19/mo | Unlimited | Target: corporate trainers, power users |
| **School Site** | $99/mo | Unlimited + custom branding | B2B, invoiced annually |

### Implementation plan (before writing any AI code)
1. Add a `plan` field (`free | educator | pro | site`) to the Firestore `users` collection.
2. Add an `aiCreditsUsed` counter (resets monthly via a Cloud Function cron).
3. Gate every AI API call server-side — never call OpenAI from the client.
4. Return a `402 Payment Required` with a `reason: 'quota_exceeded'` JSON body when the
   limit is hit. The client shows an upgrade modal.
5. Use **Stripe** for billing. One-time setup, then it runs itself.
6. Add `cost_per_call` logging to every AI request so you can audit your OpenAI bill
   against Stripe revenue at any time.

### Cost ceiling per user (worst case)
- GPT-4o: ~$0.005 per call × 100 calls = **$0.50/user/month** on Educator tier
- Revenue on Educator tier: **$9.00/user/month**
- Gross margin on AI alone: **~94%**

### What to avoid
- Do NOT expose your OpenAI API key in the Vite/client bundle (use `OPENAI_API_KEY` in the
  server `.env` only).
- Do NOT stream responses to the client on free tier (streaming is harder to quota-limit).
- Do NOT let users generate questions for every individual question — generate a full quiz
  (10 questions) per credit to keep call count low.

---

## Tier 1 — Table Stakes
> Without these, the product is not production-ready.

- [ ] **1.1 Game history & analytics**
  - Save `GameResult` document to Firestore at game end (scores, time-per-question, accuracy per player)
  - Build `/results/:gameId` report page visible to the host
  - Show "Recent Games" list on the Dashboard
  - Files to touch: `server/src/services/gameManager.ts`, `src/services/quizzes.ts`, new `src/pages/Results.tsx`

- [ ] **1.2 Rejoin / disconnect recovery**
  - Track player socket state in `gameManager` (connected / disconnected)
  - On reconnect with matching `playerName + gameCode`, restore score and re-add to game
  - Show "Reconnecting..." UI on the player client instead of blank screen
  - Files: `server/src/services/gameManager.ts`, `server/src/index.ts`, `src/pages/Game.tsx`

- [ ] **1.3 Host controls mid-game**
  - Skip question button (host view)
  - Pause / resume timer button
  - End game early button with confirmation dialog
  - Files: `server/src/index.ts`, `src/pages/Game.tsx`, `src/types/events.ts`

- [ ] **1.4 Quick Launch from Dashboard**
  - "Quick Launch" button on each quiz card — one click opens a live lobby without extra steps
  - Show game code + QR code in a modal immediately
  - Files: `src/pages/Dashboard.tsx`, `src/pages/Dashboard.css`

---

## Tier 2 — Differentiation
> Features that give PopPop! a credible edge over Kahoot.

- [ ] **2.1 AI question generation**
  - > **Cost gate must be implemented (see top of file) before this goes live.**
  - "Generate with AI" button in QuizBuilder — prompt: topic + grade level + question count
  - Server-side OpenAI call (`gpt-4o`, structured output / JSON mode)
  - Quota enforcement: check `aiCreditsUsed < plan limit` before calling OpenAI
  - Return generated questions in the same `ImportResult` format so the existing ImportModal handles review/selection
  - Files: `server/src/services/aiGenerator.ts` (new), `server/src/index.ts`, `src/pages/QuizBuilder.tsx`

- [ ] **2.2 Assignment mode (async / homework)**
  - Host can set a deadline instead of launching a live session
  - Students visit `/join` with the code at any time before the deadline
  - Answers stored per-student in Firestore; host sees aggregated results after deadline
  - Files: new `src/pages/Assignment.tsx`, `src/services/quizzes.ts`, Firestore schema update

- [ ] **2.3 Custom branding per organisation**
  - Paid-tier: upload logo, set primary colour
  - Logo shown in lobby, game screen header, and result screen
  - Stored in Firebase Storage, referenced in `users` or a new `organisations` collection
  - Files: new `src/pages/OrgSettings.tsx`, `src/services/firebase.ts`, `src/pages/Game.tsx`

- [ ] **2.4 Accessibility audit and fixes**
  - Full keyboard navigation for all interactive elements
  - ARIA roles and `aria-live` regions for score/timer updates
  - WCAG 2.1 AA colour contrast check across all pages (run `axe-core` or Lighthouse)
  - Files: all `.tsx` and `.css` files — run audit first to find specific violations

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

- [ ] **TD-1** Replace `xlsx` with `exceljs` — `npm audit` reports 1 critical + 6 high vulns in current xlsx package
- [ ] **TD-2** Add `husky` + `lint-staged` to `package.json` so the emoji pre-commit hook installs automatically for all contributors (`npm install`), not just locally
- [ ] **TD-3** Update `server/src/validators/schemas.ts` to accept `questionType: 'multiple-choice' | 'true-false'` — currently T/F questions imported via the new import feature may be stripped by Zod validation at game creation
- [ ] **TD-4** Add client-side caching (React Query or SWR) for Firestore reads — prevents hot-quiz budget spikes
- [ ] **TD-5** Set up Stripe billing before any paid tier goes live

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
