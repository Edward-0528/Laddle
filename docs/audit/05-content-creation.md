# Audit 05 — Content Creation (Builder, Import, AI, Library, Marketplace, Data Model)

Auditor role: Content Creation Product Owner. Scope: everything a teacher/host touches between "I have an idea or a file" and "I have a quiz I can launch / share". No code was changed.

Goal lens: *"The app people genuinely want to use for all your quizzes."* For content creation that means three things: (1) getting existing quizzes **in** with zero friction (Kahoot/Quizlet/Forms/Docs/worksheets), (2) authoring that is **faster than Kahoot** and never loses work, (3) finding, copying and sharing good quizzes.

---

## 0. Executive summary

| Area | Grade | One-line verdict |
|---|---|---|
| Firestore rules (quizzes) | **F** | `allow list: if true` lets anyone, unauthenticated, dump every private quiz *including answer keys*. Any signed-in user can inject fake "SYSTEM" library templates. |
| Marketplace | **F (broken)** | User-created public quizzes can never appear (`orderBy('rating')` drops docs without `rating`); Fork throws on `undefined` fields and on a rules-denied counter write; Upvote is always rules-denied. |
| Quiz builder | **D** | Works for a 10-question MC quiz, but: no autosave/drafts, no unsaved-changes guard, no reorder/duplicate, per-question time not editable, images/points unimplemented, shuffle checkbox is a no-op, two silent save/launch failure paths. |
| Importer | **C-** | Good idea (paste + XLSX/CSV with review), but several documented formats fail, ChatGPT-style markdown output fails, Kahoot's own template fails, letter→column mapping can mark the wrong answer. |
| AI generation | **C** | Key is server-side (good) and uses JSON schema mode, but the endpoint is **unauthenticated, unmetered and un-rate-limited** (Pro feature given away to anyone with curl), validation is loose, topic-only input. |
| Library | **C+** | 10 decent CA-aligned templates / 129 questions; fork works. Seed button exposed to every user; no search; separate from marketplace. |
| Data model | **D+** | No schema version; single `correctAnswerIndex` blocks multi-select/type-answer/ordering/poll; `timeLimit`/`points`/`imageUrl`/`shuffle*` exist but are ignored end-to-end. |

### Top 10 fixes, in order
1. **Rules: remove `allow list: if true`** and scope list/get to owner, SYSTEM templates, and `isPublic == true` (P0 security, S).
2. **Rules: forbid client creation of `createdBy=='SYSTEM'`**; forbid changing `createdBy`/`isTemplate`/`rating`/`forkCount` on update (P0, S).
3. **AI endpoint: require Firebase ID token, per-user monthly quota in Firestore, per-IP rate limit** (P0 cost, M).
4. **Marketplace query/write fixes** — write `rating: 0, forkCount: 0` on create, add composite indexes, move upvote/fork-count to a server/Cloud Function or narrow rule, strip `undefined` (P0, S).
5. **Builder autosave + `beforeunload` guard** (P0 data loss, S/M).
6. **Builder `standards: undefined` save crash** and empty-choice launch failure (P0, S).
7. **Per-question time limit actually used** at launch, plus points and images (P1, M).
8. **Importer: Kahoot XLSX, ChatGPT/markdown paste, blank-line tolerance, numeric correct index, column alignment** (P1, M).
9. **Reorder / duplicate / delete-with-undo questions, keyboard flow** (P1, M).
10. **Schema v2 with `schemaVersion` + discriminated-union question types** before adding new types (P1, M).

---

## 1. Quiz Builder (`src/pages/QuizBuilder.tsx`)

### 1.1 What exists
Single page: Quiz Details card (title, description, category, global time per question, public, shuffle questions) + Questions card with Q1..Qn tabs, one active editor (type toggle MC/TF, single-line question text, 2–4 choices with radio for correct, per-question standards). Buttons: Generate with AI, Import, Add Question, Remove. Save → navigates to `/dashboard`.

### 1.2 Concrete bugs

