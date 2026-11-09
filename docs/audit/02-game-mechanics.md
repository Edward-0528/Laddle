# 02 — Game Mechanics & Playability Audit

**Role:** Game designer (mechanics, pacing, fairness, learning value)
**Scope:** Live game loop (`server/src/services/gameManager.ts`, `server/src/index.ts`, `src/pages/Game.tsx`), launch path (`src/pages/Dashboard.tsx`), self-paced mode (`src/pages/AssignmentTake.tsx`), reporting (`src/pages/Results.tsx`, `src/pages/AssignmentReport.tsx`), marketing demo (`src/pages/Demo.tsx`), plans (`ROADMAP.md` Tier 4, `IMPROVEMENT_PLAN.md`).
**Method:** Read-only code review. No code changed. Line references are to the files as of 2026-11-08.

---

## 1. TL;DR

The skeleton of a Kahoot-style loop is in place (lobby with QR, timed 2–6-choice question, speed + streak scoring, answer distribution, rank deltas, podium, teams, pause/extend/skip). But in practice **the most important moments of the loop are either broken or too short to land**:

1. **The scoring clock is corrupted by Pause and +30s.** Points are computed against the *current* `questionEndsAt`, which both features push later, so early answerers can earn 2,000–5,000 points on a question nominally worth 1,000.
2. **The reveal/leaderboard is effectively invisible.** Server auto-advances 5.0 s after a question ends; the client spends 4.5 s on "correct" + "points" phases, so the leaderboard shows for ~0.5 s before the next question transition. The host has no "Next" button and cannot hold the reveal to teach.
3. **Players get no personal feedback.** The phone shows the same shared reveal as the projector: no "Correct! +840", no highlight of the choice you picked, no "you are 7th, 120 pts behind 6th".
4. **Teacher-configured settings are silently dropped at launch.** Per-question time limit, shuffle questions/choices, "show leaderboard after each", per-question points and images are stored but never sent to the server (`Dashboard.tsx:112-118`). ROADMAP 4.1's claim that per-question timers need "no server changes" is wrong in spirit: the launch mapping must change.
5. **Learning value stops at the podium.** No per-question data is saved for live games, no explanations, no review of missed questions, and logged-in students can get *another player's* score saved to their progress (`Game.tsx:272-275`).

Fixing 1–5 is mostly S/M effort and should precede any new modes or question types. After that, the highest-leverage additions are: a fairer scoring curve with a read-time phase, host pacing controls, images + poll + type-answer, and three differentiated modes (Accuracy/Learning mode, Co-op Boss Battle, Student-paced live).

---

## 2. Current State — How the Game Actually Plays

### 2.1 Flow and timings

| Phase | What happens | Duration / control | Source |
|---|---|---|---|
| Lobby | Host screen: QR, code, player list, optional team names. Phone: "Waiting for host". | Host presses Start (needs ≥1 player). | `Game.tsx:767-875` |
| Question | Server emits `game:question`; client waits 400 ms transition, then shows text + choices on **both** host and phone, timer starts at `durationSec` (not synced to `endsAt`). | Quiz-wide `questionDuration` (default 30 s, clamp 5–120). Ends early when `answers >= players` (counts disconnected players too). | `index.ts:702-736`, `Game.tsx:198-213` |
| Reveal | Same fullscreen sequence on host and phone: correct answer + distribution bars (2.0 s) → "Points earned" list with count-up (2.5 s) → top-8 leaderboard. | Server hard-codes 5,000 ms then auto-starts next question. No host Next. | `index.ts:759-764`, `Game.tsx:219-250` |
| Final | `game:results` → podium (top 3) + list + team totals. Host saves `gameResult`. Students "save progress". | No suspense build-up; podium appears immediately after last reveal. | `Game.tsx:394-455` |

Host controls during a question only: Pause/Resume, +30 s, Skip, End Game (`Game.tsx:628-663`). Nothing is available during reveal or between questions.

### 2.2 Scoring formula (`gameManager.ts:347-365`)

```
correct:  speedScore = round(timeRemaining / duration * 1000)   // 0..1000, linear
          streak += 1
          streakBonus = min(streak - 1, 5) * 100                 // 0..500
          score += speedScore + streakBonus
wrong:    streak = 0, no points
no answer: streak = 0, no points
```

