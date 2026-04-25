// ---------------------------------------------------------------------------
// Game Type Definitions
// Types used for the real-time game session including player state,
// question delivery, and leaderboard data.
// ---------------------------------------------------------------------------

export interface GamePlayer {
  id: string;
  name: string;
  score: number;
  teamName?: string;
}

export interface GameQuestion {
  id: string;
  text: string;
  choices: string[];
  durationSec: number;
}

export interface GameQuestionData {
  index: number;
  total: number;
  endsAt: number;
  q: GameQuestion;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
}

export type GameState = 'lobby' | 'question' | 'results' | 'ended';

export type PlayerRole = 'host' | 'player';
