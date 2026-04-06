// ---------------------------------------------------------------------------
// Game Manager
// Encapsulates all game state and business logic. The in-memory store is
// managed here with proper limits, cleanup, and structured access patterns.
//
// For production scaling this module can be swapped to use Redis or a
// database without changing the socket handler interface.
// ---------------------------------------------------------------------------

import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

export interface Player {
  id: string;
  name: string;
  score: number;
  streak: number;
  previousRank: number;
}

export interface Question {
  id: string;
  text: string;
  choices: string[];
  answerIndex: number;
  durationSec: number;
}

export interface PlayerAnswer {
  questionId: string;
  choiceIndex: number;
  answeredAt: number;
}

export interface Game {
  code: string;
  hostSocketId: string;
  players: Record<string, Player>;
  questions: Question[];
  state: 'lobby' | 'question' | 'reveal' | 'results' | 'ended';
  currentQuestionIndex: number;
  questionEndsAt?: number;
  answers: Record<string, PlayerAnswer>;
  createdAt: number;
}

export interface QuestionResult {
  correctIndex: number;
  answerCounts: number[];
  leaderboard: RankedPlayer[];
}

export interface RankedPlayer {
  rank: number;
  name: string;
  score: number;
  pointsEarned: number;
  streak: number;
  rankDelta: number;
}

// ---------------------------------------------------------------------------
// Configuration Constants
// ---------------------------------------------------------------------------

/** Maximum number of concurrent games allowed on the server. */
const MAX_ACTIVE_GAMES = 100;

/** Maximum number of players allowed in a single game. */
const MAX_PLAYERS_PER_GAME = 50;

/** Duration in milliseconds after which an idle lobby game is cleaned up. */
const IDLE_GAME_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

/** Characters used for game code generation. Excludes visually similar characters. */
const CODE_CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Length of generated game codes. */
const CODE_LENGTH = 6;

// ---------------------------------------------------------------------------
// In-Memory Store
// ---------------------------------------------------------------------------

const games: Record<string, Game> = {};

// ---------------------------------------------------------------------------
// Game Code Generation
// ---------------------------------------------------------------------------

/**
 * Generates a random game code using an unambiguous character set.
 * Retries if the generated code already exists (extremely unlikely).
 */
function generateGameCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARACTERS[Math.floor(Math.random() * CODE_CHARACTERS.length)];
  }
  // Avoid collisions with existing games
  if (games[code]) {
    return generateGameCode();
  }
  return code;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the current count of active games.
 */
export function getActiveGameCount(): number {
  return Object.keys(games).length;
}

/**
 * Creates a new game and returns the generated code, or null if the server
 * has reached its maximum game capacity.
 */
export function createGame(hostSocketId: string, questions: Question[]): string | null {
  if (Object.keys(games).length >= MAX_ACTIVE_GAMES) {
    logger.warn('Game creation rejected - server at capacity', {
      activeGames: Object.keys(games).length,
      limit: MAX_ACTIVE_GAMES,
    });
    return null;
  }

  const code = generateGameCode();
  games[code] = {
    code,
    hostSocketId,
    players: {},
    questions,
    state: 'lobby',
    currentQuestionIndex: -1,
    answers: {},
    createdAt: Date.now(),
  };

  logger.info('Game created', { code, hostSocketId, questionCount: questions.length });
  return code;
}

/**
 * Retrieves a game by its code, or undefined if not found.
 */
export function getGame(code: string): Game | undefined {
  return games[code];
}

/**
 * Adds a player to a game. Returns an object indicating success or the
 * reason for failure.
 */
export function addPlayer(
  code: string,
  socketId: string,
  name: string
): { ok: boolean; reason?: string } {
  const game = games[code];
  if (!game) {
    return { ok: false, reason: 'Game not found. Please check the code and try again.' };
  }
  if (game.state !== 'lobby') {
    return { ok: false, reason: 'This game has already started.' };
  }
  if (Object.keys(game.players).length >= MAX_PLAYERS_PER_GAME) {
    return { ok: false, reason: 'This game is full. Maximum players reached.' };
  }

  game.players[socketId] = { id: socketId, name, score: 0, streak: 0, previousRank: 0 };
  logger.info('Player joined game', { code, playerName: name, socketId });
  return { ok: true };
}