- `timeRemaining = questionEndsAt - answeredAt`, computed at **finalize time** (not at answer time).
- No minimum for a correct answer: a correct answer in the last second earns ~0–50 pts.
- `QuizQuestion.points` (double points) is ignored.
- Team score = **sum** of member scores (`gameManager.ts:604-615`).

### 2.3 Question types

- Builder supports `multiple-choice` and `true-false` (T/F is just a 2-choice MC that is locked). Server validates 2–6 choices.
- Client has only **4 colours** (`CHOICE_COLORS`), so choices 5 and 6 reuse red/blue. No shapes (colour-blind accessibility gap — Kahoot uses shape + colour).
- `imageUrl` exists on the type but is not sent or rendered.
- No poll, multi-select, type-answer, slider, ordering, open-ended, slide.

### 2.4 Host screen vs phone

| | Host / projector | Player phone |
|---|---|---|
| Question | Text, choices as tiles, timer, "N / M answered" bar, controls | Text, choice buttons, timer |
| After answering | — | "Answer locked in — waiting for results..." |
| Reveal | Shared animation | **Identical** shared animation; own choice not highlighted; must find own name in a list |
| Final | Podium + list + "View Full Report" | Same podium + "Back to Dashboard" (anonymous players have no dashboard) |

### 2.5 Self-paced assignment mode (`AssignmentTake.tsx`)

Name entry → one question at a time, immediate correct/wrong colouring, "Next" → final % score. No timer, no points/streak, no explanations, no retry of missed questions, no shuffle, one attempt per typed name (trivially bypassed by changing name). `AssignmentReport.tsx` does show per-question accuracy — the only "hardest question" view in the product.

### 2.6 Demo vs reality

`Demo.tsx` (the marketing demo) shows a host-paced "Next" button, a personal "Correct! / Total: X pts" student result card, and emoji avatars. **None of these exist in the real game.** The demo also uses a different scoring formula (`timeLeft*5+100`). This sets expectations the product doesn't meet.

---

## 3. Issues Found

Severity: **Critical** (breaks fairness or the core loop), **High** (major fun/learning loss), **Medium**, **Low**.

### 3.1 Fairness & scoring

| # | Sev | Issue | Evidence |
|---|---|---|---|
| F1 | Critical | **Pause and +30 s inflate scores.** `extendQuestionTime` and `resumeGame` move `questionEndsAt` later; `finalizeQuestion` then computes every earlier answer's `timeRemaining` against the new end. Example: 20 s question, answer at 2 s, host adds +30 s → `48/20*1000 = 2,400` pts. A 60 s pause gives early answerers ~4,000. `speedScore` is not clamped to 1,000. | `gameManager.ts:354-355, 504-534` |
| F2 | High | **Answers accepted while paused.** `recordAnswer` doesn't check `game.paused`; the overlay only blocks the UI. Combined with F1, a paused-period answer can be worth more than an instant one. | `gameManager.ts:286-315` |
| F3 | High | **Linear 0–1,000 speed curve over-rewards speed vs accuracy.** A correct answer at 90% of the timer is worth ~100; with a 5-streak, a fast wrong-then-right student loses to a fast-always student by far more than accuracy merits. Slow-but-correct readers (younger students, ELL, dyslexic) are punished nearly as hard as wrong answers. Kahoot's curve is 500–1,000 for any correct answer. | `gameManager.ts:355` |
| F4 | High | **No read-time phase.** Question and choices appear together with the clock running, so the score measures reading speed as much as knowledge. Client also loses 400 ms to the transition animation and the client timer starts from `durationSec` rather than `endsAt`, so network-lagged phones see a "fuller" timer than the server is using. | `Game.tsx:198-213`, `index.ts:721-733` |
| F5 | Medium | **Streak snowballs.** Up to +500 per question for the leader; across 20 questions a perfect streak adds ~7,500 — often more than a full extra correct answer per question. No comeback mechanism exists. | `gameManager.ts:358-359` |
| F6 | Medium | **Team score = sum.** Larger teams win; disconnected-player cleanup unbalances teams mid-game. Teams are balanced on join but late-join is disallowed and kicked/dropped players are not replaced. | `gameManager.ts:604-615` |
| F7 | Medium | **Early-end counts disconnected players**, so one dropped phone makes every remaining question run the full timer (flat, waiting dead time). | `index.ts:483-487` |
| F8 | Low | Duplicate nicknames allowed; reconnect matches the *first* disconnected player with that name, and the client keys animated scores by name, so two "Sam"s collide. | `gameManager.ts:194, 643`, `Game.tsx:233-242` |
| F9 | Low | `host:extend-time` accepts any number (`Number(x) || 30`) — a negative value shortens the question. | `index.ts:668` |

