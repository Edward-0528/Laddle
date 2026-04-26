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
  connected: boolean;
  disconnectedAt?: number;
  teamName?: string;  // set when teams are enabled
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
  quizTitle?: string;
  teamsEnabled: boolean;
  teamNames: string[];   // ordered list of team names
  // Pause state
  paused: boolean;
  pauseTimeRemainingMs?: number;   // ms left on clock when paused
  // Host reconnect state
  hostConnected: boolean;
  hostDisconnectedAt?: number;
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
export function createGame(hostSocketId: string, questions: Question[], quizTitle?: string): string | null {
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
    quizTitle,
    teamsEnabled: false,
    teamNames: [],
    paused: false,
    hostConnected: true,
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

  game.players[socketId] = { id: socketId, name, score: 0, streak: 0, previousRank: 0, connected: true };
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
  game.paused = false;
  game.pauseTimeRemainingMs = undefined;
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
  keepAlive?: boolean;  // true = game kept alive, caller should NOT emit game:ended yet
} {
  const game = Object.values(games).find(
    (g) => g.players[socketId] || g.hostSocketId === socketId
  );

  if (!game) return { type: 'none' };

  if (game.hostSocketId === socketId) {
    const code = game.code;

    // If the game is active (in-progress), keep it alive so the host can reconnect.
    // The caller is responsible for setting a reconnect timeout.
    if (game.state !== 'lobby' && game.state !== 'results' && game.state !== 'ended') {
      game.hostConnected = false;
      game.hostDisconnectedAt = Date.now();
      logger.info('Host disconnected from active game — keeping alive for reconnect', { code });
      return { type: 'host', code, keepAlive: true };
    }

    // Lobby or finished game — delete immediately
    delete games[code];
    logger.info('Game ended - host disconnected', { code });
    return { type: 'host', code, keepAlive: false };
  }

  if (game.players[socketId]) {
    const player = game.players[socketId];
    const name = player.name;

    // For active (in-progress) games, mark disconnected so the player can
    // reconnect within the reconnect window instead of being removed.
    if (game.state !== 'lobby' && game.state !== 'results' && game.state !== 'ended') {
      player.connected = false;
      player.disconnectedAt = Date.now();
      logger.info('Player disconnected from active game', { code: game.code, playerName: name });
      return {
        type: 'player',
        code: game.code,
        players: Object.values(game.players).filter((p) => p.connected),
      };
    }

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
// Pause / Resume / Extend Time
// ---------------------------------------------------------------------------

/**
 * Pauses the current question. Records the remaining milliseconds so the
 * timer can be resumed accurately. Returns ok:false if the game is not in
 * question state or already paused.
 */
export function pauseGame(code: string): { ok: boolean; timeRemainingMs?: number } {
  const game = games[code];
  if (!game || game.state !== 'question' || game.paused) return { ok: false };
  const timeRemainingMs = Math.max(0, (game.questionEndsAt ?? Date.now()) - Date.now());
  game.paused = true;
  game.pauseTimeRemainingMs = timeRemainingMs;
  logger.info('Game paused', { code, timeRemainingMs });
  return { ok: true, timeRemainingMs };
}

/**
 * Resumes a paused question. Resets questionEndsAt based on remaining time.
 * Returns the new endsAt timestamp so clients can resync their timers.
 */
export function resumeGame(code: string): { ok: boolean; newEndsAt?: number } {
  const game = games[code];
  if (!game || game.state !== 'question' || !game.paused) return { ok: false };
  const remaining = game.pauseTimeRemainingMs ?? 10_000;
  game.paused = false;
  game.pauseTimeRemainingMs = undefined;
  game.questionEndsAt = Date.now() + remaining;
  logger.info('Game resumed', { code, remaining });
  return { ok: true, newEndsAt: game.questionEndsAt };
}

/**
 * Adds extra seconds to the current question timer. Works whether the game
 * is paused or actively running. Returns the new endsAt so clients resync.
 */
export function extendQuestionTime(
  code: string,
  extraSeconds: number
): { ok: boolean; newEndsAt?: number; newTimeRemainingMs?: number } {
  const game = games[code];
  if (!game || game.state !== 'question') return { ok: false };
  const extraMs = extraSeconds * 1000;
  if (game.paused) {
    game.pauseTimeRemainingMs = (game.pauseTimeRemainingMs ?? 0) + extraMs;
    logger.info('Extended paused question time', { code, extraSeconds });
    return { ok: true, newTimeRemainingMs: game.pauseTimeRemainingMs };
  }
  game.questionEndsAt = (game.questionEndsAt ?? Date.now()) + extraMs;
  logger.info('Extended active question time', { code, extraSeconds });
  return { ok: true, newEndsAt: game.questionEndsAt };
}

/**
 * Re-registers a new socket as the host of an active game.
 * Only succeeds if the game exists and the host slot is marked as disconnected.
 */
export function reconnectHost(
  code: string,
  newSocketId: string
): { ok: boolean; game?: Game } {
  const game = games[code];
  if (!game) return { ok: false };
  if (game.hostConnected) return { ok: false };   // host is already connected (or game just started)
  game.hostSocketId = newSocketId;
  game.hostConnected = true;
  game.hostDisconnectedAt = undefined;
  logger.info('Host reconnected', { code, newSocketId });
  return { ok: true, game };
}

/**
 * Forcibly ends a game that the host abandoned (reconnect timeout elapsed).
 */
export function abandonGame(code: string): void {
  const game = games[code];
  if (game) {
    delete games[code];
    logger.info('Game abandoned - host reconnect timeout', { code });
  }
}

// ---------------------------------------------------------------------------
// Team Mode
// ---------------------------------------------------------------------------

/**
 * Enables teams for a game and sets the team names.
 * Assigns each player in the lobby to a team round-robin.
 */
export function setTeams(code: string, teamNames: string[]): boolean {
  const game = games[code];
  if (!game || game.state !== 'lobby') return false;
  game.teamsEnabled = true;
  game.teamNames = teamNames;
  // Assign existing lobby players round-robin
  const playerList = Object.values(game.players);
  playerList.forEach((p, i) => {
    p.teamName = teamNames[i % teamNames.length];
  });
  return true;
}

/**
 * Assigns a joining player to the team with the fewest members (balance).
 */
export function assignPlayerTeam(code: string, socketId: string): string | undefined {
  const game = games[code];
  if (!game || !game.teamsEnabled || game.teamNames.length === 0) return undefined;
  const counts = Object.fromEntries(game.teamNames.map((n) => [n, 0]));
  for (const p of Object.values(game.players)) {
    if (p.teamName && counts[p.teamName] !== undefined) counts[p.teamName]++;
  }
  const smallest = game.teamNames.reduce((a, b) => (counts[a] <= counts[b] ? a : b));
  if (game.players[socketId]) game.players[socketId].teamName = smallest;
  return smallest;
}

/**
 * Returns a ranked team leaderboard (sum of scores per team).
 */
export function getTeamLeaderboard(code: string): Array<{ teamName: string; score: number; rank: number }> {
  const game = games[code];
  if (!game || !game.teamsEnabled) return [];
  const totals: Record<string, number> = {};
  for (const p of Object.values(game.players)) {
    const t = p.teamName ?? 'No Team';
    totals[t] = (totals[t] ?? 0) + p.score;
  }
  return Object.entries(totals)
    .sort(([, a], [, b]) => b - a)
    .map(([teamName, score], i) => ({ teamName, score, rank: i + 1 }));
}

/**
 * Returns only connected players (excludes temporarily disconnected ones).
 * Used for lobby broadcasts so disconnected players are not shown.
 */
export function getConnectedPlayerList(code: string): Player[] {
  const game = games[code];
  return game ? Object.values(game.players).filter((p) => p.connected) : [];
}

/**
 * Attempts to reconnect a player to an in-progress game.
 * Matches by player name and disconnected status, then re-maps to the new socketId.
 * Returns { ok: true, player } on success, { ok: false } if no match found.
 */
export function reconnectPlayer(
  code: string,
  newSocketId: string,
  name: string
): { ok: boolean; player?: Player } {
  const game = games[code];
  // Only reconnect to active games (not lobby or finished)
  if (!game || game.state === 'lobby' || game.state === 'results' || game.state === 'ended') {
    return { ok: false };
  }

  // Find a disconnected player with the matching name
  const entry = Object.entries(game.players).find(
    ([, p]) => p.name === name && !p.connected
  );
  if (!entry) return { ok: false };

  const [oldSocketId, player] = entry;

  // Move player record and any pending answer to the new socket ID
  delete game.players[oldSocketId];
  if (game.answers[oldSocketId]) {
    game.answers[newSocketId] = game.answers[oldSocketId];
    delete game.answers[oldSocketId];
  }

  player.id = newSocketId;
  player.connected = true;
  player.disconnectedAt = undefined;
  game.players[newSocketId] = player;

  logger.info('Player reconnected', { code, playerName: name, newSocketId });
  return { ok: true, player };
}

/** How long a disconnected player slot is held open (90 seconds). */
const RECONNECT_WINDOW_MS = 90_000;

/**
 * Removes player slots that have been disconnected longer than the reconnect window.
 * Called on the same interval as cleanupIdleGames.
 */
export function cleanupDisconnectedPlayers(): void {
  const now = Date.now();
  for (const game of Object.values(games)) {
    for (const [socketId, player] of Object.entries(game.players)) {
      if (
        !player.connected &&
        player.disconnectedAt &&
        now - player.disconnectedAt > RECONNECT_WINDOW_MS
      ) {
        delete game.players[socketId];
        delete game.answers[socketId];
        logger.info('Removed stale disconnected player slot', {
          code: game.code,
          playerName: player.name,
        });
      }
    }
  }
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