/**
 * Returns the list of players for a given game.
 */
export function getPlayerList(code: string): Player[] {
  const game = games[code];
  return game ? Object.values(game.players) : [];
}

/**
 * Verifies that the given socket is the host of the specified game.
 */
export function isGameHost(code: string, socketId: string): boolean {
  const game = games[code];
  return game !== undefined && game.hostSocketId === socketId;
}

/**
 * Advances the game to the next question. Returns the question data to
 * broadcast, or null if the quiz is finished.
 */
export function advanceToNextQuestion(code: string): {
  finished: boolean;
  questionData?: {
    index: number;
    total: number;
    endsAt: number;
    question: {
      id: string;
      text: string;
      choices: string[];
      durationSec: number;
    };
  };
  leaderboard?: { rank: number; name: string; score: number }[];
} {
  const game = games[code];
  if (!game) return { finished: true };

  game.currentQuestionIndex += 1;
  game.answers = {};

  if (game.currentQuestionIndex >= game.questions.length) {
    game.state = 'results';
    const leaderboard = Object.values(game.players)
      .sort((a, b) => b.score - a.score)
      .map((player, index) => ({
        rank: index + 1,
        name: player.name,
        score: player.score,
      }));

    logger.info('Game finished', { code, playerCount: Object.keys(game.players).length });
    return { finished: true, leaderboard };
  }

  const question = game.questions[game.currentQuestionIndex];
  game.state = 'question';
  game.questionEndsAt = Date.now() + question.durationSec * 1000;

  logger.info('Question started', {
    code,
    questionIndex: game.currentQuestionIndex + 1,
    totalQuestions: game.questions.length,
  });

  return {
    finished: false,
    questionData: {
      index: game.currentQuestionIndex,
      total: game.questions.length,
      endsAt: game.questionEndsAt,
      question: {
        id: question.id,
        text: question.text,
        choices: question.choices,
        durationSec: question.durationSec,
      },
    },
  };
}

/**
 * Records a player answer for the current question. Returns false if the
 * answer was rejected (already answered, time expired, or invalid).
 */
export function recordAnswer(
  code: string,
  socketId: string,
  choiceIndex: number
): boolean {
  const game = games[code];
  if (!game || game.state !== 'question') return false;
  if (!(socketId in game.players)) return false;
  if (game.answers[socketId]) return false; // Already answered

  const now = Date.now();
  if (now > (game.questionEndsAt || 0)) return false;

  const currentQuestion = game.questions[game.currentQuestionIndex];
  if (choiceIndex >= currentQuestion.choices.length) return false;

  game.answers[socketId] = {
    questionId: currentQuestion.id,
    choiceIndex,
    answeredAt: now,
  };

  logger.info('Answer recorded', {
    code,
    playerName: game.players[socketId].name,
    questionIndex: game.currentQuestionIndex + 1,
  });

  return true;
}

/**
 * Finalizes scoring for the current question. Awards speed-based points
 * (up to 1000) plus a streak bonus for consecutive correct answers.
 * Returns rich result data including answer distribution and ranked leaderboard.
 */
