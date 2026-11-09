# 07 — Revenue & Monetization Audit

**Auditor role:** Revenue / Monetization Strategist
**Date:** 2026-11-08
**Scope:** ROADMAP.md (AI Cost Model, tiers), IMPROVEMENT_PLAN.md (Phase 6), `src/pages/Pricing.tsx`, `src/services/billing.ts`, `src/types/user.ts`, `src/context/AuthContext.tsx`, `src/pages/OrgSettings.tsx`, `src/services/branding.ts`, `src/pages/Marketplace.tsx`, `server/src/index.ts`, `server/src/services/aiGenerator.ts`, `server/src/services/gameManager.ts`, `server/src/validators/schemas.ts`, `firestore.rules`, `render.yaml`.
**No code was changed.**

---

## TL;DR

1. **Nothing is monetized today.** You cannot take a dollar and deliver a different product for it. The Stripe webhook can't verify signatures, it can't find the user, and even if it set `plan: 'pro'`, no code anywhere reads `plan`.
2. **All limits are UI-only or missing.** AI generation is an open, unauthenticated, unmetered endpoint. The player cap is a hardcoded 50 for everyone. Quiz-count limits and branding gates don't exist. The server doesn't know who is hosting a game.
3. **The pricing page promises things that don't match the code.** It says 10 free quizzes (code says 5). It says AI is Pro-only (it's free and open to anyone). It offers a "free trial" that doesn't exist and a "billing portal" that doesn't exist.
4. **Self-upgrade is not possible today, but only by accident.** `firestore.rules` has no `/users` rule, so everything is denied by default. That same default also breaks the Brand Settings page for everyone. The rule proposed in IMPROVEMENT_PLAN.md (`allow read, write if uid == userId`) **would** let any user write `plan: 'pro'` on their own doc. Do not ship that rule.
5. **The proposed $9/$19/$99 ladder is overpriced for K‑12 teachers** paying out of pocket (Blooket, Gimkit and Quizizz run about $3–5/mo billed annually). It is underbuilt for schools (they buy annually by PO, not $99/mo). And it is missing the highest-margin SKU for this product: an **event day-pass**.
6. **Unit economics are excellent once abuse is closed.** Infra plus AI cost is well under $0.01 per game. Break-even is about 10–15 paying hosts on current infra. The real cost risks are an open AI endpoint and Render's free tier sleeping in the middle of a class.

---

## 1. What exists in code vs. on the pricing page

| Capability | Pricing page (`Pricing.tsx`) | Roadmap / Plan | Actually in code | Enforced server-side? |
|---|---|---|---|---|
| Plans | Free, Pro $9/mo | Free / Educator $9 / Pro $19 / Site $99 | `UserPlan = 'free' \| 'pro'` (`src/types/user.ts`) | — |
| Quiz count | Free "up to 10 quizzes" | 5 (Phase 6) | `PLAN_LIMITS.free.maxQuizzes = 5`, **never imported anywhere** | No |
| Questions per quiz | — | Free 20 | `PLAN_LIMITS` says 20; server caps **50 for all** (`CreateGameSchema`) | Global only |
| Players per game | — | Free 20 / Pro 100 | `PLAN_LIMITS` 20/100 unused. Server `MAX_PLAYERS_PER_GAME = 50` for everyone. The quiz's own `maxPlayers` (20/35/50) is never sent to the server | Global only |
| AI generation | "Pro" feature | Free 5/mo, Educator 100 | `POST /api/ai/generate`: **no auth, no quota, no rate limit** | **No** |
| Async assignments | "Pro" feature | Roadmap table says "Free" | Free for everyone | No |
| Custom branding | "Pro" feature | "Paid-tier" | `OrgSettings` lets any signed-in user save. Writes to `users/{uid}` are **denied by current rules**, so it fails for everyone. Branding only shows in the host's own Navbar, never on player screens | No |
| Advanced analytics / CSV export | "Pro" | Pro | Not gated | No |
| Free trial | "Start Free Trial" CTA | — | None | — |
| Billing portal / cancel | FAQ: "Cancel… from your billing portal" | — | **No portal endpoint** | — |
| Ad-free | — | Phase 6 lists "Ad-free experience" as Pro | No ads (good, keep it that way, see §4) | — |
| Footer "Pricing" link | — | — | Points to `/` not `/pricing` (`Footer.tsx:42`) | — |
| Upgrade success banner | Renders on `/pricing?upgraded=1` | — | Stripe `success_url` is `/dashboard?upgraded=1`, so the banner never shows | — |

