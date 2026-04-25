// ---------------------------------------------------------------------------
// Game Result Types
// Stored in Firestore under the 'gameResults' collection after every game.
// Used by the Results page and the Dashboard "Recent Games" section.
// ---------------------------------------------------------------------------

export interface PlayerResult {
  name: string;
  score: number;
  rank: number;
}

export interface GameResult {
  id: string;
  hostUid: string;
  quizTitle: string;
  gameCode: string;
  playedAt: number;
  playerCount: number;
  players: PlayerResult[];
}

/** Omit 'id' when writing — Firestore generates it */
export type NewGameResult = Omit<GameResult, 'id'>;
