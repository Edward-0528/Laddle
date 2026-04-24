// ---------------------------------------------------------------------------
// Quiz Import Service
// Pure parsing engine for the Import Questions feature.
// Handles two input surfaces:
//   1. Pasted text  — AI-generated or hand-typed question blocks
//   2. Excel / CSV  — structured spreadsheet uploads via SheetJS
//
// Returns ParsedQuestion[] which the ImportModal shows for user review
// before they are merged into the QuizBuilder state.
//
// Design principle: zero side effects. Every function is pure and testable
// in isolation. No Firestore, no socket, no React state.
// ---------------------------------------------------------------------------

import * as XLSX from 'xlsx';
import type { QuizQuestion, QuestionType } from '../types/quiz';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParsedQuestion {
  /** Unique key used only within the import preview UI */
  _importId: string;
  text: string;
  choices: string[];
  correctAnswerIndex: number;
  questionType: QuestionType;
  /** Human-readable note about how confident the parser is */
  _confidence: 'high' | 'low';
  /** Any parser warnings the user should see */
  _warnings: string[];
}

export interface ImportResult {
  questions: ParsedQuestion[];
  /** Lines/rows the parser could not interpret */
  skipped: number;
}

// ---------------------------------------------------------------------------
// Text Parser
// ---------------------------------------------------------------------------

/**
 * Parses free-form text into draft questions.
 *
 * Supported formats (auto-detected, can mix within a single paste):
 *
 * Format A — numbered + lettered choices:
 *   1. What is 2+2?
 *   A) 3   B) 4*   C) 5   D) 6
 *
 * Format B — "Question:" label:
 *   Question: Is Mars a planet?
 *   - Yes (correct)
 *   - No
 *
 * Format C — inline markers on same line as choice:
 *   What colour is the sky?
 *   Red / Blue* / Green / Yellow
 *
 * Format D — True/False:
 *   The sun is a star.
 *   True / False   Answer: True
 *
 * Correct-answer markers recognised: *, (correct), (right), CHECK, ANSWER:x, trailing *
 */
export function parseText(raw: string): ImportResult {
  const blocks = splitIntoBlocks(raw.trim());
  const questions: ParsedQuestion[] = [];
  let skipped = 0;

  for (const block of blocks) {
    const result = parseBlock(block);
    if (result) {
      questions.push(result);
    } else {
      skipped++;
    }
  }

  return { questions, skipped };
}

// ---------------------------------------------------------------------------
// Excel / CSV Parser
// ---------------------------------------------------------------------------

/**
 * Parses an uploaded .xlsx, .xls, or .csv file into draft questions.
 *
 * Expected column headers (case-insensitive, flexible naming):
 *   question | q                                   — question text (required)
 *   a | answer a | choice 1 | option 1             — first choice
 *   b | answer b | choice 2 | option 2             — second choice
 *   c | answer c | choice 3 | option 3             — third choice (optional)
 *   d | answer d | choice 4 | option 4             — fourth choice (optional)
 *   correct | answer | correct answer              — letter (A/B/C/D) or full text
 *   type | question type                           — "tf" / "truefalse" → True/False
 */
export async function parseFile(file: File): Promise<ImportResult> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: '',
    raw: false,
  });

  const questions: ParsedQuestion[] = [];
  let skipped = 0;

  for (const row of rows) {
    const q = parseRow(row);
    if (q) {
      questions.push(q);
    } else {
      skipped++;
    }
  }

  return { questions, skipped };
}

// ---------------------------------------------------------------------------
// Convert ParsedQuestion → QuizQuestion (for merging into builder state)
// ---------------------------------------------------------------------------

export function toQuizQuestion(p: ParsedQuestion): QuizQuestion {
  return {
    id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
    text: p.text,
    choices: p.choices,
    correctAnswerIndex: p.correctAnswerIndex,
    questionType: p.questionType,
    timeLimit: 30,
  };
}

// ---------------------------------------------------------------------------
// Internal — Block splitter
// ---------------------------------------------------------------------------

/**
 * Splits raw pasted text into individual question "blocks".
 * A block is separated by one or more blank lines, OR by a leading
 * number pattern like "1." / "Q1." at the start of a new line.
 */
function splitIntoBlocks(text: string): string[] {
  // Normalise Windows line endings
  const normalised = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Split on double+ newlines first (most reliable separator)
  const chunks = normalised.split(/\n{2,}/);

  const blocks: string[] = [];

  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;

    // Check if this chunk contains multiple numbered questions (1. ... 2. ...)
    const subBlocks = splitByLeadingNumber(trimmed);
    blocks.push(...subBlocks);
  }

  return blocks.filter((b) => b.trim().length > 0);
}