**Bottom line:** the "Pro" plan is a price tag with no product behind it. If a user paid today, nothing would change for them, and with the webhook bugs below their account wouldn't even be flagged.

---

## 2. Stripe checkout and webhook: is it wired correctly?

**No. There are four independent bugs, and any one of them is enough to stop upgrades from working.**

### 2.1 Webhook signature verification always fails (blocker)
`server/src/index.ts`: `app.use(express.json())` is registered globally, **before** the webhook route is declared with `express.raw({ type: 'application/json' })`. Stripe sends `Content-Type: application/json`, so the global JSON parser consumes the stream first. `express.raw` then sees an already-parsed body and skips. `stripe.webhooks.constructEvent(req.body, …)` gets an object instead of the raw Buffer and throws. Every webhook returns 400.
**Fix:** mount the webhook route *before* `app.use(express.json())`. Alternatively, use `express.json({ verify: (req, _res, buf) => { req.rawBody = buf } })` and pass `rawBody` to `constructEvent`.

### 2.2 The webhook can't find the user (blocker)
The checkout session sets `metadata: { uid }` on the **Checkout Session**. The webhook reads `sub.metadata.uid` from **`customer.subscription.*`** events. Session metadata does not copy to the Subscription, so `uid` is always `undefined` and nothing gets written.
**Fix:** add `subscription_data: { metadata: { uid } }` and `client_reference_id: uid` to the session. Also handle `checkout.session.completed` and persist `stripeCustomerId` and `stripeSubscriptionId` on the user. Keep a `stripeCustomers/{customerId} → uid` map so later events (`invoice.payment_failed`, portal changes) resolve even without metadata.

### 2.3 Failures are swallowed, so Stripe never retries
If `FIREBASE_ADMIN_CREDENTIALS` is missing, or the Firestore write throws, the handler still returns `200 { received: true }`. Stripe marks the event delivered and the paying user is never upgraded, with no retry.
**Fix:** return 5xx when the entitlement write fails or admin isn't configured. Log and alert on it. Store processed `event.id`s for idempotency.

### 2.4 Status mapping is wrong
`plan = sub.status === 'active' ? 'pro' : 'free'`. This sends `trialing` users to free (a trial would break). It also downgrades `past_due` users instantly on the first failed card retry (causing churn and support load). And events can arrive out of order.
**Fix:** treat `active` and `trialing` as entitled. Give `past_due` a grace period of about 7 days (Stripe Smart Retries). Set `free` only on `canceled`, `unpaid` or `incomplete_expired`. Compare `event.created` or re-fetch the subscription from Stripe instead of trusting event order.

