// ---------------------------------------------------------------------------
// Ladle Quiz Server
// Real-time quiz game server built with Express and Socket.IO.
//
// Security measures implemented:
//   - Helmet for HTTP security headers
//   - CORS restricted to configured origins
//   - Zod schema validation on all incoming payloads
//   - Per-socket rate limiting on all events
//   - Input sanitization (HTML tag stripping)
//   - No debug endpoints exposed in production
//   - Host identity verified server-side (not via URL parameters)
//   - Maximum game and player limits enforced
// ---------------------------------------------------------------------------

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import { logger } from './utils/logger';
import {
  CreateGameSchema,
  JoinGameSchema,
  StartGameSchema,
  AnswerSchema,
} from './validators/schemas';
import {
  checkRateLimit,
  clearRateLimits,
  RATE_LIMITS,
} from './middleware/rateLimit';
import {
  createGame,
  getGame,
  addPlayer,
  getPlayerList,
  isGameHost,
  advanceToNextQuestion,
  recordAnswer,
  finalizeQuestion,
  handleDisconnect,
  getActiveGameCount,
  cleanupIdleGames,
  QuestionResult,
} from './services/gameManager';

// ---------------------------------------------------------------------------
// Environment Configuration
// ---------------------------------------------------------------------------

dotenv.config();

const PORT = Number(process.env.PORT || 3001);
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Builds the list of allowed CORS origins from environment variables.
 * In development, localhost origins are included automatically.
 */
function getAllowedOrigins(): string[] {
  const origins: string[] = [
    'http://localhost:5173',
    'http://localhost:5174',
    // Production Netlify frontend — always allowed as a hardcoded fallback
    // so the server works even if CLIENT_ORIGIN env var is not set in Render
    'https://ladle.netlify.app',
    'https://ladle-3c896.web.app',
  ];

  if (process.env.CLIENT_ORIGIN) {
    origins.push(process.env.CLIENT_ORIGIN);
  }

  if (process.env.ADDITIONAL_ORIGINS) {
    const additional = process.env.ADDITIONAL_ORIGINS.split(',').map((o) => o.trim());
    origins.push(...additional);
  }

  return origins;
}

const allowedOrigins = getAllowedOrigins();

// ---------------------------------------------------------------------------
// Express Application Setup
// ---------------------------------------------------------------------------

const app = express();

// Security headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  })
);

app.use(express.json());

// ---------------------------------------------------------------------------
// HTTP Routes
// Only health and ping endpoints are exposed. No debug endpoints in
// production to prevent information leakage.
// ---------------------------------------------------------------------------

/**
 * Root endpoint. Returns a simple status message confirming the server
 * is running. Does not expose internal state.
 */
