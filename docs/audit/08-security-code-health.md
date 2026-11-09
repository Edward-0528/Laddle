# 08 - Security, Data Integrity, Privacy and Code Health Audit

Scope: secrets, Firestore rules vs. client services, server HTTP/socket auth, answer leakage, XSS, rate limits, CORS/headers, kids' privacy (COPPA/FERPA/GDPR), and engineering foundations. No code was changed. Realtime reconnect correctness is covered in another report and billing strategy in another. Where those areas overlap with security or integrity, this report only cross-references them.

Severity: **P0** = exploitable now, or core data/feature broken in production; fix before any school pilot. **P1** = serious, fix this cycle. **P2** = hardening and hygiene.
Effort: S = under half a day, M = 1-3 days, L = a week or more.

---

## Summary table

| # | Sev | Finding | Location | Effort |
|---|-----|---------|----------|--------|
| 1 | P0 | One unauthenticated socket packet crashes the server (prototype-key lookup, then TypeError) | server/src/index.ts:589-628, gameManager.ts:100,540-552 | S |
| 2 | P0 | `allow list: if true` on `quizzes` lets anyone dump every teacher's private quizzes, answer keys included | firestore.rules:14 | S |
| 3 | P0 | Any signed-in user can create or poison "SYSTEM" library templates shown to kids | firestore.rules:31-33, 40-44; Library.tsx:73,211 | S |
| 4 | P0 | Rules cover only `quizzes`. `users`, `assignments`, `assignmentResponses`, `gameResults`, `studentProgress` have no rules, so either prod is broken or deployed rules have drifted from the repo | firestore.rules (whole file) | M |
| 5 | P0 | Host takeover: any socket that knows the code becomes host while the real host is disconnected | gameManager.ts:540-552, index.ts:589 | S |
| 6 | P0 | No Firebase ID-token verification anywhere on the server. AI endpoint is open to cost abuse; checkout trusts `uid` from the body | index.ts:171-228 | M |
| 7 | P0 (integrity) | Stripe webhook can never verify, because global `express.json()` consumes the raw body. Plan metadata is also on the wrong object | index.ts:121,234-246,219 | S |
| 8 | P1 | Assignment answer key is shipped to students, and the score is computed client-side and written by the client | AssignmentTake.tsx:46,74,90-103; assignments.ts:153 | M |
| 9 | P1 | Student progress saves another child's name and score (falls back to `leaderboard[0]`) | Game.tsx:270-288 | S |
| 10 | P1 | `lobby:request` lets any socket join any room unrated: spectate games, collect kids' names and socket IDs | index.ts:495-504 | S |
| 11 | P1 | Unvalidated or unrated host events (`host:set-teams`, `host:pause/resume/extend-time`, `host:reconnect`, `lobby:request`) | index.ts:414-429,589-688 | S |
| 12 | P1 | Global DoS: 100-game cap, rate limits per socket only, `host:create` unauthenticated | gameManager.ts:82; rateLimit.ts | S-M |
| 13 | P1 | Players are impersonated by name on reconnect | gameManager.ts:631-664 | S (security part) |
| 14 | P1 | Kids' privacy posture: no privacy policy, no retention, no deletion, PII in logs, no age/consent handling | multiple | M-L |
| 15 | P1 | Missing composite indexes. Queries fail silently because errors are swallowed | firestore.indexes.json; services | S |
| 16 | P1 | No Storage rules in repo. SVG logo upload; `updateDoc` on a users doc that is never created | firebase.json; branding.ts | S |
| 17 | P2 | Sanitizer is a bypassable regex. Safe today only because React escapes output | schemas.ts:14-16 | S |
| 18 | P2 | No CSP or security headers on the SPA hosts | netlify.toml, firebase.json | S |
| 19 | P2 | Error detail leakage (zod flatten, Stripe error message) | index.ts:179,249 | S |
| 20 | P2 | Secrets/config hygiene: stale deploy scripts, wrong projectId in seed script, `.firebase/` committed | deploy.sh, scripts/seedLibrary.ts:12, .firebase/ | S |
| 21 | P2 | Code health: no tests, no lint, no CI, drifted duplicate types, 878-line Game.tsx, unused deps, no monitoring | repo-wide | M-L |