| # | Sev | Location | Failing input / repro | Effect | Fix |
|---|---|---|---|---|---|
| B1 | **P0** | `QuizBuilder.tsx:557-563` | Type `CCSS.MATH.3` into Standards, then clear the field, then Save. | `updateQuestionField(..., 'standards', undefined)` puts a literal `undefined` into the questions array. Firestore is initialised with plain `getFirestore(app)` (`src/services/firebase.ts:37`, no `ignoreUndefinedProperties`) so `addDoc`/`updateDoc` throws *"Unsupported field value: undefined"* → generic "Failed to save quiz". User cannot save until they type something back. | Delete the key instead of setting `undefined` (`const { standards, ...rest } = q`), **and** initialise Firestore with `initializeFirestore(app, { ignoreUndefinedProperties: true })` as defence in depth. |
| B2 | **P0** | `QuizBuilder.tsx:232-238` vs `server/src/validators/schemas.ts:26-29`, `src/pages/Dashboard.tsx:113-119` | MC question with choices `["Paris","London","",""]`, correct = Paris. | Builder validation passes (≥2 filled + correct non-empty). At launch Dashboard sends all 4 choices; server Zod `z.string().min(1)` rejects → host sees *"Invalid quiz data"* with no indication which question. Same for text > 500 chars, choice > 200 chars, > 50 questions (all unchecked in builder; import/AI can produce them). | Trim + drop empty choices on save (re-map `correctAnswerIndex`), and mirror server limits in `validate()` (text ≤ 500, choice ≤ 200, ≤ 50 questions, 2–6 choices). Better: share one zod schema between client and server (`shared/quizSchema.ts`). |
| B3 | P1 | `QuizBuilder.tsx:163-186` (lines 172, 181) | On an MC question with correct = C, click the already-active **Multiple Choice** button. | `correctAnswerIndex` is reset to 0 unconditionally → correct answer silently becomes A. Same for clicking TF when already TF (resets to True). | Early-return if `q.questionType === type`; only reset when switching. Offer undo when MC→TF discards typed choices. |
| B4 | P1 | `QuizBuilder.tsx:194-200` | New quiz (one empty Q1), Import 10 questions, Save. | Imported questions are appended after the blank placeholder → validation error *"Question 1 is missing the question text."* AI path handles this (`:206-207`), import path does not. Also `setActiveQuestionIndex(questions.length)` points at the first import only by accident. | Reuse the AI logic: drop untouched empty placeholders before merge. |
| B5 | P2 | `QuizBuilder.tsx:210` | Quiz has 8 questions; generate 5 with AI. | Active tab jumps to Q1 instead of the first generated question (Q9). | `setActiveQuestionIndex(base.length)`. |
| B6 | P1 | `QuizBuilder.tsx:50`, `Dashboard.tsx:118`, `src/services/quizImport.ts:137`, `src/services/aiGenerate.ts:48` | Any quiz. | `QuizQuestion.timeLimit` is written as 30 everywhere and **never read** — launch uses `quiz.settings.questionDuration` for every question. ROADMAP 4.1 believes `durationSec` already exists per question; it does not on the client type. | Rename to `durationSec` (or map), add per-question select (default "Use quiz default"), send `q.durationSec ?? settings.questionDuration` in `handleLaunch`. |
| B7 | P1 | `QuizBuilder.tsx:391-400`; `settings.shuffleChoices`, `showLeaderboardAfterEach`, `maxPlayers` | Tick "Shuffle question order", launch. | No code anywhere (client or server) reads any of these settings. The checkbox is a placebo; library templates ship `shuffleChoices: true` which also does nothing. | Either implement in `handleLaunch`/gameManager (shuffle choices must remap answerIndex server-side) or remove the UI until implemented. |
| B8 | P2 | `QuizBuilder.tsx:25-34` vs `src/types/quiz.ts:95-109` vs `src/data/libraryQuizzes.ts` (`'Math'`, `'English Language Arts'`) | Edit a forked library quiz. | Three category lists disagree (`Movies and TV` vs `Movies & TV`; templates use `Math`, which is not an option). The `<select>` shows "General Knowledge" while state holds "Math"; saving after touching it silently recategorises. | Single source of truth: `QUIZ_CATEGORIES` + subject taxonomy; render unknown value as an extra option. |
| B9 | P2 | `QuizBuilder.tsx:41` vs `types/quiz.ts:80` vs `libraryQuizzes.ts:35` | — | Three different `maxPlayers` defaults (50/20/35); unused anyway (B7). | Consolidate on `DEFAULT_QUIZ_SETTINGS`. |
| B10 | P2 | `QuizBuilder.tsx:44-53` | — | `id = Date.now()+4 base36 chars`; bulk import/AI create many IDs in the same ms (≈1.7M space per ms — low but non-zero collision; question IDs are used as React keys in Marketplace and as answer `questionId` in assignments). | `crypto.randomUUID()` (already used in importer). |
| B11 | P2 | `QuizBuilder.tsx:213-219`, `:318` | Click Remove on a 20-line question; click Cancel after 30 minutes of work. | No confirm, no undo, no unsaved-changes prompt. | Undo toast for delete; dirty-state confirm on Cancel / route change / `beforeunload`. |

### 1.3 Data-loss analysis (autosave / drafts)
- **Refresh, tab close, accidental back-swipe, session expiry, or a crash = everything lost.** No localStorage draft, no `beforeunload`, no React Router blocker, no periodic save. A teacher building 25 questions on a Chromebook will lose work. This is the #1 reason people abandon builders.
- Save always navigates away (`:282`), so there is no "save and keep editing"; editing an existing quiz requires repeatedly re-entering via `?edit=`.
- A new quiz has no document ID until first save, so there is nothing to autosave against.

**Recommendation (S→M):** (1) Immediately: debounce-write the whole builder state to `localStorage['ladle:draft:<editId|new>']` every 1s, restore with a "Restore unsaved draft from 3 min ago?" banner, clear on successful save; add `beforeunload` + `useBlocker` when dirty. (2) Then: create the Firestore doc on first meaningful edit with `status: 'draft'`, autosave via debounced `updateDoc` (show "Saved · 2s ago"), and make "Save" → "Done". Drafts hidden from marketplace/launch until valid.

### 1.4 Authoring speed / keyboard flow
- Question text is a single-line `<Input>` (`:474-482`) — no multiline, no line breaks, no math/code formatting.
- No keyboard flow: Enter in a choice does not move to next choice; no shortcut to add a question (Kahoot/Quizizz users expect `Enter`→next field, `Ctrl/Cmd+Enter`→new question, `Alt+1..4` → mark correct).
- Tabs show only "Q1, Q2…" — no text preview, no validity indicator (red dot for incomplete), so with 30 questions you cannot find the broken one the validator names.
- Only one question visible at a time; no list/outline view; no bulk edit (set all times, set all points, change type).
- Max 4 choices in builder (`:138`, `:489`) while server accepts 6 and the text importer produces up to 8 — inconsistent.
- No per-question **points** (`points?` exists in type, unused), **images/media** (`imageUrl?` exists, unused; no upload, no Storage rules), **explanations/feedback**, **preview-as-player**.
- Mobile: CSS has breakpoints; unverified in device.