### 3.2 Pacing & loop

| # | Sev | Issue | Evidence |
|---|---|---|---|
| P1 | Critical | **Leaderboard visible ~0.5 s.** Client phase timers (2,000 + 2,500 ms) vs server reveal of 5,000 ms then 400 ms out-transition. The rank-change moment — the core "tension/reward" beat of the genre — never registers. | `index.ts:760-763`, `Game.tsx:229-249` |
| P2 | Critical | **No host control between questions.** Teachers cannot hold the reveal to discuss a misconception, cannot show/hide the leaderboard, cannot pause during reveal. Pause only works in `question` state. This is the single biggest classroom-use blocker. | `gameManager.ts:490-498`, `index.ts:759-764` |
| P3 | High | **Stored settings ignored at launch.** `timeLimit` per question, `shuffleQuestions`, `shuffleChoices`, `showLeaderboardAfterEach`, `points`, `imageUrl` never reach the server. The builder shows a "Shuffle question order" checkbox that does nothing. | `Dashboard.tsx:112-118`, `QuizBuilder.tsx:394` |
| P4 | High | **No end-game suspense.** Last reveal → podium instantly; no "Top 5", no drumroll, no 3rd→2nd→1st reveal, no confetti or sound. | `Game.tsx:394-455`, `index.ts:705-716` |
| P5 | Medium | **Fixed reveal length regardless of player count/question.** A 2-player game and a 50-player game get the same 5 s; the "points earned" list for 50 players is unreadable in 2.5 s. | `Game.tsx:505-529` |
| P6 | Medium | **Resume resets the timer ring to full** (`setTotalTime(remaining)`), which reads as "time was added". | `Game.tsx:147-152` |
| P7 | Low | No "get ready / question 3 of 10" interstitial; questions just appear. | — |

### 3.3 Feedback & engagement

| # | Sev | Issue |
|---|---|---|
| E1 | Critical | **No personal result on phone** (correct/incorrect, points, streak, rank, gap to next). The server already computes it all in `finalizeQuestion` but only broadcasts a shared payload. Also the player's chosen answer is not highlighted on reveal (reveal cards ignore `selectedChoice`). |
| E2 | High | **No audio at all** — no lobby music, countdown tick, last-5-seconds tension, correct/wrong sting, podium fanfare. Sound is ~40% of the "energy" of Kahoot-style games in a room. |
| E3 | Medium | **No identity layer:** no avatars (podium uses first initial), no nickname generator (ROADMAP 4.9 not built), no reactions/emotes in lobby or podium. |
| E4 | Medium | **No player-side personal recap** at end ("8/10 correct, best streak 5, fastest answer 1.2 s, you climbed 6 places"). Phones just show the shared podium. |
| E5 | Medium | **Colour-only answer coding**, only 4 colours for up to 6 options; no shapes. |
| E6 | Low | Anonymous players' only end CTA is "Back to Dashboard" — dead end; no "Play again" / "Review my answers". |

### 3.4 Educational value

| # | Sev | Issue | Evidence |
|---|---|---|---|
| L1 | High | **Live game results store only name/score/rank** — no per-question answers, accuracy, or time. `Results.tsx` can't show hardest questions; teachers lose the formative-assessment data the game generated. ROADMAP 4.3 says to add distribution "during reveal" — that part already exists; the real gap is **persisting** it. | `Game.tsx:258-265`, `Results.tsx` |
| L2 | High | **Wrong student progress saved.** Student match is by `displayName` first name, falling back to `leaderboard[0]` — the winner's score. | `Game.tsx:272-275` |
| L3 | High | **No explanation / rationale field** shown after reveal, in live or assignment mode. The reveal says *what* is right, never *why*. | `types/quiz.ts` |
| L4 | Medium | **No "review missed questions"** after a live game or assignment, no auto-generated follow-up assignment, no spaced repetition. |
| L5 | Medium | Assignment mode: no shuffle, no retake/mastery option, name-based identity, binary feedback only. | `AssignmentTake.tsx` |