function splitByLeadingNumber(text: string): string[] {
  // Match "1." or "Q1." or "Question 1:" at start of line
  const parts = text.split(/(?=^(?:Q(?:uestion\s*)?\d+[.):]|\d+[.):])\s)/im);
  return parts.filter((p) => p.trim().length > 0);
}

// ---------------------------------------------------------------------------
// Internal — Single block parser
// ---------------------------------------------------------------------------

function parseBlock(block: string): ParsedQuestion | null {
  const lines = block
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return null;

  // ---- Extract question text ----
  let questionText = '';
  let choiceStartIndex = 0;

  // Strip leading number like "1." "Q2." "Question 3:"
  const questionLine = lines[0].replace(/^(?:Q(?:uestion\s*)?\d+[.):\s]+|\d+[.):\s]+)/i, '').trim();
  // Strip "Question:" label
  questionText = questionLine.replace(/^Question\s*:\s*/i, '').trim();
  choiceStartIndex = 1;

  if (!questionText) return null;

  // ---- Extract choices ----
  // Look for choice lines starting with A) B) C) D) or - or * or 1. 2.
  const choiceLines = lines.slice(choiceStartIndex);

  // Check for slash-separated inline choices: "Red / Blue* / Green"
  if (choiceLines.length === 1 && choiceLines[0].includes('/')) {
    return parseInlineChoices(questionText, choiceLines[0]);
  }

  const choices: string[] = [];
  const correctMarkers: number[] = [];
  let trailingAnswer: string | null = null;

  for (const line of choiceLines) {
    // "Answer: B" or "Correct: True" — standalone answer key line
    const answerKeyMatch = line.match(/^(?:answer|correct(?:\s+answer)?)\s*[:\-]\s*(.+)$/i);
    if (answerKeyMatch) {
      trailingAnswer = answerKeyMatch[1].trim();
      continue;
    }

    // A) text  or  A. text  or  A: text  or  A text (with letter A-H)
    const letterMatch = line.match(/^([A-H])[.):\s]\s*(.+)$/i);
    if (letterMatch) {
      let text = letterMatch[2].trim();
      const isCorrect = hasCorrectMarker(text);
      if (isCorrect) {
        text = stripCorrectMarker(text);
        correctMarkers.push(choices.length);
      }
      choices.push(text);
      continue;
    }

    // - text  or  * text  or  • text
    const bulletMatch = line.match(/^[-*•]\s+(.+)$/);
    if (bulletMatch) {
      let text = bulletMatch[1].trim();
      const isCorrect = hasCorrectMarker(text);
      if (isCorrect) {
        text = stripCorrectMarker(text);
        correctMarkers.push(choices.length);
      }
      choices.push(text);
      continue;
    }

    // Numbered choice: 1. 2. 3.
    const numberedMatch = line.match(/^\d+[.)]\s*(.+)$/);
    if (numberedMatch) {
      let text = numberedMatch[1].trim();
      const isCorrect = hasCorrectMarker(text);
      if (isCorrect) {
        text = stripCorrectMarker(text);
        correctMarkers.push(choices.length);
      }
      choices.push(text);
      continue;
    }
  }

  if (choices.length < 2) return null;

  // Determine correct index
  let correctAnswerIndex = 0;
  const warnings: string[] = [];

  if (correctMarkers.length === 1) {
    correctAnswerIndex = correctMarkers[0];
  } else if (trailingAnswer) {
    const resolved = resolveTrailingAnswer(trailingAnswer, choices);
    if (resolved !== null) {
      correctAnswerIndex = resolved;
    } else {
      warnings.push(`Could not resolve correct answer "${trailingAnswer}" — defaulting to first choice.`);
    }
  } else {
    warnings.push('No correct answer marked — defaulting to first choice. Please review.');
  }

  // Detect True/False
  const questionType = detectTrueFalse(choices) ? 'true-false' : 'multiple-choice';

  return {
    _importId: crypto.randomUUID(),
    text: questionText,
    choices,
    correctAnswerIndex,
    questionType,
    _confidence: warnings.length === 0 ? 'high' : 'low',
    _warnings: warnings,
  };
}

// ---------------------------------------------------------------------------
// Internal — Inline choice parser ("Red / Blue* / Green")
// ---------------------------------------------------------------------------

function parseInlineChoices(questionText: string, choiceLine: string): ParsedQuestion | null {
  const parts = choiceLine.split('/').map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;

  const choices: string[] = [];
  let correctAnswerIndex = 0;
  let found = false;

  for (let i = 0; i < parts.length; i++) {
    const isCorrect = hasCorrectMarker(parts[i]);
    const text = isCorrect ? stripCorrectMarker(parts[i]) : parts[i];
    choices.push(text);
    if (isCorrect && !found) {
      correctAnswerIndex = i;
      found = true;
    }
  }

  const warnings = found ? [] : ['No correct answer marked — defaulting to first choice.'];
  const questionType = detectTrueFalse(choices) ? 'true-false' : 'multiple-choice';

  return {
    _importId: crypto.randomUUID(),
    text: questionText,
    choices,
    correctAnswerIndex,
    questionType,
    _confidence: found ? 'high' : 'low',
    _warnings: warnings,
  };
}