### 1.5 Validation
First error only, as a banner at the top; does not jump to/highlight the offending question; no inline field errors. Missing checks listed in B2; also duplicate choices ("4","4"), TF with non True/False choices (possible via XLSX `type=tf`), whitespace-only title already handled.

---

## 2. Importer (`src/services/quizImport.ts`, `src/components/ui/ImportModal.tsx`)

### 2.1 What exists
- **Paste text** tab — heuristic block parser (numbered/lettered, bullets, slash-inline, "Answer: X" line, markers `*`, `(correct)`, `(right)`, `✓`, `(answer)`, trailing `correct`).
- **Upload file** tab — `.xlsx/.xls/.csv` via SheetJS (`@e965/xlsx`), first sheet, header row 1, flexible header aliases.
- Review screen with include/exclude checkboxes, low-confidence highlighting, per-question warnings, CSV template download.
- Good bones: pure, side-effect-free, review-before-merge. No unit tests found for it.

### 2.2 Mental test run — text parser

| # | Input | Expected | Actual | Location | Fix |
|---|---|---|---|---|---|
| I1 | Documented "Format A" one-line choices: `1. What is 2+2?`⏎`A) 3   B) 4*   C) 5   D) 6` | 4 choices, B correct | Whole line is one "choice" (`3   B) 4*   C) 5   D) 6`) → <2 choices → **skipped**. The docblock advertises this format. | `:223` | Pre-split a line on `/\s+(?=[A-H][.)]\s)/` before matching. |
| I2 | Numbered choices: `What is 2+2?`⏎`1) 3`⏎`2) 4*`⏎`3) 5` | 3 choices | `splitByLeadingNumber` splits **every** `1)`/`2)` line into its own block → question has no choices, each choice becomes its own (rejected) "question" → 0 detected, 4 skipped. The numbered-choice branch at `:249` is unreachable. | `:173` | Only split on a number when the *previous* block already has ≥2 choices, or require the question numbering to be monotonic and distinct from a 1-restarting sub-list. |
| I3 | ChatGPT default output: `1. What is X?`⏎⏎`A) foo`⏎`B) bar` | 1 question | Blank line between stem and choices → split into two blocks; block 2 uses `A) foo` as the *question*, one choice → both skipped. This is the single most common paste source. | `:155` | Merge a block that contains only choice lines into the preceding stem-only block. |
| I4 | Markdown: `**1. Capital of France?**`⏎`- A) London`⏎`- **B) Paris**`⏎`**Answer:** B` | B correct | Stem keeps `**1. …**`; `**B) Paris**` matches neither letter (`^[A-H]`) nor bullet (`^[-*•]\s+` needs a space) and is **dropped**; `**Answer:**` not recognised → defaults to first choice, wrong answer. | `:194, :216, :223, :236` | Strip markdown emphasis (`/\*\*|__/g`) and bullet+letter prefixes (`- A)`) before matching; treat bold choice as correct marker. |
| I5 | Leading-asterisk marker (Kahoot/Quizlet/teacher convention): `*d) Paris` or `* Paris` vs `*Paris` | d correct | `*d) Paris` → not letter (starts with `*`), not bullet (no space) → **dropped**. `*Paris` dropped. | `:223, :236, :335` | Recognise leading `*`/`✓`/`[x]` as a correct marker; also `✔` (U+2714), `✅`, `(c)`. |
| I6 | `Answer: B) Paris` or `Answer: (B)` | B | `resolveTrailingAnswer("B) Paris")` → neither letter nor exact text → warning, defaults to A. | `:363-377` | Normalise: strip `^\(?([A-H])[).:]?\s*` and retry; then text match. |
| I7 | Documented "Format D": `The sun is a star.`⏎`True / False   Answer: True` | TF, True | Single line containing `/` → inline parser → choices `["True","False   Answer: True"]`, no TF detection, default A. | `:206` | Extract `Answer:` suffix before inline split. |
| I8 | Fractions/units: `Which is larger?`⏎`1/2 / 1/3 / 1/4` | 3 choices | Splits on every `/` → 6 "choices". | `:300` | Split on `\s+/\s+` (spaced slash) only. |
| I9 | Multi-line stem: `Read the passage:`⏎`A dog ran home.`⏎`A) …` | stem = 2 lines | `A dog ran home.` matches `^([A-H])[.):\s]` (space allowed) → becomes choice "dog ran home." | `:223` | Require `[.)]` or `:` after letter (not bare whitespace), and treat non-choice lines *before* the first choice as stem continuation (currently silently discarded). |
| I10 | Stem starting with a number: `100 meters is how many km?` / `2 + 2 = ?` | stem intact | Leading-number strip `\d+[.):\s]+` eats `100 ` → `meters is how many km?`; `2 + 2` → `+ 2 = ?`. | `:194` | Require punctuation: `^\d+[.)]\s+` (not bare space). |
| I11 | Choice text ending in "correct": `Politically correct` | not marked | `/\bcorrect\b$/i` marks it correct and strips it. | `:339` | Drop the bare-word pattern or require it in parentheses/after a dash. |
| I12 | Two choices marked `*` (multi-answer source) | warn "multiple correct" | Falls through to "No correct answer marked — defaulting to first choice" — misleading. | `:268-279` | Distinct warning; once multi-select exists, import as multi-select. |
| I13 | 6–8 lettered choices (A–H) | clamp or warn | Accepted; builder shows "6 of 4" and cannot edit count; >6 fails server Zod at launch (B2). | `:223` | Warn and cap to the supported max. |
| I14 | Paste with UTF‑8 BOM / zero-width chars | — | `﻿1. Q` → number not stripped. Minor. | `:152` | `text.replace(/^﻿/, '').normalize('NFC')`, strip `​`. |
| I15 | Quizlet export `term<TAB>definition` lines | flashcards → MC | 0 detected. | — | New importer (see 2.5). |