app.get('/', (_req, res) => {
  res.json({
    service: 'Ladle Quiz Server',
    status: 'running',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Health check endpoint for load balancers and monitoring services.
 * Returns uptime and a simple OK status.
 */
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

/**
 * Keep-alive endpoint for free-tier hosting services that sleep after
 * periods of inactivity (such as Render).
 */
app.get('/ping', (_req, res) => {
  res.json({ pong: Date.now() });
});

// ---------------------------------------------------------------------------
// Socket.IO Server Setup
// ---------------------------------------------------------------------------

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

// ---------------------------------------------------------------------------
// Socket Event Handlers
// ---------------------------------------------------------------------------

io.on('connection', (socket) => {
  logger.info('Client connected', { socketId: socket.id });

  // -----------------------------------------------------------------------
  // host:create - Host creates a new quiz game
  // -----------------------------------------------------------------------
  socket.on(
    'host:create',
    (payload: unknown, callback: (data: { code?: string; error?: string }) => void) => {
      // Rate limit check
      if (!checkRateLimit(socket.id, 'host:create', RATE_LIMITS.hostCreate)) {
        logger.warn('Rate limit exceeded for game creation', { socketId: socket.id });
        return callback({ error: 'Too many requests. Please wait before creating another game.' });
      }

      // Validate payload
      const result = CreateGameSchema.safeParse(payload);
      if (!result.success) {
        const errorMessage = result.error.issues.map((i) => i.message).join(', ');
        logger.warn('Invalid create game payload', { socketId: socket.id, error: errorMessage });
        return callback({ error: 'Invalid quiz data. Please check your questions and try again.' });
      }

      // Create the game
      const code = createGame(socket.id, result.data.questions);
      if (!code) {
        return callback({ error: 'Server is at capacity. Please try again later.' });
      }

      socket.join(code);

      // Notify the host of their role so the client does not need URL params
      socket.emit('game:role', { role: 'host', code });

      callback({ code });
    }
  );

  // -----------------------------------------------------------------------
  // player:join - Player joins an existing game
  // -----------------------------------------------------------------------
  socket.on(
    'player:join',
    (payload: unknown, callback: (data: { ok: boolean; reason?: string }) => void) => {
      if (!checkRateLimit(socket.id, 'player:join', RATE_LIMITS.playerJoin)) {
        logger.warn('Rate limit exceeded for join attempts', { socketId: socket.id });
        return callback({ ok: false, reason: 'Too many join attempts. Please wait a moment.' });
      }

      const result = JoinGameSchema.safeParse(payload);
      if (!result.success) {
        return callback({ ok: false, reason: 'Invalid game code or name provided.' });
      }

      const { code, name } = result.data;
      const joinResult = addPlayer(code, socket.id, name);

      if (!joinResult.ok) {
        return callback(joinResult);
      }

      socket.join(code);

      // Notify the player of their role
      socket.emit('game:role', { role: 'player', code });

      // Broadcast updated player list to all participants
      io.to(code).emit('lobby:update', getPlayerList(code));

      callback({ ok: true });
    }
  );

  // -----------------------------------------------------------------------
  // host:start - Host starts the quiz
  // -----------------------------------------------------------------------
  socket.on('host:start', (payload: unknown) => {
    if (!checkRateLimit(socket.id, 'host:start', RATE_LIMITS.hostStart)) {
      return;
    }

    const result = StartGameSchema.safeParse(payload);
    if (!result.success) return;

    const { code } = result.data;

    // Server-side host verification
    if (!isGameHost(code, socket.id)) {
      logger.warn('Non-host attempted to start game', { socketId: socket.id, code });
      return;
    }

    const game = getGame(code);
    if (!game || Object.keys(game.players).length === 0) return;

    startNextQuestion(code);
  });

  // -----------------------------------------------------------------------
  // player:answer - Player submits an answer
  // -----------------------------------------------------------------------
  socket.on('player:answer', (payload: unknown) => {
    if (!checkRateLimit(socket.id, 'player:answer', RATE_LIMITS.playerAnswer)) {
      return;
    }

    const result = AnswerSchema.safeParse(payload);
    if (!result.success) return;

    const { code, choiceIndex } = result.data;
    const recorded = recordAnswer(code, socket.id, choiceIndex);

    if (recorded) {
      io.to(socket.id).emit('player:answer:ack');
    }
  });

  // -----------------------------------------------------------------------
  // disconnect - Handle client disconnection
  // -----------------------------------------------------------------------
  socket.on('disconnect', () => {
    logger.info('Client disconnected', { socketId: socket.id });

    const result = handleDisconnect(socket.id);

    if (result.type === 'host' && result.code) {
      io.to(result.code).emit('game:ended');
    } else if (result.type === 'player' && result.code && result.players) {
      io.to(result.code).emit('lobby:update', result.players);
    }

    // Clean up rate limit entries for this socket
    clearRateLimits(socket.id);
  });
});

// ---------------------------------------------------------------------------
// Game Flow Helpers
// These orchestrate the question lifecycle by coordinating between the
// game manager and the Socket.IO event emitter.
// ---------------------------------------------------------------------------

/**
 * Advances to the next question in the game. If all questions have been
 * answered, emits the final results to all participants.
 */
function startNextQuestion(code: string): void {
  const result = advanceToNextQuestion(code);

  if (result.finished) {
    if (result.leaderboard) {
      io.to(code).emit('game:results', result.leaderboard);
    }
    return;
  }

  if (result.questionData) {
    // Send question to all players (correct answer is NOT included)
    io.to(code).emit('game:question', {
      index: result.questionData.index,
      total: result.questionData.total,
      endsAt: result.questionData.endsAt,
      q: result.questionData.question,
    });

    // Schedule automatic question finalization when time expires
    const durationMs = result.questionData.question.durationSec * 1000;
    setTimeout(() => {
      endCurrentQuestion(code);
    }, durationMs + 500); // 500ms buffer for network latency
  }
}

/**
 * Finalizes the current question by calculating scores and emitting
 * the full result (correct answer, answer distribution, ranked leaderboard)
 * before automatically advancing to the next question.
 */
function endCurrentQuestion(code: string): void {
  const result: QuestionResult | null = finalizeQuestion(code);
  if (result === null) return;

  io.to(code).emit('game:question:end', result);

  // Pause between questions to show the answer reveal screen
  setTimeout(() => {
    startNextQuestion(code);
  }, 5000);
}

// ---------------------------------------------------------------------------
// Periodic Maintenance
// Runs every 60 seconds to clean up abandoned game sessions.
// ---------------------------------------------------------------------------

setInterval(() => {
  cleanupIdleGames();
}, 60_000);

// ---------------------------------------------------------------------------
// Server Startup
// ---------------------------------------------------------------------------

server.listen(PORT, () => {
  logger.info('Ladle server started', {
    port: PORT,
    environment: NODE_ENV,
    corsOrigins: allowedOrigins.length,
  });
  logger.info('Health check available', { endpoint: `/health` });
});
