// ---------------------------------------------------------------------------
// Host a game: send questions to the server, keep the host token, and hand
// back the game code. Used by the dashboard (your quizzes) and the trivia
// library (bundled packs, no account needed).
// ---------------------------------------------------------------------------

import { socket } from './socket';
import { saveHostToken } from './session';

export interface HostQuestion {
  id?: string;
  text: string;
  choices: string[];
  answerIndex: number;
  durationSec: number;
}

const clampSec = (n: number) => Math.min(120, Math.max(5, Math.round(n || 20)));

/** Resolves with the game code, or rejects with a message to show the host. */
export function hostGame(title: string, questions: HostQuestion[]): Promise<string> {
  const payload = {
    quizTitle: title.slice(0, 200),
    questions: questions.slice(0, 50).map((q, i) => ({
      id: q.id || `q${i + 1}`,
      text: q.text,
      choices: q.choices,
      answerIndex: q.answerIndex,
      durationSec: clampSec(q.durationSec),
    })),
  };

  return new Promise((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      socket.off('connect', emit);
      reject(new Error('Could not reach the game server. Check your connection and try again.'));
    }, 30000);

    function emit() {
      socket.emit('host:create', payload, (res: { code?: string; hostToken?: string; error?: string }) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (res?.error || !res?.code) {
          reject(new Error(res?.error ?? 'Could not start the game. Please try again.'));
          return;
        }
        if (res.hostToken) saveHostToken(res.code, res.hostToken);
        resolve(res.code);
      });
    }

    if (socket.connected) emit();
    else {
      // Free-tier server may be waking up: emit as soon as it connects
      socket.once('connect', emit);
      socket.connect();
    }
  });
}