// ---------------------------------------------------------------------------
// Internal — Correct-answer marker helpers
// ---------------------------------------------------------------------------

const CORRECT_PATTERNS = [
  /\*$/,                       // trailing asterisk
  /\(correct\)/i,              // (correct)
  /\(right\)/i,                // (right)
  /\bcorrect\b$/i,             // trailing "correct"
  /✓/,                         // checkmark
  /\(answer\)/i,               // (answer)
];

function hasCorrectMarker(text: string): boolean {
  return CORRECT_PATTERNS.some((p) => p.test(text));
}

function stripCorrectMarker(text: string): string {
  return text
    .replace(/\*$/, '')
    .replace(/\(correct\)/i, '')
    .replace(/\(right\)/i, '')
    .replace(/\bcorrect\b$/i, '')
    .replace(/✓/g, '')
    .replace(/\(answer\)/i, '')
    .trim();
}

/**
 * Given a trailing answer like "B", "b", "Paris", or "True",
 * resolves to the index in the choices array.
 */
function resolveTrailingAnswer(answer: string, choices: string[]): number | null {
  const a = answer.trim();

  // Letter reference: A / B / C / D
  const letterIndex = 'ABCDEFGH'.indexOf(a.toUpperCase());
  if (letterIndex >= 0 && letterIndex < choices.length) return letterIndex;

  // Full-text match (case-insensitive)
  const textIndex = choices.findIndex(
    (c) => c.toLowerCase() === a.toLowerCase()
  );
  if (textIndex >= 0) return textIndex;

  return null;
}

// ---------------------------------------------------------------------------
// Internal — True/False detector
// ---------------------------------------------------------------------------

function detectTrueFalse(choices: string[]): boolean {
  if (choices.length !== 2) return false;
  const lower = choices.map((c) => c.toLowerCase());
  return (
    (lower[0] === 'true' && lower[1] === 'false') ||
    (lower[0] === 'false' && lower[1] === 'true')
  );
}

// ---------------------------------------------------------------------------
// Internal — Row parser (Excel)
// ---------------------------------------------------------------------------

function normaliseKey(key: string): string {
  return key.toLowerCase().replace(/[\s_-]/g, '');
}

function parseRow(row: Record<string, unknown>): ParsedQuestion | null {
  const norm: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    norm[normaliseKey(k)] = String(v ?? '').trim();
  }

  // Find question text
  const questionText =
    norm['question'] ?? norm['q'] ?? norm['questiontext'] ?? norm['text'] ?? '';
  if (!questionText) return null;

  // Find choices
  const slotKeys: Record<number, string[]> = {
    0: ['a', 'answera', 'choice1', 'option1', 'answer1'],
    1: ['b', 'answerb', 'choice2', 'option2', 'answer2'],
    2: ['c', 'answerc', 'choice3', 'option3', 'answer3'],
    3: ['d', 'answerd', 'choice4', 'option4', 'answer4'],
  };

  const choices: string[] = [];
  for (let i = 0; i <= 3; i++) {
    for (const key of slotKeys[i]) {
      const val = norm[key];
      if (val) {
        choices.push(val);
        break;
      }
    }
  }

  if (choices.length < 2) return null;

  // Find correct answer
  const correctRaw =
    norm['correct'] ??
    norm['correctanswer'] ??
    norm['answer'] ??
    norm['rightanswer'] ??
    '';

  let correctAnswerIndex = 0;
  const warnings: string[] = [];

  if (correctRaw) {
    const resolved = resolveTrailingAnswer(correctRaw, choices);
    if (resolved !== null) {
      correctAnswerIndex = resolved;
    } else {
      warnings.push(`Could not resolve correct answer "${correctRaw}" — defaulting to first choice.`);
    }
  } else {
    warnings.push('No correct answer column found — defaulting to first choice.');
  }

  // Detect type override
  const typeRaw = norm['type'] ?? norm['questiontype'] ?? '';
  const isTF =
    /^(tf|t\/f|truefalse|true.false)$/i.test(typeRaw) || detectTrueFalse(choices);
  const questionType: QuestionType = isTF ? 'true-false' : 'multiple-choice';

  return {
    _importId: crypto.randomUUID(),
    text: questionText,
    choices,
    correctAnswerIndex,
    questionType,
    _confidence: warnings.length === 0 ? 'high' : 'low',
    _warnings: warnings,
  };
}