---

## 4. Evaluation as a Game Designer

### 4.1 The core loop

`Read → Decide under time pressure → Lock in → (Wait) → Reveal truth → See points → See rank change → Anticipate next`.

- **Where it works:** the question phase has genuine tension — big coloured tiles, ring timer turning red at 5 s, the host's "N / M answered" bar creating social pressure, early end when everyone answers.
- **Where it goes flat:**
  1. *Waiting after locking in* — the phone shows a static banner for up to 30 s. No "X players answered", no anticipation cues, no sound.
  2. *The reveal* — the payoff is shared, impersonal, and cut short. You never personally hear "Correct!" and you never see yourself move up. The rank-delta system exists but is shown for half a second.
  3. *Mid-game middle* — no variety of question type, no bonus/double-points questions, no milestone moments ("halfway leaderboard"), so 20 identical MCQs feel the same.
  4. *Ending* — no build-up, no celebration.
  5. *After* — nothing to do; no recap, no review, no replay.

The fix priority therefore isn't "more features", it's **making the existing beats land**: personal reveal, host-held reveal, visible leaderboard, sound, podium build-up.

### 4.2 Scoring: recommended model

Goals: knowledge > speed, speed still matters for tension, trailing players stay engaged, no clock exploits.

```
base           = question.points (default 1000; 0 for poll; 2000 for double)
speedFactor    = clamp(1 - elapsed/answerWindow, 0, 1)    // elapsed excludes paused time, starts at answer-unlock
correctPoints  = round(base * (0.5 + 0.5 * speedFactor))  // 500..1000 for a normal question
streakBonus    = min(streak-1, 3) * 50                     // 0..150, capped lower than today
```

- Compute `elapsed` **at answer time** from a server `answerUnlockedAt` and accumulated pause, store it on the answer, and never re-derive from `questionEndsAt`. Reject answers while paused. This fixes F1/F2 by construction.
- Add a **read phase**: show question for `clamp(words * 0.25s, 2s, 6s)` on host and phone before choices unlock (Kahoot does ~5 s). Score from unlock (F4).
- **Comeback without punishing the leader:** (a) host-flagged *double-points* questions, defaulting to the final question; (b) on the phone, show "You're 120 behind #6" — a reachable target is the cheapest anti-snowball tool; (c) cap streaks lower. Avoid rubber-banding that gives the trailing player more points for the same answer — classes notice and it reads as unfair.
- **Scoring modes** (ROADMAP 4.7): `classic` (above), `accuracy` (flat base for correct, speed only as a tie-break), `none`.
- **Teams:** score = *average* of members' points per question (or average correct %), plus a small "everyone answered" bonus to encourage the whole team to participate.

### 4.3 Question types — what to build, in order

| Rank | Type | Why | Effort |
|---|---|---|---|
| 1 | **Images on questions** (not a type, but a prerequisite) | Unlocks science diagrams, maps, art, math figures; #1 teacher ask. Already modelled (`imageUrl`). | M |
| 2 | **Poll / opinion (no score)** | Nearly free: answer distribution already renders; just skip scoring and the "correct" marker. Great warm-ups, exit tickets, check-for-understanding ("How confident are you?"). | S |
| 3 | **Type-answer (short text)** | Tests *recall* rather than recognition — the biggest learning upgrade. Normalised matching (case, whitespace, accents, list of accepted answers, optional typo tolerance). Reveal shows the most common wrong answers — gold for teachers. | M |
| 4 | **Multi-select** | Common in real assessments; distinguishes partial understanding. Score: all-or-nothing in classic, proportional in accuracy mode. | M |
| 5 | **Slider / estimate** | Very fun in a room (dramatic "closest wins" reveal); good for math/science estimation. Score by closeness band. | M |
| 6 | **Ordering / sequence** | Timelines, processes, number ordering. Needs drag on mobile — fiddly UX. | M |
| 7 | **Slide (content, no answer)** | Lets teachers teach inside the deck; requires host-Next (P2). | S once P2 done |
| 8 | **Open-ended / word cloud** | High wow-factor but needs moderation (profanity filter, host approve) — classroom risk. | L |
| — | **True/false** | Already exists; just give it a two-big-button layout (True = green check / False = red X). | S |
| — | Audio | Useful for language learning; lower priority than images. | M |

