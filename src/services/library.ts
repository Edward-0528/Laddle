// ---------------------------------------------------------------------------
// Trivia library service: host a bundled pack straight away, or copy it into
// the signed-in host's own quizzes so they can edit it.
// ---------------------------------------------------------------------------

import { createQuiz } from './quizzes';
import { hostGame } from './hostGame';
import { categoryOf, type TriviaPack } from '../data/trivia';
import { DEFAULT_QUIZ_SETTINGS } from '../types/quiz';

export function hostPack(pack: TriviaPack): Promise<string> {
  const sec = pack.timeLimit ?? 20;
  return hostGame(
    pack.title,
    pack.questions.map((q, i) => ({ id: `q${i + 1}`, text: q.text, choices: q.choices, answerIndex: q.answer, durationSec: sec })),
  );
}

export function copyPackToUser(pack: TriviaPack, userId: string): Promise<string> {
  const sec = pack.timeLimit ?? 20;
  return createQuiz(
    userId,
    pack.title,
    pack.blurb,
    categoryOf(pack.category).label,
    pack.questions.map((q, i) => ({
      id: `q${i + 1}`,
      text: q.text,
      choices: q.choices,
      correctAnswerIndex: q.answer,
      timeLimit: sec,
    })),
    { ...DEFAULT_QUIZ_SETTINGS, questionDuration: sec, maxPlayers: 50 },
  );
}