---

## Secrets review (clean, with notes)

- `git log --all -p -S "AIza"`, `sk_live`, `sk_test`, `whsec_` and `PRIVATE KEY` all returned nothing. No credentials are in history.
- A deleted file, `client/.env`, appears in history (commits 8c3c658 and 8d18970). It only ever contained `VITE_SOCKET_URL=https://...`. Not a secret.
- `src/services/firebase.ts` reads its config from `VITE_*` env vars. The Firebase web API key is public by design, so security rests entirely on Firestore and Storage rules (see 2-4 and 16). Restrict the key in GCP (HTTP referrer limits to the prod domains, and API restrictions to Identity Toolkit and Firestore) so it can't be used for other APIs on the project.
- Server secrets (`GEMINI_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `FIREBASE_ADMIN_CREDENTIALS`) are read from env only. They are **not documented** in `server/.env.example` (only PORT and CLIENT_ORIGIN are listed) and not declared in `render.yaml`. Add them as `sync: false` entries so a deploy never silently runs without them.
- `.firebase/hosting.*.cache` is committed. It is harmless (file hashes only) but belongs in `.gitignore`.
- `.gitignore` covers `.env`, `.env.local`, `.env.production` and `server/.env`. Add `.env.*` with `!.env.example` to catch variants such as `.env.development`.

---

## Findings

### 1. P0 - Single-packet server crash and prototype pollution via `host:reconnect`

**Where:** `server/src/index.ts:589-628`, `server/src/services/gameManager.ts:100` (`const games: Record<string, Game> = {}`), `:540-552` (`reconnectHost`).

`host:reconnect` takes `payload.code` raw: no zod, no uppercasing, no rate limit. `games` is a plain object literal, so `games["constructor"]` returns `Object` and `games["__proto__"]` returns `Object.prototype`. Both are truthy and have `hostConnected === undefined`, so the check passes. I confirmed this with `node -e` against an empty object literal.

`reconnectHost` then writes `hostSocketId` and `hostConnected` onto `Object` or `Object.prototype` (prototype pollution) and returns `ok`. The handler next runs `game.questions[game.currentQuestionIndex]` at index.ts:610. `questions` is undefined, so this throws a TypeError inside a Socket.IO listener. There is no `uncaughtException` handler, so the Node process exits.

**Exploit:** anyone can run `io("https://laddle-server.onrender.com").emit("host:reconnect", {code: "constructor"})`. Every live classroom game is wiped (all state is in memory). Repeating it every few seconds keeps the service down. No authentication is needed, and CORS doesn't apply to non-browser clients.

**Fix:**
- Store games in `Map<string, Game>`, or use `Object.create(null)` plus `Object.hasOwn` checks.
- Validate every event payload with zod, including a code regex such as `/^[A-HJ-NP-Z2-9]{6}$/`.
- Wrap every handler in a `safe(handler)` helper that try/catches and logs.
- Add `process.on('uncaughtException')` logging as a last resort only; the real fix is the validation.

**Effort:** S.

### 2. P0 - Every quiz in the database is world-readable

**Where:** `firestore.rules:14` `allow list: if true;`.

The comment assumes query constraints scope the results. That assumption is wrong: Firestore list rules are not filters. With `if true`, **any query, including an unfiltered `getDocs(collection(db,'quizzes'))`, succeeds for unauthenticated clients**. The `get` rules (lines 18-23) are irrelevant to list queries.

**Exploit:** a student opens devtools on the public site and copies the Firebase config from the bundle. Running `getDocs(collection(db,"quizzes"))` returns every teacher's private quizzes with `correctAnswerIndex`, including the one about to be played live or assigned as homework. It also exposes `createdBy` UIDs.

**Fix:** split the list rules:

```
allow list: if (resource.data.isTemplate == true && resource.data.createdBy == 'SYSTEM')
            || resource.data.isPublic == true
            || (request.auth != null && resource.data.createdBy == request.auth.uid);
```

Firestore then rejects any query that doesn't constrain on those fields. Add an equivalent `get` rule for `isPublic`, which the Marketplace detail view needs. Longer term, consider keeping answer keys in a subcollection (`quizzes/{id}/private/answers`) that only the owner can read, since public and marketplace quizzes also expose answers. Write emulator tests (section 21).

**Effort:** S.

### 3. P0 - Library template poisoning

**Where:** `firestore.rules:31-33` (any signed-in user may create `createdBy=='SYSTEM', isTemplate==true`), `:36` (an owner's update has no constraints on `request.resource`, so they can flip their own quiz to `createdBy:'SYSTEM'`), and `:40-44` (any signed-in user may rewrite `stats` on any SYSTEM template to arbitrary values). Client side, `Library.tsx:73,211` shows a "seed" button to every signed-in user.

**Exploit:** a free account inserts "SYSTEM" templates with offensive text, links or wrong answers. They then appear in the public Library to unauthenticated visitors and children with official branding. Templates can't be deleted by a normal user, but they can't be cleaned up by the app either: there is no admin role.

**Fix:**
- Remove the SYSTEM create rule. Seed only through the Admin SDK script (`scripts/seedLibrary.ts`), or require an admin custom claim (`request.auth.token.admin == true`).
- On update, require `request.resource.data.createdBy == resource.data.createdBy` and an unchanged `isTemplate`.
- Replace the stats rule with a server-side counter, or limit it to `stats.timesPlayed == resource.data.stats.timesPlayed + 1`.
- Remove the seed button from the UI.
- Audit the production collection now for rogue SYSTEM docs.

**Effort:** S.

### 4. P0 - Rules don't cover 5 of the 6 collections the app uses

**Where:** `firestore.rules` only matches `/quizzes/{quizId}`. Services also use:
- `users/{uid}` (branding.ts:24,37,51)
- `assignments` (assignments.ts:77-142)
- `assignmentResponses` (assignments.ts:157-188)
- `gameResults` (gameResults.ts:28-66)
- `studentProgress/{uid}/entries` (studentProgress.ts:25,42)

Additionally, `quizzes.ts:223` (`upvoteQuiz`) and `:251` (`forkQuiz` forkCount) update other users' docs, which no rule allows.

**Failure scenario A (repo rules are deployed):** assignments, results history, the reports page, student progress and branding all fail with permission-denied. Every service catches the error and returns `null` or `[]`, so teachers see empty dashboards and students' homework submissions are **silently lost**. `submitAssignmentResponse` returns null, and AssignmentTake.tsx:95-103 shows the "submitted" screen anyway. Marketplace fork creates the copy and then throws.

**Failure scenario B (console rules differ, for example test-mode `allow read, write: if true` or a time-boxed test rule):** everything works, but all student names, answers and scores are world-readable and writable. That is a FERPA-grade breach.

**Action:** run `firebase firestore:rules:get` (or check the console) today to find out which scenario prod is in.

**Fix:** write rules for every collection. The key design points:
- `assignments`: the host CRUDs where `hostUid == auth.uid`. Students should **not** read assignment docs directly (see 8). Look them up through a server endpoint.
- `assignmentResponses`: students are anonymous, so either use Firebase Anonymous Auth with `create` limited to the student's own response (validating fields, with no read for other students), or move submission to a server endpoint that grades it. Read only for the assignment's host, which needs `get(/assignments/$(assignmentId)).data.hostUid == auth.uid` or a denormalized `hostUid` field.
- `gameResults`: create and read only where `hostUid == auth.uid`. Better, have the server write them.
- `studentProgress/{uid}/entries`: owner only.
- `users/{uid}`: owner reads and writes, but `plan` must be writable only by the server (`!request.resource.data.diff(resource.data).affectedKeys().hasAny(['plan'])`). Otherwise any user can self-upgrade to Pro once plan gating exists.
- End with a catch-all deny, and add field validation (types, sizes) on create.

**Effort:** M (including emulator tests).

### 5. P0 - Host hijack during the host-disconnect window

**Where:** `gameManager.ts:540-552`, `index.ts:589-629`.

`reconnectHost` only checks `!game.hostConnected`. It never checks that the caller *is* the original host. Any socket that knows the 6-character code (visible on the projector to every student) can send `host:reconnect` during the 90-second window after the teacher's tab drops, for example on Wi-Fi blips or a phone screen lock. That socket becomes host: it can skip or end questions and receives the `game:state` snapshot. The real teacher is then refused (`host:reconnect:failed`).

**Fix:** issue a random `hostToken` (32 bytes, via `crypto.randomBytes`) at `host:create`, return it only in the host's callback, and require it on reconnect, compared with `timingSafeEqual`. Better, bind the host to a verified Firebase UID (see 6). Coordinate with the realtime report, which owns the reconnect flow.

**Effort:** S.

### 6. P0 - No authentication on server endpoints or sockets

**Where:** `index.ts:171-190` (`/api/ai/generate`), `:197-228` (`/api/billing/create-checkout`), and all socket handlers. `firebase-admin` is installed but only used inside the webhook. Neither the client (`socket.ts`, `aiGenerate.ts`, `billing.ts`) nor the server sends or verifies an ID token.

**Exploits:**
- **Gemini cost abuse:** `/api/ai/generate` is unauthenticated and has no HTTP rate limit. `express-rate-limit` is a dependency but is never imported. CORS doesn't stop curl. A script can loop requests and run up the Gemini bill, or exhaust quota so real teachers get 500s. The "Pro feature" AI is effectively free for everyone.
- **Checkout:** `uid` and `email` come from the body. An attacker can create sessions tagged with any uid. Harm is limited today, but once metadata is fixed (7) it lets someone gift or attach subscriptions to arbitrary accounts and pollutes Stripe customers.
- **Sockets:** anyone can create games (see 12), and there is no way to enforce plan limits (`PLAN_LIMITS` in `src/types/user.ts` is never read anywhere: `grep "\.plan"` finds nothing).

**Fix:**
- Add `requireAuth` middleware that calls `admin.auth().verifyIdToken(req.headers.authorization)` and use `req.user.uid`, never the body. Initialize firebase-admin once at startup, not lazily in the webhook.
- Apply `express-rate-limit` per IP and per uid (for example, 10 AI generations per hour on free accounts) and a daily Gemini budget cap.
- For sockets, add `io.use()` middleware that verifies `socket.handshake.auth.token` when one is present. Require it for `host:*` events. Players stay anonymous.

**Effort:** M.

### 7. P0 (data integrity, overlaps billing) - Stripe webhook can never succeed

**Where:** `index.ts:121` registers `app.use(express.json())` globally, *before* the webhook route at `:234` with `express.raw()`. `express.json` parses the `application/json` body first, so `req.body` is an object and `stripe.webhooks.constructEvent` at `:246` throws. Every webhook returns 400.

Separately, `metadata: { uid }` at `:219` is set on the Checkout Session, but the handler reads `sub.metadata.uid` from the Subscription at `:270-271`. That would need `subscription_data: { metadata: { uid } }`.

**Result:** paying customers are never upgraded. If they ever are, cancellations are never applied. Firestore failures are swallowed and still return 200 (`:286-290`), so Stripe won't retry.

**Fix:**
- Mount the webhook route before `express.json()`, or use `express.json({ verify })` to keep the raw buffer.
- Add `subscription_data.metadata`.
- Return 500 on Firestore failure so Stripe retries, and make the handler idempotent (store `event.id`).

**Effort:** S. The billing report owns the plan design.

### 8. P1 - Async assignments: answer key exposed, client-side grading

**Where:** `AssignmentTake.tsx:46` loads the whole assignment doc (with `questions[].correctAnswerIndex`) into the student browser. `:74` grades locally, `:90-103` computes `score` locally and writes it with `submitAssignmentResponse` (`assignments.ts:153-163`). `hasStudentSubmitted` (`:180`) dedupes by free-text name only.

**Exploit:** students read answers from the network tab or React devtools, or simply post `{score:100, answers:[...correct:true]}`. They can submit under a classmate's name first to lock that classmate out ("already submitted"), or submit unlimited times under name variants. Teacher reports (AssignmentReport) are therefore untrustworthy.

**Fix:** serve questions without answers from a server endpoint (`GET /api/assignments/:code`). Submit raw choices to `POST /api/assignments/:code/responses`, where the server grades and writes with the Admin SDK and enforces deadline and closed state server-side (the client-side check at AssignmentTake.tsx:48 is cosmetic). Optionally use roster-based identity or anonymous auth for dedupe.

**Effort:** M.

### 9. P1 - Wrong child's data saved to a student's progress

**Where:** `Game.tsx:270-288`. A logged-in non-host matches the leaderboard by first name of `displayName`, and **falls back to `data.leaderboard[0]`**, which is the winner.

**Result:** the student's "My Progress" permanently stores another child's nickname, score and rank. That is an integrity error and a privacy leak of one student's record into another's account. Name collisions mis-attribute as well.

**Fix:** have the server include each socket's own result in a private emit (`io.to(socket.id).emit('game:my-result', ...)`), and save that result, ideally server-side keyed by verified uid. Remove the fallback.

**Effort:** S.

### 10. P1 - Room snooping via `lobby:request`

**Where:** `index.ts:495-504`. There is no rate limit, no zod and no membership check, and the handler calls `socket.join(code)` for any existing game.

**Exploit:** a non-player joins the room and receives every broadcast: lobby updates with each child's nickname **and socket ID** (the `Player.id` field leaks through `getPlayerList`), per-question results and the final leaderboard. With no rate limit, a single client can enumerate codes. The space is 32^6, about 1.07e9, with at most 100 live games, so this is slow but unbounded. Many sockets in parallel make it practical.

**Fix:** only join if `socket.id` is the host or a player in the game. Rate-limit the event. Strip `id` from public player lists and send a stable opaque player id instead.

**Effort:** S.

### 11. P1 - Unvalidated and unrated host events

**Where:**
- `host:set-teams` (`index.ts:414-429`): `teamNames` is unvalidated. Any length is accepted, non-strings are accepted, text is unsanitized, and it is broadcast to the room.
- `host:pause/resume/extend-time` (`:634-688`): `code` is not normalized, and `extraSeconds` is unbounded and can be negative. Negative values end questions instantly. Values above 2^31 ms make the timer fire immediately.
- `host:skip/end` have no rate limit.
- `host:reconnect` and `lobby:request`: see 1 and 10.

**Fix:**
- Add zod schemas: `teamNames` as 2-8 strings of at most 30 characters, sanitized; `extraSeconds` as an int from 5 to 120.
- Rate-limit every event.
- Route all handlers through a single `on(event, schema, limit, handler)` wrapper so a new event can't skip validation.

**Effort:** S.

### 12. P1 - Global denial of service by game exhaustion

**Where:** `gameManager.ts:82` (`MAX_ACTIVE_GAMES = 100`), `rateLimit.ts` (keys by `socketId`, so a new connection resets the limit), and `host:create`, which is unauthenticated.

**Exploit:** a script opens about 34 sockets and calls `host:create` 3 times each. All 100 slots stay full for an hour, because `cleanupIdleGames` only frees lobbies after 60 minutes, and the attacker's sockets stay connected so `handleDisconnect` never deletes them. Real teachers get "Server is at capacity". Up to 50 fake players per game (50 x 100 = 5,000) can also be flooded in.

**Fix:**
- Require a verified teacher token for `host:create` (see 6), with a per-uid cap of 2 or 3 concurrent games.
- Add per-IP connection limits (`socket.handshake.address`, or the `X-Forwarded-For` header behind Render).
- Set the lobby idle timeout to about 15 minutes.
- Set `maxHttpBufferSize` explicitly (the Socket.IO default is 1 MB; a 50-question payload needs well under 100 KB).

**Effort:** S-M.

### 13. P1 - Player impersonation on reconnect (security aspect)

**Where:** `gameManager.ts:631-664`. A reconnect matches any *disconnected* player with the same name.

**Exploit:** a student who sees "Alex" drop can join as "Alex" and take over Alex's score and slot, and can answer on Alex's behalf.

**Fix:** issue a per-player rejoin token (stored in sessionStorage) at join time and require it on reconnect. The realtime report owns the UX.

**Effort:** S.

### 14. P1 - Children's privacy and compliance posture

**What student data is stored:**

| Data | Where | Identifiable? | Retention |
|------|-------|---------------|-----------|
| Free-text nickname (often the real first and last name in classrooms) | server memory; `gameResults.players[]` (name, score, rank); `assignmentResponses.playerName` plus per-question answers and timing; `studentProgress` | Yes, often | Forever (no TTL, no delete) |
| Student accounts (email, displayName, Google profile) | Firebase Auth (StudentDashboard, /my-progress) | Yes | Forever |
| Names, socket IDs, game codes | Render stdout logs (`gameManager.ts:195,310,662,684`, `index.ts:319,555`) | Yes | Render log retention |
| Topic text | sent to Google Gemini | No student data, good | n/a |

**Gaps:**
- **No privacy policy or terms.** Footer.tsx:49-50 links both to `/`.
- **No age gate or consent.** Register.tsx and the Google sign-in let anyone, including under-13s, create an account with email. Under COPPA (amended rule in force 2025) this requires verifiable parental consent, or operating under the school-authorization exception with a direct notice to schools. The ROADMAP targets K-12.
- **FERPA:** assignment responses and results are education records held on behalf of schools. Schools will expect a DPA, data-use limits, deletion on request, and access controls. Today these are absent or broken (see 4).
- **No deletion:** there is no account-deletion flow, and `deleteAssignment` (`assignments.ts:139-146`) leaves every `assignmentResponses` doc orphaned, despite its comment. There are no retention TTLs.
- **GDPR (if EU users):** no lawful-basis notice, no DSAR export or delete, no records of processing. Google Fonts and Firebase need disclosure.
- No moderation of nicknames. Kids will type profanity onto a projector; a basic profanity filter plus host kick is expected.

**Fix (minimum viable):**
- Publish a real privacy policy and terms. Add a "Student Data" section: what's collected, who can see it, retention, deletion contact.
- Position student play as anonymous by default. Display only first name or nickname, and add a guidance note to teachers.
- Gate student accounts behind a teacher or school context, or an age screen. Under 13, either no account or a school-consent flow.
- Add Firestore TTL policies, for example `gameResults` and `assignmentResponses` deleted after 1 year (configurable per school).
- Add an account-deletion function that cascades over quizzes, assignments, responses, results and the logo.
- Drop player names from server logs, or hash them.
- Consider the Student Privacy Pledge and 1EdTech or Common Sense privacy evaluations before selling to districts.

**Effort:** M for the technical part, L including legal and DPA work.

### 15. P1 - Missing composite indexes cause silent empty screens

These queries need indexes that are not in `firestore.indexes.json`:
- `assignments` (`hostUid ==`, `createdAt desc`) at assignments.ts:90
- `assignmentResponses` (`assignmentId ==`, `submittedAt asc`) at :170, and (`assignmentId`, `playerName`) at :184
- `gameResults` (`hostUid ==`, `playedAt desc`) at gameResults.ts:46
- `quizzes` (`isPublic ==`, `rating desc`) and (`isPublic`, `subject`, `rating desc`) at quizzes.ts:192-199

Because errors are caught and turned into `[]` or `null`, users see an empty dashboard rather than an error.

**Fix:** add the indexes. Stop swallowing errors: surface them to the UI and to error monitoring (21).

**Effort:** S.

### 16. P1 - Firebase Storage and user profile docs

- `firebase.json` declares no `storage` rules file, so Storage security for `logos/{uid}/*` (branding.ts:48) lives only in the console. Add `storage.rules` that allows writes only to `logos/{request.auth.uid}/*` with `request.resource.size < 1 MB` and `contentType.matches('image/(png|jpeg|webp)')`.
- **Disallow SVG.** A user-supplied SVG served from a download URL can carry script. Firebase serves it from its own domain, so it can't reach the app's origin, but it still can be used for phishing.
- `users/{uid}` is never created. No `setDoc` exists anywhere in `src`, so `updateDoc` in branding.ts:37,51,68 fails with not-found. Create the profile on first sign-in, server-side, with `plan: 'free'`.

**Effort:** S.

### 17. P2 - Sanitization

`sanitize()` (`schemas.ts:14-16`) strips `<...>` with a regex. Input such as `<img src=x onerror=alert(1)` (no closing `>`) passes through, and entities pass through. Today React escapes all rendered text and there is no `dangerouslySetInnerHTML` or `innerHTML` in `src` (verified), so this is not exploitable.

The risk is future CSV/XLSX export (formula injection: `=HYPERLINK(...)`, which `quizImport` and exports should guard), email templates, or a non-React consumer.

**Fix:** treat the server as storing plain text. Escape at output, and prefix `= + - @` in CSV exports. Keep the length limits. AI output (`aiGenerator.ts:122-132`) is unsanitized and unbounded in length, and choice count isn't enforced against the 2-6 schema. Validate it with `QuestionSchema` before returning.

**Effort:** S.

### 18. P2 - No security headers on the frontend

`helmet()` only protects the API. Netlify (`netlify.toml`) and Firebase Hosting (`firebase.json`) serve the SPA without CSP, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy` or `Permissions-Policy`. Students' game pages can be framed for clickjacking or overlays.

**Fix:** add a `[[headers]]` block in netlify.toml and `hosting.headers` in firebase.json with a CSP that allows self, the Firebase and googleapis domains, Stripe and the socket origin. Also pick **one** frontend host. Two production frontends (`ladle.netlify.app` and `ladle-3c896.web.app`, both in the CORS allowlist at index.ts:86-87) double the configuration surface.

**Effort:** S.

### 19. P2 - Error detail leakage

- `index.ts:179` returns `parseResult.error.flatten()` to the client.
- `:249` echoes the Stripe error message.
- The root endpoint (`:133`) advertises the service name and version.

All are minor. Return generic messages and log the details.

**Effort:** S.

### 20. P2 - Deploy and config hygiene

- `deploy.sh` and `deploy.bat` still `cd client`, a directory that no longer exists. Their documented Render build command omits `--include=dev`, and `render.yaml` disagrees. Delete the scripts or fix them.
- `scripts/seedLibrary.ts:12` hard-codes `projectId: 'ladle-a41d6'`, but `.firebaserc` is `ladle-3c896`. Running the seed script writes to a different (old?) project. Read the project ID from env.
- `render.yaml` uses `plan: free`, which sleeps after inactivity. A cold start of 30-60 seconds at the start of class is a reliability issue, and in-memory games are lost on every deploy or restart.
- `server/package.json` lists `typescript` and the `@types/*` packages under `dependencies`, and `nodemon`/`ts-node` exist but there are no `engines` constraints beyond `>=18`. Pin Node 20 in both Netlify and Render.

**Effort:** S.

### 21. P2 - Code health and engineering foundations

**Current state:**
- **Tests:** none. `server/package.json` `"test"` exits 1, and there is no test runner in the root.
- **Lint/format:** no ESLint or Prettier config or dependencies. `lint-staged` globs map to empty arrays (`package.json` lint-staged block), so the pre-commit hook only runs an emoji check.
- **CI:** none. There is no `.github/`. Nothing runs `tsc` before Netlify or Render deploy, beyond each build itself.
- **TypeScript:** `strict: true` on both sides. That's good. But there are 25 `any`/`as any` uses, and socket payloads are typed `unknown` and then cast `as any` in 6 handlers (see 11).
- **Shared-type drift (confirmed):** `src/types/events.ts` has 11 client-to-server and 14 server-to-client events. `server/src/types/events.ts` lacks `HOST_PAUSE`, `HOST_RESUME`, `HOST_EXTEND_TIME`, `HOST_RECONNECT`, `GAME_PAUSED`, `GAME_RESUMED`, `GAME_STATE`, `HOST_AWAY` and `HOST_BACK`. The server uses string literals for these instead (index.ts:404,563,589,606,611,634,642,648,660). Payload shapes are not shared at all: `Question.answerIndex` on the server vs `QuizQuestion.correctAnswerIndex` on the client is mapped by hand at Dashboard.tsx:117.
- **Giant modules:**
  - `Game.tsx` (878 lines, 25 `useState` calls, host, player, reveal and results views in one component)
  - `server/src/index.ts` (788 lines: HTTP, billing, sockets and timers mixed together)
  - `gameManager.ts` (719 lines; acceptable but untested)
  - `QuizBuilder.tsx` (591 lines)
- **Dead or unused code:** `@stripe/react-stripe-js` and `@stripe/stripe-js` are never imported. The `?host=true` URL param in Game.tsx:305-308 is a client-side host flag that contradicts the "no URL role" design in the README. It also causes a logged-in player to save results under their own uid. `Demo.tsx` (414 lines) is routed and linked; keep it only if it's actually maintained. `incrementQuizStats` calls `updateQuiz(quizId, {} as any)` as a no-op write (quizzes.ts:165). 18 `console.log` calls ship to production.
- **Monitoring and analytics:** none. There is no Sentry or equivalent, and client errors are swallowed in services. The ErrorBoundary only renders a fallback. There is no uptime alerting on `/health`.
- **Server state:** the in-memory, single-process store means no horizontal scaling and loss on restart. That's fine for now, but `gameManager` should sit behind an interface (the comment already says so) so a Redis adapter can come later.

**Recommended minimal testing strategy (about 3-4 days total):**
1. **Vitest at the root and in the server** (`vitest`, `@vitest/coverage-v8`).
2. **gameManager unit tests** (highest value, pure functions): scoring (speed and streak), `recordAnswer` guards (late, duplicate, out of range, non-player), `finalizeQuestion` double-call, pause/resume/extend math, team balancing, reconnect, cleanup. Add regression tests for findings 1, 5 and 13 (`code: "constructor"`, a non-host reconnect).
3. **Socket integration tests:** refactor index.ts into `createServer()` that returns `{httpServer, io}` without calling `listen` at import time. Spin it up on port 0 in `beforeAll`, and connect a `socket.io-client` host plus 2 players. Assert the full flow: create, join, start; `game:question` has **no** `answerIndex`; answer; `question:end`; results. Test that non-host events are ignored, rate limits apply, and malformed payloads don't crash the process. Use `vi.useFakeTimers()` for the timers.
4. **Firestore rules tests** with `@firebase/rules-unit-testing` against the emulator: one allow and one deny case per collection and role (anonymous, owner, other teacher, student). This is where findings 2-4 get locked down.
5. **HTTP tests** with supertest: auth required on `/api/ai/generate`, and the webhook signature path using `stripe.webhooks.generateTestHeaderString`.
6. Later, one Playwright smoke test (host and player in two browser contexts).

**Recommended repo structure:**

```
/packages/shared        # @ladle/shared: event names, payload types, zod schemas, constants
  src/events.ts         #   ClientToServerEvents / ServerToClientEvents interfaces
  src/schemas.ts        #   zod schemas reused by server validation + client forms
/apps/web               # current src/ (Vite)
/apps/server            # current server/ (split: http/, sockets/, billing/, game/)
firestore.rules, storage.rules, firestore.indexes.json, /tests/rules
```

Use npm workspaces (already on npm). Type Socket.IO with `Server<ClientToServerEvents, ServerToClientEvents>` and `Socket<...>` on the client, so a missing or renamed event becomes a compile error. This removes the hand-synced `events.ts` copies, whose header comment explicitly accepts the drift risk.

**CI (GitHub Actions, about half a day):** on each PR, `npm ci`, then `tsc -b` for both apps, ESLint (typescript-eslint, react-hooks), Vitest, and the rules tests in the Firebase emulator, plus `npm audit --omit=dev --audit-level=high`. Add Dependabot or Renovate. Deploy only from main after green.

**Monitoring:** Sentry (React and Node, free tier) with `beforeSend` scrubbing player names. Add an uptime check on `/health` and structured JSON logs.

**Effort:** M-L overall. Recommended sequencing:
1. Week 1: findings 1-7 plus rules tests.
2. Week 2: 8-16.
3. Ongoing: shared package, CI, Sentry, Game.tsx split (host view, player view, reveal, and a `useGameSocket` hook).