**Build first: Images → Poll → Type-answer.** Images are content enablement for every subject; Poll is near-zero cost and widens use beyond quizzing; Type-answer is the single biggest boost to educational credibility and a differentiator against free Kahoot.

### 4.4 Game modes — the 3 that would most differentiate

1. **Accuracy / Learning mode ("Mastery")** — no speed pressure, read phase, explanation shown on every reveal, missed questions re-asked at the end of the game ("Second chance round") for partial credit. Positioning: "the quiz game teachers don't feel guilty about." Mostly reuses existing loop + explanation field + re-queue logic. *Effort M.*
2. **Co-op Boss Battle** — the whole class (or each team) vs a boss with an HP bar on the projector. Each correct answer deals damage (accuracy-weighted, speed as crit); wrong answers let the boss "heal" or hit back. Win/lose together. Turns competition into collaboration, keeps low performers contributing, and is very theatrical on a projector. Blooket/Gimkit have co-op variants but Kahoot doesn't in its core. *Effort M–L (mostly presentation; scoring is an aggregate).*
3. **Student-paced live ("Race")** — Quizizz-style: everyone starts together, each phone advances on its own, host projects a live progress race / class heatmap. Builds directly on `AssignmentTake` + socket rooms. Solves the mixed-ability problem (fast kids aren't bored, slow kids aren't rushed), and gives teachers a live per-question heatmap. *Effort L.*

Honourable mentions: **Survival/elimination** (fun for events, bad for classrooms — eliminated kids disengage; if built, use "ghost" mode where eliminated players keep answering for a revival), **Practice mode** (solo replay of any quiz with no timer — cheap once Mastery exists), existing **Team mode** (fix sum→average first).

### 4.5 Engagement

| Feature | Recommendation |
|---|---|
| Sound & music | Lobby loop, 3-2-1 countdown, ticking last 5 s, correct/incorrect sting on phone, leaderboard whoosh, podium fanfare. Host-side mute toggle; phones default to SFX only. Web Audio, a handful of small files. **High impact.** |
| Personal reveal | Full-screen green/red on phone: "Correct! +840 · Streak 3 · You're 4th (↑2) · 60 pts behind 3rd". Haptic `navigator.vibrate` on Android. **Highest impact per effort.** |
| Avatars & nicknames | Emoji/animal avatar picker on join + nickname generator (ROADMAP 4.9). Optional "teacher-safe names only" mode (generated names only) to avoid inappropriate nicknames — a real classroom concern. |
| Reactions/emotes | Lobby and podium only (not during questions) — 4–6 emoji floating on the host screen. Rate-limited. |
| Power-ups | Avoid in classic/learning modes; they reward luck over learning and teachers distrust them. If added, keep to a separate "party" mode and tie to learning (e.g., earn a 50/50 by a 3-streak; "shield" protects your streak once). |
| Podium | Reveal 3rd → 2nd → 1st with delays, confetti, sound; top-5 "build-up" screen before; on phones show personal placement + recap. |
| Post-game recap (phone) | Accuracy, best streak, fastest correct, places gained, list of missed questions with correct answer + explanation, "Practice these again" button. |

### 4.6 Host pacing controls

Recommended set (server-authoritative state machine: `lobby → [read] → question → reveal → leaderboard? → next`):

- **Next** (required) with **Auto-advance** toggle and per-phase durations (reveal N s, leaderboard N s).
- **Show leaderboard every N questions** (0 = never, 1 = every question, plus always at halfway and before final) — honours the existing `showLeaderboardAfterEach` setting.
- **Pause anywhere** (including reveal), **+10/+30 s**, **Skip**, **End**.
- **Hide names / show top 5 only** (privacy and avoiding public shaming of low scorers).
- **Kick player / rename** in lobby.
- Keyboard shortcuts for the host laptop (Space = next, P = pause).