### 2.5 Other checkout issues
- **Unauthenticated checkout:** `uid` and `email` come from the request body. Anyone can start a checkout attributed to any uid. Impact is low (they'd be paying for someone else), but it also allows duplicate subscriptions and mismatched emails. **Fix:** verify a Firebase ID token (`Authorization: Bearer`) and derive uid and email server-side. Reuse an existing `customer` if one is on file. Block checkout if already subscribed and send the user to the portal instead.
- **No Customer Portal endpoint**, even though the FAQ promises one. Without it, "cancel anytime" turns into support emails and chargebacks. Add `POST /api/billing/portal` → `stripe.billingPortal.sessions.create`.
- `payment_method_types: ['card']` blocks Apple Pay / Google Pay / Link, which hurts conversion. Omit it and use dynamic payment methods.
- Only one price ID (`STRIPE_PRO_PRICE_ID`), so there is no annual option. Add monthly and annual prices per tier, plus `allow_promotion_codes: true` for edu/launch codes.
- No tax handling. Turn on `automatic_tax` (Stripe Tax) if selling outside the US or to US states with SaaS tax.
- The `success_url` path is mismatched (see §1).

---

## 3. Exploits and enforcement gaps (each with a fix)

| # | Exploit / gap | Severity | Fix |
|---|---|---|---|
| E1 | **Free unlimited AI for anyone on the internet.** `POST /api/ai/generate` has no auth, no per-user quota and no IP rate limit (`express-rate-limit` is a dependency but is never used). CORS does not stop curl or scripts. A script at 1 req/s costs about $750+/mo at current per-call cost. It can also burn the Gemini key's quota and break AI for paying users. | **High** | Require a Firebase ID token and look up entitlement. Use a transactional counter at `aiUsage/{uid}_{YYYYMM}` (Admin SDK). Return `402 {reason:'quota_exceeded'}` (matching ROADMAP). Add a per-IP limiter (express-rate-limit, about 10/min) and a Google Cloud budget alert / hard quota on the key. Log `cost_per_call` (ROADMAP item 6, not done). |
| E2 | **Self-upgrade by writing your own user doc.** Not possible today, only because `/users` has no rule (default deny). The IMPROVEMENT_PLAN §5 rule `match /users/{userId} { allow read, write: if request.auth.uid == userId; }` would let any user `updateDoc(users/me, {plan:'pro', aiCreditsUsed:0})`. | **High (latent)** | Never put entitlement fields in a client-writable doc. Either (a) keep `users/{uid}` client-writable only for whitelisted keys: `allow update: if isOwner(uid) && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['displayName','photoURL','branding'])`, or (b) better, move entitlements to `entitlements/{uid}` with `allow read: if isOwner(uid); allow write: if false;`, written only by the Admin SDK (webhook). Optionally mirror `plan` into a **Firebase custom claim** so the server can check it from the ID token without a Firestore read. |
| E3 | **Brand Settings is broken for everyone**, including future payers. With no `/users` rule, `updateDoc(users/{uid}, {'branding.*'})` is denied (errors are swallowed in `branding.ts`, so the UI shows "saved"). Storage rules for `logos/{uid}` aren't in the repo. Branding never reaches player screens anyway, so there's nothing to sell yet. | Med | Add the whitelisted-keys rule from E2 and a `storage.rules` restricting `logos/{uid}/*` to the owner, images only, ≤2 MB. Render branding in lobby, game and results **only if the server confirms the host is entitled**: on `host:create`, the server reads the host's entitlement and attaches `branding` to the game state it broadcasts. Never trust a client flag. |
| E4 | **The player cap can't be sold.** `host:create` carries no identity, so the server can't tell a paying host from a free one. Everyone gets 50. The per-quiz `maxPlayers` is ignored. | **High (revenue)** | Pass a Firebase ID token in the Socket.IO handshake (`auth: { token }`) and verify it with `admin.auth().verifyIdToken` in `io.use()`. Cache the entitlement per uid (60 s TTL). Set `game.maxPlayers` from the plan in `createGame`, and check it in `addPlayer` (it already checks a constant). |
| E5 | **Anyone can lock paying customers out.** `MAX_ACTIVE_GAMES = 100` is global. `host:create` is anonymous and rate-limited only per socket (3/min), so a script opening many sockets can fill all 100 slots ("Server is at capacity"). | **High (SLA)** | Require auth to host. Limit concurrent games per uid (Free 1, paid 3, Site/Event more). Size the global cap by memory rather than a fixed 100. Add per-IP connection limits. |
| E6 | **Quiz-count limit isn't enforceable.** Quizzes are created client-side with `addDoc`, and rules can't count documents. | Low | Recommendation: **drop the quiz-count paywall** (see §5, it's hostile and nearly free to serve). If you keep one, create quizzes through a server endpoint, or keep a `users/{uid}.quizCount` counter that a rule checks with `getAfter()` in the same batch. |
| E7 | **Every quiz is world-listable.** `allow list: if true` on `/quizzes` means anyone, even unauthenticated, can run a collection query and read every user's private quiz. This kills any future paid or premium marketplace content and leaks teachers' work. | **High** | Constrain list: `allow list: if resource.data.isPublic == true \|\| (request.auth != null && resource.data.createdBy == request.auth.uid) \|\| (resource.data.isTemplate == true && resource.data.createdBy == 'SYSTEM');`. Firestore list rules can reference `resource.data` and reject queries that aren't constrained. |
| E8 | **Any signed-in user can write SYSTEM library templates** (`allow create … createdBy == 'SYSTEM'`). That's spam and brand-safety risk in the curated library that drives the free funnel. | Med | Seed with the Admin SDK or a script. Remove the client rule. |
| E9 | **Marketplace upvote and fork counters fail for non-owners.** The `quizzes` update rule only allows the owner, so `rating` and `forkCount` increments from other users are denied. The ranking signal a creator economy would depend on doesn't work. | Med | Allow a scoped update: `affectedKeys().hasOnly(['rating','forkCount'])` with a +1 check, or move votes to `quizzes/{id}/votes/{uid}` (one per user) and aggregate server-side. |
| E10 | **Other collections are default-denied.** `gameResults`, `studentProgress`, `assignments` have no rules in the repo, so saved results, reports and assignments (the very features you'd charge for) fail silently if these rules are what's deployed. | High | Verify the deployed rules in the Firebase console. Write rules for these collections (ROADMAP 4.11). This is a prerequisite for selling "reports". |
| E11 | **Render `plan: free`** sleeps after about 15 minutes idle, so the first game of the day takes a 30–60 s cold start. That's unacceptable once money changes hands. | Med | Move to Render Starter or Standard before launching paid plans. Remove the `/ping` keep-alive hack. |

---

## 4. Pricing and packaging recommendation

### 4.1 Competitor norms (approximate public list prices; **re-verify before publishing**, these change often)

| Product | Free host tier | Paid teacher tier | Org / school | Notable paywall |
|---|---|---|---|---|
| Kahoot! | Free basic, small player cap on free (about 40 for school, lower for personal/work) | Kahoot!+ roughly $4–10/mo billed annually (Start/Premier/Max ladder) | Kahoot! 360 for business about $17–50+/host/mo; school/district quote | Player count, question types, reports, AI, branding |
| Quizizz (Wayground) | Generous free plan for teachers | "Super" about $3–4/mo annual | School/district site license, quote-based | Reports depth, AI, question types, LMS integrations |
| Blooket | Free with all core modes | Plus about $3/mo annual (about $5 monthly) | Site licenses on request | Reports, extra game modes, question-set features |
| Gimkit | Free "Basic" (rotating limited modes) | Pro about $5/mo annual / $10 monthly | School about $1k/yr range | Modes, KitCollab, assignments |
| Mentimeter | Free (participant cap per month) | Basic about $12/mo, Pro about $25/mo (annual); edu about 30–40% off | Enterprise | Participants, question types, export, branding |

**Patterns worth copying:**
- K‑12 individual teacher plans cluster at **$3–6/mo billed annually**.
- **Monthly is priced about 1.6–2× the annual rate**, so annual becomes the default.
- Schools buy **annually by PO/invoice**, priced per school or per teacher seat, with **quotes**.
- Corporate/event hosts pay **3–10× teacher prices**.
- **Students never pay or sign up.**

### 4.2 Evaluation of the proposed tiers

| Proposed | Verdict |
|---|---|
| Free (5 AI/mo) | OK on AI. But IMPROVEMENT_PLAN's "5 quizzes / 20 questions / 20 players" is stingier than Blooket or Quizizz and would push teachers away at the top of the funnel. |
| Educator $9/mo | **Too high** for teachers' own wallets (about 2–3× Blooket, Gimkit and Quizizz annual rates). OK as the *monthly* list price only if annual is about $4–5/mo. |
| Pro $19/mo "unlimited AI" | Right price band for trainers. But "unlimited" AI is an abuse vector. Use a high fair-use cap (for example 500/mo). |
| School Site $99/mo | Price is in the right ballpark ($1,188/yr), but **monthly billing doesn't match school procurement**. Schools want an annual invoice, PO, W‑9, DPA and a per-teacher or per-school quote. Branding is not what schools buy. They buy **admin dashboards, rostering/SSO, LMS integration, shared libraries and compliance paperwork.** |
| Missing | **Event / day-pass** for one-off hosts (weddings, conferences, bar trivia, all-hands). This is the highest-willingness-to-pay segment with almost no ongoing support cost. |

### 4.3 Recommended model

**Principle:** *players are free forever, hosts pay for scale, insight and polish.* The viral loop (teacher hosts → 30 kids see the brand → kids/parents/other teachers adopt) is the growth engine. Never put friction on the join side.

#### Free forever: "Host" (teachers, casual hosts)
- **Guests join with a code or QR, name only. No account, no ads, no upsell shown to players, ever.**
- Unlimited live games, **up to 50 players** (matches today's server cap; serving it costs nearly nothing).
- **Unlimited saved quizzes** (storage cost is negligible, and caps drive people to competitors), up to 50 questions.
- Core question types (multiple choice, true/false), classic mode, team mode (already shipped and marketed as free).
- Library and marketplace browse and fork.
- End-of-game podium plus a **last-5-games summary** (score, rank).
- **5 AI quiz generations per month** (per ROADMAP).
- Async assignments: **3 active at a time**.
- Small "Made with PopPop!" mark on the lobby screen (this is the viral attribution).

#### Teacher Plus: **$5.99/mo monthly or $48/yr ($4/mo)**
- Up to **150 players**.
- **Full reports:** per-question and per-student breakdown, CSV/Sheets export, history beyond the last 5 games.
- Unlimited assignments, homework mode with due dates.
- **100 AI generations/mo**, plus AI from pasted text, URL or PDF (higher value, still cheap).
- Advanced question types (poll, type-answer, ordering, image/audio), extra game modes as they ship.
- Folders, duplicate/merge, question bank.
- Remove the "Made with" mark from the lobby (lobby only; keep a tiny footer).
- Edu verification (school email or ID) unlocks this price. Offer a **"summer pause"** (subscription paused June–August) to cut seasonal churn.

#### Pro (trainers, L&D, business): **$19/mo monthly or $180/yr ($15/mo)**
- Up to **500 players**, multiple concurrent games.
- **Custom branding** (logo, colours, custom lobby background) on lobby, game and results.
- 500 AI generations/mo (fair use).
- Participant identification fields (email or employee ID, opt-in), certificates and pass marks, exportable compliance reports.
- Priority support.

#### Event Pass (one-off hosts): **$24 for 24 hours** (up to 300 players) / **$59 for 72 hours** (up to 1,000)
- Branding plus a sponsor logo slot, big-screen presenter mode, CSV of results.
- Sold at the moment of need (see §6). No subscription, which avoids "I forgot to cancel" chargebacks.
- Charge as a Stripe one-time payment that creates a time-boxed entitlement.

#### School / District site licence: **annual, quote-based**
- Anchor: **about $1,200–2,500/yr per school** (or **$40/teacher/yr, minimum 10 seats**). District pricing is custom.
- Everything in Teacher Plus for all staff, **admin dashboard**, shared school library, **Google/Microsoft SSO + Classroom/Canvas/Clever rostering**, school-wide branding.
- **DPA signed** (state student-privacy agreements), invoicing/PO, training session.
- The trigger is bottom-up: when 3 or more teachers from the same domain are on Plus, prompt "get your whole school covered" and capture it in a lead form.

**Annual vs monthly:** default to annual on the toggle, show monthly at about 1.5× the annual rate, and present the annual price as "$4/mo billed yearly". Stripe's fixed $0.30 makes small monthly charges expensive: about 6% on $5.99/mo vs about 3.5% on $48/yr. Annual also matches the school-year usage cycle.

**Discounts:** edu price on Plus (verified). 20% for nonprofits on Pro. Launch codes via `allow_promotion_codes`. **Reverse trial:** grant 14 days of Plus the first time a free host hits a paywall (for example their first post-game report), not at signup.

---

## 5. Additional revenue streams

| Stream | Recommendation | Timing | Trust / compliance flags |
|---|---|---|---|
| **Marketplace creator rev share** | Keep the marketplace **free** as a growth and SEO asset. Later, add "Premium packs" ($1–5) from verified creators. Creators get **70%** (TpT pays 55–80%) via **Stripe Connect Express** (handles KYC and 1099s). Optional pooled bonus funded by a share of Plus revenue, based on play counts. | Year 2, after E7 and E9 are fixed and there's supply | Teacher-to-teacher commerce is accepted in education (TpT). Require content review, licensing terms and DMCA flow. **Fix E7 first**, since world-listable quizzes would leak paid content. |
| **Sponsored / branded event quizzes** | Sell "Branded Event Kits" ($199–999) to brands, agencies and conference organisers: custom-themed quiz, sponsor logo, lead-capture opt-in at the end (adults only). | After Event Pass ships | **Allowed only in adult/event contexts.** Never in education accounts or any game where players may be under 13. Gate lead capture behind an explicit adult-audience host setting and opt-in consent. |
| **White-label corporate L&D** | Custom domain, full de-branding, SSO (SAML), SCORM/xAPI export, API/webhooks, data retention controls. **$3k–15k/yr**. | When inbound demand appears | Needs a security questionnaire (SOC 2 Type I eventually), DPA and an uptime SLA. Requires horizontal scaling (Redis adapter). |
| **AI add-on packs** | +200 generations for $5, one-time, for teachers who hit the cap. | With E1 fix | Low risk. Must use the **paid** Gemini tier: AI Studio's free tier may use prompts for model improvement, which is unacceptable for teacher/student content. |
| **Ads** | **Do not do it.** Phase 6 lists "ad-free" as a Pro perk. Drop that framing entirely. | Never in student surfaces | Ads to children trigger **COPPA** (the FTC's amended COPPA Rule tightens consent for targeted ads; the compliance deadline was April 2026), plus state student-privacy laws (SOPIPA-style) and district procurement bans. One ad in a kids' lobby can get you blocklisted by districts. |

**Education trust checklist (prerequisite for the School tier):**
- No selling or ad use of student data, and no training AI on student data. Sign the Student Privacy Pledge.
- **FERPA:** when schools use you, you're a "school official". You need a DPA and data deletion on request. `studentProgress` and `gameResults` store player names (PII) and need retention rules.
- **COPPA:** under-13 students join as guests with name only (good). Don't add student accounts without school-consent flows.
- Sponsored or branded content never reaches education accounts.

---

## 6. Unit economics

### 6.1 Server: Socket.IO on Render
- **Per game:** about 30 players. Each question broadcasts a handful of small events (question, tick/end, reveal, leaderboard) to 30 sockets. That's about 150–300 KB per player per 15-question game, **about 5–10 MB egress per game**. Memory is about 50 KB per socket plus the game state, so **under 2–3 MB per game**.
- **Capacity of one Node process** at this message rate: thousands of concurrent sockets. CPU spikes at question-end, when all answers are scored at once.
  - Render **Starter ($7/mo, 512 MB, 0.5 CPU):** realistically about 40–60 concurrent 30-player games.
  - **Standard ($25/mo, 2 GB, 1 CPU):** about 150–250 games. The current hardcoded `MAX_ACTIVE_GAMES = 100` caps you first.
- **Cost per game:** a 20-minute game on Standard at 150-game peak capacity, with demand concentrated in school hours (about 6 h/day × 22 days), works out to **about $0.002–0.005 per game**. Bandwidth adds about $0.0005–0.001 per game at typical PaaS rates.
- **Scaling cliff:** state is in memory on a single instance. Going past one box needs the Socket.IO Redis adapter plus sticky sessions (Render Key Value, about $10+/mo) and a game-code → instance routing story. Budget that before signing schools or events above about 1,000 concurrent players.

### 6.2 AI
- `gemini-2.5-flash-lite`: about $0.0001–0.0003 per 10-question generation (ROADMAP says $0.0001; the code comment says $0.00027).
- Teacher Plus at 100 gens/mo costs ≤ $0.03/user/mo. Even moving to a larger model, or adding PDF/URL ingestion (about 10× the tokens), stays under $0.30/user/mo.
- **The AI cost risk is abuse, not usage** (E1).

### 6.3 Firestore per game
- Host dashboard load: about 10–20 reads (user's quizzes). Launch: 0 (quiz already loaded).
- Game end: 1 write (`gameResults`), plus 1 write per *logged-in* student (usually 0, since students are guests).
- Results/dashboard views: about 1–6 reads.
- **Total about 20–30 reads + 1–2 writes per game, roughly $0.00002.** Negligible. The free quota (50k reads/day) covers about 2,000 games/day.
- The **marketplace** is heavier: 60 reads per view and per filter change (`limit(60)`, 30 s staleTime). Add caching or a precomputed "top lists" doc before heavy SEO traffic.

### 6.4 Per-unit margin and break-even

| Item | Monthly |
|---|---|
| Render Standard (game server) | $25 |
| Firebase Blaze (Firestore/Storage/Auth at early scale) | $0–25 |
| Transactional email (receipts, magic links) | $0–15 |
| Error monitoring / uptime | $0–26 |
| Domain, misc | about $5 |
| **Fixed infra, early** | **about $50–100** |

- **Net revenue per payer:**
  - Teacher Plus annual: $48 − about $1.70 Stripe = about **$3.85/mo**.
  - Monthly: $5.99 − $0.47 = **$5.52/mo**.
  - Pro annual: about **$14.50/mo**.
  - Event Pass $24: about **$23.00**.
- **Variable cost per payer** (AI + games): **< $0.10/mo.** Gross margin about 97–98% after Stripe.
- **Break-even on infra:** about **15–25 Teacher Plus subscribers**, *or* about 4–7 Pro, *or* about 3–4 Event Passes a month.
- **Illustrative scale:**
  - 10,000 active free hosts × 3% paid conversion = 300 payers, blended about $6 net, so about **$1.8k MRR** against about $150–300 infra.
  - One 20-school deal at $1,500/yr adds **$2.5k MRR**. Schools and events move the needle; individual teacher subs fund the funnel.

---

## 7. Upgrade moments in the UX (never block a live game)

**Hard rules:**
1. **Never show a paywall to a player.** If a room is full, the player sees "This game is full, ask your host" with no upsell.
2. **Never interrupt a game in progress.** No modals between questions and no mid-game cap enforcement. Caps apply only at join time, in the lobby.
3. Prompts go to the **host**, before or after the game, or at creation time.

| Moment | Trigger | Prompt (host only) |
|---|---|---|
| **Lobby fills up** | 51st join attempt on Free | Non-blocking lobby banner: "3 more players tried to join. Plus allows 150 (start a 14-day trial, keeps this lobby)." Upgrading should raise the cap **live** without re-creating the game. For non-edu hosts, offer the **Event Pass** here. |
| **Post-game results** | Every free game end | Show the podium free, plus a **blurred preview** of the per-question breakdown and student table: "See who struggled on Q4. Unlock reports." This is the highest-intent moment for teachers. Trigger the reverse trial here. |
| **AI quota** | 6th generation | Modal at quiz-creation time (not in-game). Show remaining credits as a meter beforehand ("2 of 5 left this month"). Offer the Plus upgrade or a $5 pack. Server returns `402 quota_exceeded`. |
| **Premium question types / modes** | Picking them in QuizBuilder | Show with a lock badge. Allow preview, block on save/launch with an upgrade card. |
| **Assignments** | Creating the 4th active assignment | Inline card in AssignmentsPage. |
| **Branding** | OrgSettings | Let free users design and preview their branding. Gate "Apply to my games". |
| **Export** | Clicking "Download CSV" | Upgrade card. Include one free export as a taste. |
| **Event intent** | Host picks an "Event / Party / Conference" template or category, or a non-edu email domain plus >50 players | Offer the Event Pass ($24) at launch. One-time checkout, return to the lobby. |
| **School expansion** | 3 or more Plus/free hosts on the same school domain | Dashboard card: "12 teachers at Lincoln High use PopPop. Get a school licence." Leads to a quote form. |
| **Annual nudge** | Monthly checkout | Default the toggle to annual ("save 33%"). On renewal, email before charge (also legally required in some states). |
| **Churn save** | Cancel in portal | Offer "pause for summer" before cancelling. |

**Implementation note:** all gates must call a single server-side entitlement check (`GET /api/me/entitlements`, backed by the admin-written `entitlements/{uid}` or custom claims). The client only *renders* gates. The server *enforces* them (AI endpoint, `host:create` player cap, branding broadcast, report data access through rules).

---

## 8. Prioritized fix list (monetization critical path)

1. **E1:** lock down `/api/ai/generate` (auth + quota + IP limit + Gemini budget cap). *Do this now; it's live cost exposure.*
2. **E5 / E4:** authenticated socket handshake (`verifyIdToken`), per-uid concurrent game limits, plan-based `maxPlayers`.
3. **Stripe:** move the webhook before `express.json()`, add `subscription_data.metadata` and `checkout.session.completed`, fix status mapping, add idempotency and 5xx on failure, verify the token on checkout, add the portal endpoint, add annual price IDs.
4. **Entitlements store:** `entitlements/{uid}` (admin-write only) plus custom claims. Never put `plan` or credit fields in client-writable docs (reject the IMPROVEMENT_PLAN users rule).
5. **Firestore rules:** constrain `list` on quizzes (E7), remove client SYSTEM writes (E8), add rules for users (whitelisted keys), gameResults, studentProgress, assignments (E3, E10), plus storage rules for logos.
6. **Pricing page rewrite** to match what's enforced: fix the 10 vs 5 quiz mismatch, the AI claim, the "free trial" CTA, the portal FAQ, the footer link and the success URL.
7. Move off the Render free plan before taking payment (E11).
8. Ship Event Pass (one-time Stripe price + time-boxed entitlement) before School tier sales work. It's the fastest path to revenue with zero procurement friction.
