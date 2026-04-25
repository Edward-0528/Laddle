// ---------------------------------------------------------------------------
// AI Question Generation — client service
// Calls the server's /api/ai/generate endpoint.
// The Gemini API key never touches the browser; all Gemini calls happen
// server-side.
// ---------------------------------------------------------------------------

import type { QuizQuestion } from '../types/quiz';

export interface AIGenerateOptions {
  topic: string;
  gradeLevel: string;
  count: number;
}

interface ServerQuestion {
  text: string;
  choices: string[];
  correctAnswerIndex: number;
  questionType: 'multiple-choice' | 'true-false';
}

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001';

/**
 * Asks the server to generate `count` questions on `topic` for `gradeLevel`.
 * Returns them as QuizQuestion objects (with a fresh client-side id).
 */
export async function generateQuestionsAI(opts: AIGenerateOptions): Promise<QuizQuestion[]> {
  const res = await fetch(`${SERVER_URL}/api/ai/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error ?? `Server error ${res.status}`);
  }

  const data = await res.json() as { questions: ServerQuestion[] };

  return data.questions.map((q) => ({
    id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
    text: q.text,
    choices: q.choices,
    correctAnswerIndex: q.correctAnswerIndex,
    timeLimit: 30,
    questionType: q.questionType,
  }));
}