export function finalizeQuestion(code: string): QuestionResult | null {
  const game = games[code];
  if (!game || game.state !== 'question') return null;

  // Mark as reveal immediately to prevent double-finalization
  game.state = 'reveal';

  const question = game.questions[game.currentQuestionIndex];
  const questionDurationMs = question.durationSec * 1000;

  // Snapshot current ranks before scoring so we can compute rank deltas
  const playersSortedBefore = Object.values(game.players)
    .sort((a, b) => b.score - a.score);
  playersSortedBefore.forEach((player, index) => {
    player.previousRank = index + 1;
  });

  // Tally how many players picked each choice
  const answerCounts = new Array(question.choices.length).fill(0);
  for (const answer of Object.values(game.answers)) {
    if (answer.choiceIndex >= 0 && answer.choiceIndex < answerCounts.length) {
      answerCounts[answer.choiceIndex] += 1;
    }
  }

  // Score each player
  for (const [playerId, answer] of Object.entries(game.answers)) {
    const player = game.players[playerId];
    if (!player) continue;

    if (answer.choiceIndex === question.answerIndex) {
      // Speed score: up to 1000 pts based on how quickly they answered
      const timeRemaining = Math.max(0, (game.questionEndsAt || 0) - answer.answeredAt);
      const speedScore = Math.round((timeRemaining / questionDurationMs) * 1000);

      // Streak bonus: +100 pts per streak level (capped at +500)
      player.streak += 1;
      const streakBonus = Math.min(player.streak - 1, 5) * 100;

      player.score += speedScore + streakBonus;
    } else {
      player.streak = 0;
    }
  }

  // Players who did not answer lose their streak
  for (const [playerId, player] of Object.entries(game.players)) {
    if (!game.answers[playerId]) {
      player.streak = 0;
    }
  }

  // Build ranked leaderboard with rank deltas
  const ranked = Object.values(game.players)
    .sort((a, b) => b.score - a.score)
    .map((player, index) => {
      const currentRank = index + 1;
      const pointsEarned = (() => {
        const answer = game.answers[player.id];
        if (!answer || answer.choiceIndex !== question.answerIndex) return 0;
        const timeRemaining = Math.max(0, (game.questionEndsAt || 0) - answer.answeredAt);
        const speedScore = Math.round((timeRemaining / questionDurationMs) * 1000);
        const streakBonus = Math.min(player.streak - 1, 5) * 100;
        return speedScore + streakBonus;
      })();

      return {
        rank: currentRank,
        name: player.name,
        score: player.score,
        pointsEarned,
        streak: player.streak,
        rankDelta: player.previousRank - currentRank,
      };
    });

  logger.info('Question finalized', {
    code,
    questionIndex: game.currentQuestionIndex + 1,
    correctIndex: question.answerIndex,
  });

  return {
    correctIndex: question.answerIndex,
    answerCounts,
    leaderboard: ranked,
  };
}

/**
 * Handles a socket disconnection. Cleans up the game if the host left,
 * or removes the player from the game.
 *
 * Returns information about what happened so the caller can emit the
 * appropriate socket events.
 */
export function handleDisconnect(socketId: string): {
  type: 'host' | 'player' | 'none';
  code?: string;
  players?: Player[];
} {
  const game = Object.values(games).find(
    (g) => g.players[socketId] || g.hostSocketId === socketId
  );

  if (!game) return { type: 'none' };

  if (game.hostSocketId === socketId) {
    const code = game.code;
    delete games[code];
    logger.info('Game ended - host disconnected', { code });
    return { type: 'host', code };
  }

  if (game.players[socketId]) {
    const name = game.players[socketId].name;
    delete game.players[socketId];
    delete game.answers[socketId];
    logger.info('Player left game', { code: game.code, playerName: name });
    return { type: 'player', code: game.code, players: Object.values(game.players) };
  }

  return { type: 'none' };
}

/**
 * Removes a game from the store. Used when the game ends naturally.
 */
export function removeGame(code: string): void {
  delete games[code];
}

// ---------------------------------------------------------------------------
// Periodic Cleanup
// Removes games that have been sitting in lobby state with no players for
// longer than the configured timeout. Prevents memory leaks from abandoned
// game sessions.
// ---------------------------------------------------------------------------

export function cleanupIdleGames(): void {
  const now = Date.now();
  let cleaned = 0;

  for (const [code, game] of Object.entries(games)) {
    const isIdle =
      game.state === 'lobby' &&
      Object.keys(game.players).length === 0 &&
      now - game.createdAt > IDLE_GAME_TIMEOUT_MS;

    if (isIdle) {
      delete games[code];
      cleaned += 1;
    }
  }

  if (cleaned > 0) {
    logger.info('Idle games cleaned up', { count: cleaned, remaining: Object.keys(games).length });
  }
}