### 4.7 Educational value

- **Explanation field** per question, shown on reveal (host + phone) and in recaps.
- **Persist per-question stats** for live games: answer distribution, % correct, avg time, per-player answer. Results page: "Hardest questions" ranked by % correct, most common wrong answer, per-student grid.
- **Re-teach loop:** button on Results — "Create assignment from missed questions" (per class) and "Assign each student their own missed questions" (per student) using the existing assignment system.
- **Spaced repetition (later):** for logged-in students, schedule re-exposure of missed items in a "Daily 5" practice set (Leitner boxes is enough). Needs stable student identity — fix L2 first.
- **Standards rollup:** questions already carry `standards[]`; aggregate accuracy by standard in reports — strong differentiator already promised on the ROADMAP "moat" table.

---

## 5. Prioritized Recommendations

Effort: **S** ≤ 1 day, **M** 2–4 days, **L** 1–2 weeks.

### P0 — Fix the core loop (do before any new feature)

| # | Recommendation | Effort | Files |
|---|---|---|---|
| 1 | **Fix scoring clock.** Store `questionStartedAt`/`answerUnlockedAt` and accumulated pause ms; compute and store `elapsedMs` at answer time; clamp speed factor to [0,1]; reject answers while paused; validate `extraSeconds` (e.g., 5–60). | S | `server/src/services/gameManager.ts`, `server/src/index.ts`, `server/src/validators/schemas.ts` |
| 2 | **Host-paced reveal.** Replace fixed 5 s `setTimeout` with a server state machine: `reveal → leaderboard (optional) → waiting-for-next`; add `host:next` event and Auto-advance toggle; drive client phases from server events instead of local timers; allow pause in reveal. | M | `server/src/index.ts`, `server/src/services/gameManager.ts`, `server/src/types/events.ts`, `src/types/events.ts`, `src/pages/Game.tsx` |
| 3 | **Personal result per player.** In `endCurrentQuestion`, emit `game:player:result` to each socket `{ chosenIndex, correct, pointsEarned, streak, rank, rankDelta, totalScore, gapToNext }`; render full-screen correct/incorrect on phone; highlight the player's choice on the reveal. | S–M | `server/src/index.ts`, `server/src/services/gameManager.ts`, `src/pages/Game.tsx`, `src/pages/Game.css` |
| 4 | **Honour stored settings at launch.** Map `q.timeLimit` → `durationSec`, apply shuffle (questions server-side, choices with index remap), pass `points`, `imageUrl`, `showLeaderboardAfterEach`. Correct ROADMAP 4.1 note (launch mapping is the actual gap). | S | `src/pages/Dashboard.tsx`, `server/src/validators/schemas.ts`, `server/src/services/gameManager.ts`, `ROADMAP.md` |
| 5 | **Correct student identity/progress.** Server returns each player's own final entry (by socket) in `game:results`; stop name-matching and the `leaderboard[0]` fallback; enforce unique nicknames per game. | S | `server/src/index.ts`, `server/src/services/gameManager.ts`, `src/pages/Game.tsx` |
| 6 | **Early-end uses connected players only.** | S | `server/src/index.ts` |

### P1 — Make it feel great and fair