### 2.3 Mental test run — XLSX/CSV parser

| # | Input | Actual | Location | Fix |
|---|---|---|---|---|
| X1 | Template row where Answer A is blank: `Q, ,Paris,Rome,Berlin,B` | Choices compacted to `[Paris,Rome,Berlin]`; correct "B" → index 1 → **Rome marked correct** (should be Paris). Wrong answer key, no warning. | `:419-428` + `:444` | Resolve the letter against the *original slot* before compacting (keep slot→index map). |
| X2 | Numeric correct column `2` (Kahoot, Blooket, Quizizz, Google Sheets users all do this) | Not a letter, no text match → warning, defaults to first. If a choice literally is "2" (math quiz), it silently matches the *text* "2" — wrong if the user meant "option 2". | `:363-377` | Accept `1-6` as 1-based index when header is "correct (number)" or when all rows' correct values are integers in range and no choice-text ambiguity; flag ambiguous rows. |
| X3 | Correct by letter where a choice text is itself a letter (`Which letter follows A? B / C / D / E`, correct `B`) | Letter wins → index 1 = "C". | `:367` | Prefer exact text match when it exists *and* differs from the letter interpretation → warn. |
| X4 | **Kahoot's official template** (`KahootQuizTemplate.xlsx`): banner/instruction rows above the header; headers like `Question - max 120 characters`, `Answer 1 - max 75 characters`, `Time limit (sec) – 5, 10, 20…`, `Correct answer(s) - choose at least one` (value `1`–`4` or `1,3`) | Header not on row 1 → keys are `__EMPTY_n`; even if header found, normalised `questionmax120characters` matches no alias → **0 questions**. | `:104-109, :407-438` | Header-row detection (scan first 15 rows for a row containing a "question" cell), prefix/contains matching for aliases, numeric/multi correct, read time-limit column into `durationSec`. |
| X5 | CSV with accented chars and no BOM (Excel-for-Mac, Google Sheets "CSV") | SheetJS may decode as Latin‑1 → `Ã©`. (Verify on real files.) | `:104` | For `.csv`, read as text (`file.text()`, UTF‑8) and pass `type:'string'`; or `codepage: 65001`. |
| X6 | CSV cells like `1/2`, `3-4`, `0012` | SheetJS type-sniffs CSV: `1/2` becomes a date and `raw:false` returns a formatted date string; leading zeros lost. | `:104-109` | `XLSX.read(buf, { type, raw: true })` for CSV (keeps strings), `cellDates:false`. |
| X7 | Quoted commas `"Paris, France"` / multiline quoted cells | Handled correctly by SheetJS. | — | OK. |
| X8 | Columns E/F | Silently ignored (slots 0–3 only) even though server allows 6. | `:412-417` | Add `e`,`f`, `answer5/6`, warn when present but unsupported. |
| X9 | Multiple sheets | Only first sheet read, no picker. | `:105` | Sheet selector if >1 non-empty. |
| X10 | `Type = tf` but choices `Yes/No` | Marked TF; builder shows read-only labels "Yes/No" that cannot be edited. | `:456-458` | Only honour TF if choices are True/False (or rewrite them), else warn. |
| X11 | Skipped rows | Count only; user never learns *which* rows or *why*. | `:111-121` | Return `skippedRows: {row: number, reason: string}[]` and show them. |

### 2.4 Import UX gaps (`ImportModal.tsx`)
- Cannot fix anything in the review screen (`:274-319`) — only include/exclude. A low-confidence item ("defaulted to first choice") is **checked by default** (`:54`, `:75`), so the most common failure (wrong answer key) is imported silently unless the teacher reads every warning. Fix: click a choice in preview to set correct; uncheck or block "Add" for unresolved items until reviewed.
- Switching tabs throws away the parse (`:169, :175`).
- Choosing the same file again after an error does nothing (input `value` not reset, `:241-246`).
- No file size/row cap; large XLSX parses on the main thread. `@e965/xlsx` is statically imported into the builder chunk (`quizImport.ts:15`) — dynamic `import()` on first use would cut builder bundle weight.
- Template is CSV only, no XLSX, no "Kahoot-format" template, no example paste formats beyond the placeholder.
- Hint text claims formats (A-one-line, Format D) that don't parse (I1, I7).

### 2.5 Importers to add — prioritised