| # | Recommendation | Effort | Files |
|---|---|---|---|
| 7 | **New scoring curve** (500–1,000 for correct, streak cap +150, `points` multiplier, double-points final question) + **scoring modes** classic/accuracy/none (ROADMAP 4.7). | S–M | `gameManager.ts`, `src/types/quiz.ts`, `src/pages/QuizBuilder.tsx`, `src/pages/Game.tsx` |
| 8 | **Read phase** before answers unlock (auto-scaled 2–6 s, configurable). | S | `gameManager.ts`, `index.ts`, `Game.tsx` |
| 9 | **Sound design** (lobby, countdown, last-5 s tick, correct/wrong, podium) with host mute. | M | `src/pages/Game.tsx`, new `src/services/sound.ts`, `public/sounds/` |
| 10 | **Podium build-up**: top-5 screen → 3rd/2nd/1st staggered reveal → confetti (ROADMAP 4.4); phone shows personal placement. | S | `Game.tsx`, `Game.css`, `package.json` |
| 11 | **Leaderboard cadence**: show every N questions + halfway + pre-final; "top 5 / hide names" toggles. | S (after #2) | `index.ts`, `Game.tsx` |
| 12 | **Team scoring = average** (+ all-answered bonus); show team standings on reveal, not only at end. | S | `gameManager.ts`, `Game.tsx` |
| 13 | **Avatars + nickname generator + safe-names mode** (ROADMAP 4.9). | S | `src/pages/JoinGame.tsx`, `src/data/nicknames.ts`, `gameManager.ts` |
| 14 | **Shapes + 6 colours** on choices; two-button True/False layout. | S | `Game.tsx`, `Game.css`, `AssignmentTake.tsx` |
| 15 | **Sync client timer to `endsAt`** and fix resume ring reset. | S | `Game.tsx` |

### P2 — Content & learning depth

| # | Recommendation | Effort | Files |
|---|---|---|---|
| 16 | **Images on questions** (ROADMAP 4.2). | M | `QuizBuilder.tsx`, `Game.tsx`, `AssignmentTake.tsx`, `schemas.ts`, `services/firebase.ts` |
| 17 | **Explanation field** shown on reveal + recap + assignment feedback. | S–M | `src/types/quiz.ts`, `QuizBuilder.tsx`, `Game.tsx`, `AssignmentTake.tsx`, `schemas.ts`, `services/aiGenerator.ts` (have AI generate explanations) |
| 18 | **Persist per-question stats** for live games; Results "Hardest questions", most common wrong answer, per-student grid, standards rollup. | M | `gameManager.ts`, `index.ts`, `src/services/gameResults.ts`, `src/types/gameResult.ts`, `src/pages/Results.tsx` |
| 19 | **Poll question type** (ROADMAP 4.6). | S | `types/quiz.ts`, `schemas.ts`, `gameManager.ts`, `QuizBuilder.tsx`, `Game.tsx` |
| 20 | **Type-answer question type** with normalised matching + accepted-answers list; reveal shows top wrong answers. | M | same as #19 + `AssignmentTake.tsx` |
| 21 | **Player post-game recap** with missed questions + explanations + "Practice again". | M | `Game.tsx`, new recap component, `index.ts` |
| 22 | **"Assign missed questions"** from Results (class-wide and per-student). | M | `Results.tsx`, `src/services/assignments.ts` |
| 23 | **Multi-select, slider, ordering** types. | M each | as #19 |

### P3 — Differentiating modes

| # | Recommendation | Effort | Files |
|---|---|---|---|
| 24 | **Accuracy / Mastery mode** (no speed, explanations, second-chance round). | M | `gameManager.ts`, `index.ts`, `Game.tsx`, launch settings in `Dashboard.tsx` |
| 25 | **Co-op Boss Battle**. | M–L | `gameManager.ts` (aggregate damage), `Game.tsx` + new host/phone views, assets |
| 26 | **Student-paced live race** with live teacher heatmap. | L | new server handlers, new `src/pages/` view, reuse `AssignmentTake.tsx` logic |
| 27 | **Practice mode** (solo, untimed replay; Leitner-style "Daily 5" for logged-in students). | M → L | `AssignmentTake.tsx`-derived page, `services/studentProgress.ts` |
| 28 | **Align `Demo.tsx`** with the real game once #2/#3 ship (or vice versa) so the demo stops over-promising. | S | `src/pages/Demo.tsx` |

---

## 6. Suggested Sequencing

1. **Sprint 1 (fairness + feel):** #1, #3, #4, #5, #6, #15 — all S; game becomes fair and personal.
2. **Sprint 2 (pacing + juice):** #2, #11, #10, #9, #7, #8 — the loop now has rhythm, sound, and a payoff.
3. **Sprint 3 (learning):** #17, #18, #16, #19, #21 — explanations, images, poll, teacher insight.
4. **Sprint 4 (differentiate):** #20, #24, then #25 or #26 depending on target market (classrooms → Mastery + Race; events/teams → Boss Battle + teams).