| Pri | Importer | Why | How | Size |
|---|---|---|---|---|
| **P0** | **Robust plain-text / ChatGPT paste** (`1. Q?` / `a) b) c) *d)` / markdown / blank lines / `Answer:` lines) | Most teachers already have questions in a doc or a chatbot. Fixes I1–I11 above. | Rewrite as tokeniser: classify each line (stem, choice, answer-key, noise), then assemble; add a 40-case fixture test file. | M |
| **P0** | **Kahoot XLSX export/template** | Switching cost is the #1 barrier vs Kahoot; their template is public and stable. Map Question, Answer 1–4, Time limit, Correct answer(s), image link. | Header detection + alias table (X4). Also accept Kahoot "Download report" sheet? (lower value). | S–M |
| **P1** | **Quizlet copy-paste (`term⇥definition`, one per line; also custom separators)** | Huge teacher install base; Quizlet export is exactly this. Convert each card to MC with 3 distractors drawn from other definitions in the set (deterministic, no AI needed), or to type-answer once supported. | Detect ≥3 lines with a tab (or user-chosen separator), "term→definition" vs "definition→term" toggle. | S |
| **P1** | **Blooket / Quizizz (Wayground) / Gimkit CSV** | Blooket CSV template (Question #, Question Text, Answer 1–4, Time Limit, Correct Answer(s) as numbers) and Quizizz XLSX template (Question Text, Question Type, Option 1–5, Correct Answer, Time in seconds, Image Link). | Header alias packs per source + "Detected: Quizizz format" chip. | S |
| **P1** | **PDF / DOCX / notes → AI** | "Turn my lesson notes / reading into a quiz" is the killer AI use case, much better than topic-only. | Client extracts text (pdf.js / mammoth) → server AI endpoint with `sourceText` (cap ~20k chars), prompt "only from source". | M |
| **P2** | **Google Forms (quiz mode)** | Many teachers have Forms quizzes with answer keys. | Google Forms API (`forms.get`) with OAuth `forms.body.readonly`; maps choiceQuestion + grading.correctAnswers. Needs OAuth consent → P2. Interim: accept "copy all from Forms preview" text. | M–L |
| **P2** | **URL / YouTube → AI** | Article or video lesson → quiz. | Server fetch + readability extraction; YouTube transcript API (captions availability varies; ToS considerations). | M |
| **P2** | **Image of worksheet → AI (OCR + structure)** | Phone photo of a paper worksheet → quiz; strong demo moment. | Gemini multimodal accepts images directly; same schema output; mandatory review screen. | M |
| P3 | Export (CSV/XLSX/Kahoot format, print/PDF answer key) | Users trust import more when they can also get data *out*. | Reverse of importer. | S |

All AI-based importers should land in the **same review screen** as text/XLSX (with edit-in-place), never directly into the quiz.

---

## 3. AI Generation (`server/src/services/aiGenerator.ts`, `server/src/index.ts:171-190`, `src/services/aiGenerate.ts`, `AIGenerateModal.tsx`)

### 3.1 Good
- Gemini key only on the server (`process.env.GEMINI_API_KEY`); `.env.example` only, no key literals found in repo (`grep AIza` clean).
- Request body validated with zod (`AIGenerateSchema`: topic ≤ 200, grade ≤ 50, count 1–10).
- Structured output (`responseMimeType: application/json` + `responseSchema`).
- Clear 503 when not configured.

### 3.2 Bugs / risks

| # | Sev | Location | Issue | Fix |
|---|---|---|---|---|
| A1 | **P0 (cost/abuse)** | `server/src/index.ts:171` | **No authentication, no rate limit, no quota.** CORS (`:114-119`) doesn't stop `curl`/scripts. Anyone can loop the endpoint and spend the Gemini budget; Pricing lists "AI question generation" as a **Pro** feature (`src/pages/Pricing.tsx:22`) but it is free and unlimited for the whole internet. ROADMAP §"AI Cost Model" steps 2–6 (credits counter, gating, cost logging) are not implemented. The socket rate limiter (`middleware/rateLimit.ts`) is not applied to HTTP. | Client sends `Authorization: Bearer <Firebase ID token>`; server verifies with `firebase-admin` (already a dependency for billing webhook), reads `users/{uid}.plan`, increments `aiUsage/{uid}_{yyyymm}` in a transaction, rejects over quota with 402/429 + friendly copy. Add `express-rate-limit` per IP+uid (e.g. 10/min). Log tokens (`result.response.usageMetadata`) per call. Global daily kill-switch env var. |
| A2 | P1 | `aiGenerator.ts:122-132` | Output validation is loose: choices array length not checked (0, 1, 5+ pass); empty/duplicate choices pass; `correctAnswerIndex` clamp yields **-1** when `choices` is empty (`:127-130`); TF questions not forced to `["True","False"]`; text not length-checked (≤500 server game limit) → quiz later fails at launch (B2); fewer/more questions than requested not detected. | Validate with a zod schema identical to the game schema; normalise TF; drop/repair invalid items; if < requested, one retry for the shortfall; return `{questions, dropped}`. |
| A3 | P1 | `aiGenerator.ts:58-62` | `responseSchema` lacks `minItems/maxItems` on `choices` and array; description says "3–4" while prompt says "exactly 4". | Add `minItems: 2, maxItems: 4` (Gemini schema supports them) and make wording consistent. |
| A4 | P2 | `aiGenerator.ts:89` | `temperature: 0.9` for factual assessment content raises hallucination/wrong-key rate. | 0.3–0.5; vary via seed/"avoid these questions" list instead. |
| A5 | P2 | `aiGenerator.ts:93-102` | Prompt: topic interpolated raw in quotes (prompt-injection is low-impact here but trivially changes output); no language, difficulty, question-type mix, reading level guidance, distractor quality rules ("plausible, same length, no 'all of the above'"), no explanation field, no de-dup against existing quiz questions, no "only use facts from source". | Structured prompt with system instruction; params: language, difficulty, types, include explanation; pass existing stems to avoid duplicates; delimit user text. |
| A6 | P2 | `aiGenerator.ts:106`, `aiGenerate.ts:30` | No timeout/abort on either side; Gemini safety block or 429 → `response.text()` throws → generic 500 "Please try again". | AbortController (30s), map safety-block → "Try rephrasing the topic", 429 → "AI is busy". |
| A7 | P2 | `AIGenerateModal.tsx:53` | Clicking the overlay closes the modal mid-generation; the request still completes and inserts questions unexpectedly. | Disable overlay close while loading, or abort. |
| A8 | P2 | `QuizBuilder.tsx:202-211` | AI questions go **straight into the quiz**, not a review screen; max 10 per call. | Route through the import review UI (select/regenerate individual questions), "Generate 10 more". |

---

## 4. Library & Marketplace

### 4.1 Library (`src/pages/Library.tsx`, `src/services/library.ts`, `src/data/libraryQuizzes.ts`, `scripts/seedLibrary.ts`)
- 10 templates, 129 questions, CA-standards metadata — good seed, far too small to be a reason to come. Filters: subject + grade band; **no text search**, no sort, no standards filter.
- Preview shows correct answers (fine for teachers).
- Fork (`forkQuizToUser`, `library.ts:117-159`) works and records `forkedFrom` (good) but:
  - **L1 (P1)** `library.ts:146-155` increments **`stats.timesPlayed`** to count *adoptions* — conflates forks with plays, and is a read-modify-write (`template.stats.timesPlayed + 1`) instead of `increment(1)` → lost updates. It is only permitted because rules allow *any* signed-in user to write arbitrary `stats` on templates (rules `:40-44`).
  - **L2 (P0)** "Seed Library Now" is shown to **any** signed-in user when the library is empty or errored (`Library.tsx:209-249`), backed by an in-browser `seedLibrary()` (`library.ts:174`) and a rule that lets any user create `createdBy:'SYSTEM', isTemplate:true` docs (`firestore.rules:31-33`). Any user can therefore publish arbitrary content into the official library for every visitor. Seeding belongs only in `scripts/seedLibrary.ts` (admin SDK, already exists).
  - Templates are `isPublic:false`, so they never appear in Marketplace; two disconnected discovery surfaces.
  - Fork → auto-navigates to dashboard after 1.8s instead of opening the copy in the builder ("Duplicate to edit").

### 4.2 Marketplace (`src/pages/Marketplace.tsx`, `src/services/quizzes.ts:181-253`)

| # | Sev | Location | Issue | Fix |
|---|---|---|---|---|
| M1 | **P0** | `quizzes.ts:192-197` + `createQuiz :81-93` | Query `where('isPublic','==',true).orderBy('rating','desc')`. Firestore `orderBy` **excludes documents missing the field**; `createQuiz` never writes `rating` → **no user-created public quiz can ever appear**. | Write `rating: 0, forkCount: 0` on create (and backfill); or order by `updatedAt`. |
| M2 | **P0** | `firestore.indexes.json` | No composite index for `isPublic + rating` or `isPublic + subject + rating`; query fails with `failed-precondition`, `useQuery` error isn't rendered (`Marketplace.tsx:48`), page shows "No public quizzes found. Be the first…". | Add indexes; render `isError`. |
| M3 | **P0** | `quizzes.ts:229-248` | `forkQuiz` passes `subject/gradeLevel/gradeBand/standards/caStandard` which are `undefined` for all builder-made quizzes (builder never sets them) → `addDoc` throws "Unsupported field value: undefined". (Library fork uses `?? null` and avoids this.) | `?? null` / strip undefined; `ignoreUndefinedProperties`. |
| M4 | **P0** | `quizzes.ts:250-251` + rules `:36-44` | After creating the copy, `updateDoc(orig, { forkCount: increment(1) })` is **denied** (non-owner; template rule only allows `stats`). Promise rejects; `handleFork` (`Marketplace.tsx:62-73`) has `try/finally` without `catch` → unhandled rejection, no success toast, user clicks again → duplicate copies. | Make count best-effort (try/catch) and move counters to a Cloud Function/server endpoint or a narrowly-scoped rule (`affectedKeys().hasOnly(['forkCount'])` and `== resource.data.forkCount + 1`). |
| M5 | **P0** | `quizzes.ts:220-224`, `Marketplace.tsx:54-60` | Upvote = `updateDoc(rating: increment(1))` on someone else's doc → **always denied**. UI optimistically shows +1, error unhandled. Even if allowed: no per-user dedupe (state is in-memory; reload = vote again), self-voting allowed. | `quizzes/{id}/votes/{uid}` doc (rules: create once, uid==auth.uid) + Cloud Function/aggregate count. |
| M6 | P1 | `quizzes.ts:185-215`, `Marketplace.tsx:47-52` | Search is client-side over the top 60 by rating; every keystroke changes the query key → new Firestore query per keystroke (cost), no debounce; grade band filtered client-side after the limit → few/no results. | Debounce 300ms; Algolia/Typesense or Firestore `searchKeywords` array; server-side grade filter with index. |
| M7 | P1 | Builder | Builder never sets `subject`, `gradeBand`, `gradeLevel`, quiz-level `standards`, so marketplace subject/grade filters and standards badges never match community quizzes. | Add these fields to Quiz Details; aggregate question standards into `quiz.standards` on save. |
| M8 | P2 | `Marketplace.tsx` | No author display name, no "updated" date, preview shows 5 stems only, no report/flag for inappropriate content, no moderation queue (public UGC aimed at K‑12 — COPPA/safety concern). | Author profile snippet, report button → `reports` collection, admin review. |

### 4.3 Sharing / collaboration / organisation — all **missing**
- **Share via link:** no `/q/:id` page. Rules only allow `get` for owner or SYSTEM templates (`firestore.rules:18-22`) — even `isPublic` quizzes cannot be fetched by ID by others. Needed: public quiz page with "Copy to my quizzes" + "Host now".
- **Collaboration:** single `createdBy`; no co-editors, no org/team-shared quizzes (OrgSettings exists — orgs would expect shared libraries).
- **Folders / tags / search in own dashboard:** none; no duplicate-my-own-quiz action on Dashboard.
- **Versioning/history:** none; a bad save overwrites.

---

## 5. Data model & Firestore rules

### 5.1 Firestore rules (`firestore.rules`) — security findings

| # | Sev | Line | Finding | Fix |
|---|---|---|---|---|
| R1 | **P0 / Critical** | `:14` | `allow list: if true;` — the comment assumes queries are scoped "server-side" but rules are the only enforcement. Any unauthenticated client can run `getDocs(collection(db,'quizzes'))` and download **every user's private quiz with answer keys** (also lets students look up answers to assignments/live games). | `allow list: if (resource.data.isTemplate == true && resource.data.createdBy == 'SYSTEM') || resource.data.isPublic == true || (request.auth != null && resource.data.createdBy == request.auth.uid);` — list rules *can* reference `resource.data`; Firestore then requires every query to carry matching constraints. Consider stripping answer keys from publicly listable docs (store answers in a sub-doc readable only by owner/server) — at minimum for live games, answers should never need to be on the student client. |
| R2 | **P0** | `:31-33` | Any signed-in user can create SYSTEM templates → library vandalism / injection of inappropriate content shown to all visitors. | Delete the rule; seed via admin SDK only. |
| R3 | **P0** | `:36-37` | Owner update has no field constraints: owner can change `createdBy` (to `'SYSTEM'`) and `isTemplate:true` → instantly promote own doc into the official library; can set own `rating: 99999`, `forkCount`, `stats`. | Require `request.resource.data.createdBy == resource.data.createdBy`, `isTemplate == resource.data.isTemplate`, and `!request.resource.data.diff(resource.data).affectedKeys().hasAny(['rating','forkCount','createdBy','isTemplate'])`. |
| R4 | P1 | `:40-44` | Any signed-in user may overwrite a template's `stats` with any value (not just increment). | Constrain to `stats.timesPlayed == resource.data.stats.timesPlayed + 1`, or server-only. |
| R5 | P1 | `:18-22` | `isPublic` quizzes are not gettable by non-owners → blocks share links and preview-by-ID. | Add `allow get: if resource.data.isPublic == true;`. |
| R6 | P2 | — | No shape/size validation: `questions` can be any type/size up to 1 MiB, `title` any length, arbitrary extra fields. | `request.resource.data.keys().hasOnly([...])`, `title is string && title.size() <= 200`, `questions is list && questions.size() <= 100`. |
| R7 | P2 | `quizzes.ts:165` | `incrementQuizStats` does a pointless `updateQuiz(quizId, {} as any)` write, then a read-modify-write (race when two games end together). | Remove dummy write; use `increment()` for counters; compute average from sums. |

### 5.2 Schema versioning & extensibility
Current `QuizQuestion` (`src/types/quiz.ts:8-18`) is MC-shaped: `choices: string[]`, `correctAnswerIndex: number`. Problems:
- **No `schemaVersion`** on quiz docs; docs from library seed, builder, fork, import differ (`forkedFrom` only on library forks; `rating` only on some; `subject: null` vs absent). `docToQuiz` papers over with defaults; `settings: data.settings ?? {}` (`quizzes.ts:45`) returns an object missing required fields.
- `correctAnswerIndex` cannot express multi-select, type-answer (accepted strings), ordering, slider/numeric range, or poll (no correct answer).
- Per-choice media impossible (`string[]`).
- Declared-but-dead fields: `timeLimit` (vs server/ROADMAP `durationSec`), `points`, `imageUrl`, `settings.shuffle*`, `maxPlayers`, `showLeaderboardAfterEach`.
- No explanation/feedback field, no tags, no folder, no `status` (draft/published), no `ownerName` for marketplace, no `language`.
- Wire format is mapped by hand in `Dashboard.tsx:113-119` (drops `questionType`, `points`, `imageUrl`) and the server `QuestionSchema` is a separate definition — three drifting schemas.

**Proposed v2 (do before adding types):**
```ts
interface QuizDocV2 {
  schemaVersion: 2;
  status: 'draft' | 'published';
  ownerId: string; ownerName?: string; editorIds?: string[]; orgId?: string;
  title: string; description: string; language?: string;
  subject?: SubjectArea; gradeBand?: GradeBand; tags: string[]; folderId?: string | null;
  coverImage?: MediaRef; visibility: 'private' | 'link' | 'public';
  isTemplate: boolean; forkedFrom?: string | null;
  settings: QuizSettings; // all honoured end-to-end
  questions: QuestionV2[];
  counters: { plays: number; forks: number; votes: number }; // server-written only
  createdAt; updatedAt;
}
type QuestionBase = { id: string; type: QType; text: string; media?: MediaRef;
  durationSec?: number; points?: 0 | 1 | 2; explanation?: string; standards?: string[] };
type QuestionV2 =
  | QuestionBase & { type: 'mc' | 'tf'; choices: Choice[]; correct: number[] /* len 1 */ }
  | QuestionBase & { type: 'multi'; choices: Choice[]; correct: number[] /* len ≥ 1 */ }
  | QuestionBase & { type: 'type-answer'; accepted: string[]; caseSensitive?: boolean }
  | QuestionBase & { type: 'order'; items: Choice[] /* correct order = array order */ }
  | QuestionBase & { type: 'poll'; choices: Choice[] }
  | QuestionBase & { type: 'slider'; min: number; max: number; answer: number; tolerance: number };
type Choice = { id: string; text: string; media?: MediaRef };
```
One zod schema in `shared/` used by builder validation, importer output, AI output, Firestore converter (`withConverter` + `migrateV1toV2` on read), and the server `host:create` validator.

---

## 6. Prioritised feature list

Size: **S** ≤ 1 day, **M** 2–5 days, **L** 1–3 weeks. P0 = must ship before promoting the product; P1 = needed to be the "for all your quizzes" app; P2 = differentiators/polish.

### P0 — stop the bleeding
| Feature / fix | Size |
|---|---|
| Rewrite `quizzes` rules (R1–R5): scoped list/get, no client SYSTEM create, immutable owner/template/counter fields | S |
| Remove in-app "Seed Library Now" + `seedLibrary()` client path (L2) | S |
| AI endpoint auth (ID token), per-user monthly quota keyed to plan, HTTP rate limit, usage logging, kill-switch (A1) | M |
| Marketplace: write `rating/forkCount` on create + backfill, add indexes, show query errors, fix fork `undefined` + counter, replace upvote with votes subcollection (M1–M5) | M |
| Builder: localStorage draft autosave + restore banner + `beforeunload`/router blocker (1.3) | S |
| Builder: fix `standards: undefined` crash (B1), enable `ignoreUndefinedProperties` | S |
| Shared zod schema; builder validation mirrors server limits; drop empty choices on save (B2) | S–M |
| Fix type-toggle answer reset (B3) and import-after-placeholder (B4) | S |

### P1 — authoring parity and switching
| Feature | Size |
|---|---|
| Per-question time limit used at launch (B6); per-question points (0/1×/2×) wired to scoring | M |
| Images on questions (Firebase Storage upload, paste-from-clipboard, Storage rules, size/type limits); later image choices | M |
| Question list sidebar with text preview + error dots; drag-to-reorder; duplicate; delete with undo | M |
| Keyboard flow: Enter→next field, Cmd/Ctrl+Enter→new question, Alt+1–6 mark correct, Cmd+S save, Cmd+D duplicate | S |
| Multiline question text; up to 6 choices (match server) | S |
| Server-backed draft autosave (doc created on first edit, debounced writes, "Saved" indicator, Save no longer exits) | M |
| Honour or remove `shuffleQuestions`/`shuffleChoices`/`maxPlayers`/`showLeaderboardAfterEach` (B7) | S–M |
| Robust text importer rewrite + fixture tests (I1–I14) | M |
| Kahoot XLSX importer (X4) + Quizizz/Blooket/Gimkit alias packs | S–M |
| Quizlet `term⇥def` importer with auto-distractors | S |
| Import review: edit inline, set correct by clicking, unresolved items unchecked by default, per-row skip reasons (2.4, X11) | M |
| XLSX column-alignment and numeric-correct fixes (X1–X3), CSV UTF‑8/raw (X5–X6) | S |
| AI: strict output validation (A2–A3), lower temperature, better prompt w/ explanation + difficulty + language (A4–A5), errors/timeouts (A6), route through review UI (A8) | M |
| AI from source: PDF/DOCX/pasted notes → questions grounded in text | M |
| Quiz-level subject/grade/standards/tags in builder; aggregate standards (M7) | S |
| Share link page `/q/:id` (preview, Copy to my quizzes, Host now) + rules R5 | M |
| Duplicate my own quiz from Dashboard; Library/Marketplace fork opens the copy in builder | S |
| Schema v2 + `schemaVersion` + read-time migration (5.2) | M |
| Explanations per question (shown on reveal and in assignments review) | S |

### P2 — differentiators
| Feature | Size |
|---|---|
| New question types: multi-select, type-answer, poll, ordering, slider (after schema v2; each needs player UI + scoring) | L |
| Preview-as-player (render the real Game question component in a phone frame inside the builder, with timer) | M |
| Bulk edit (select N questions → set time/points/type; find & replace) | M |
| Folders + tags + search in Dashboard | M |
| Marketplace search (Typesense/Algolia or keyword index), sort (popular/new/most forked), author pages, report/moderation queue | L |
| Unify Library + Marketplace into one "Discover" with "Official" badge; grow library via AI-assisted, human-reviewed packs | M |
| Collaboration: co-editors, org-shared library (ties to OrgSettings) | L |
| Version history / restore previous save | M |
| Image-of-worksheet → AI, URL/YouTube → AI | M each |
| Google Forms import (OAuth) | M–L |
| Export: CSV/XLSX/Kahoot format, printable worksheet + answer key PDF | S–M |
| AI per-question actions: "make harder/easier", "improve distractors", "translate quiz", "generate image" | M |

---

## 7. Suggested test fixtures (for the importer rewrite)
Create `src/services/__tests__/quizImport.fixtures.ts` with at least: ChatGPT numbered + blank line; Claude/Gemini markdown bold; one-line `A) B) C) D)`; numbered choices `1) 2) 3)`; leading `*` marker; `✔`/`✅`/`[x]`; `Answer: B) Paris`; `**Answer:** B`; TF `True / False Answer: True`; fractions `1/2 / 1/3`; stem starting with number; multi-line stem; 6 options; two correct markers; BOM-prefixed paste; Quizlet tabbed; Kahoot template xlsx; Quizizz template xlsx; Blooket CSV; CSV with blank Answer A and letter correct; numeric correct; accented UTF‑8 CSV without BOM; `1/2` cell in CSV.
