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

import Stripe from 'stripe';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import { logger } from './utils/logger';
import { EVENTS } from './types/events';
import {
  CreateGameSchema,
  JoinGameSchema,
  StartGameSchema,
  AnswerSchema,
  GameActionSchema,
  AIGenerateSchema,
  CodeSchema,
  HostReconnectSchema,
  PlayerResumeSchema,
  PlayerUpdateSchema,
  ExtendTimeSchema,
  SetTeamsSchema,
} from './validators/schemas';
import { generateQuestions } from './services/aiGenerator';
import { adminConfigured, adminDb, verifyRequestUser } from './services/firebaseAdmin';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import {
  checkRateLimit,
  clearRateLimits,
  RATE_LIMITS,
} from './middleware/rateLimit';
import {
  createGame,
  getGame,
  addPlayer,
  updatePlayer,
  getPlayerList,
  getConnectedPlayerList,
  isGameHost,
  advanceToNextQuestion,
  recordAnswer,
  finalizeQuestion,
  handleDisconnect,
  getActiveGameCount,
  cleanupIdleGames,
  cleanupDisconnectedPlayers,
  resumePlayer,
  rankOf,
  connectedPlayerCount,
  removeGame,
  setTeams,
  assignPlayerTeam,
  getTeamLeaderboard,
  pauseGame,
  resumeGame,
  extendQuestionTime,
  reconnectHost,
  abandonGame,
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

// JSON bodies everywhere except the Stripe webhook, which must see the raw
// bytes to verify its signature.
const jsonParser = express.json({ limit: '100kb' });
app.use((req, res, next) => {
  if (req.originalUrl === '/api/billing/webhook') return next();
  return jsonParser(req, res, next);
});

/** AI generation costs real money: cap it per user (or per IP when unauthenticated in dev). */
const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => (req as any).verifiedUid ?? ipKeyGenerator(req.ip ?? 'unknown'),
  message: { error: 'You have generated a lot of questions. Please wait a few minutes and try again.' },
});

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

/**
 * AI question generation endpoint.
 * POST /api/ai/generate
 * Body: { topic: string; gradeLevel: string; count: number }
 * Returns: { questions: AIQuestion[] }
 *
 * Requires GEMINI_API_KEY to be set in the server environment.
 * Returns 503 if the key is absent, 400 on bad input, 500 on Gemini failure.
 */
app.post('/api/ai/generate', async (req, res, next) => {
  // Signed-in users only. Local development without Firebase Admin is allowed
  // so the feature can be built and tested, with a warning in the log.
  const user = await verifyRequestUser(req);
  if (!user) {
    if (NODE_ENV === 'production' || adminConfigured()) {
      res.status(401).json({ error: 'Please sign in to use AI generation.' });
      return;
    }
    logger.warn('[AI] Unauthenticated request allowed (development, no Firebase Admin)');
  } else {
    (req as any).verifiedUid = user.uid;
  }
  next();
}, aiLimiter, async (req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    res.status(503).json({ error: 'AI generation is not configured on this server.' });
    return;
  }

  const parseResult = AIGenerateSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: 'Invalid request', details: parseResult.error.flatten() });
    return;
  }

  try {
    const questions = await generateQuestions(parseResult.data);
    res.json({ questions });
  } catch (err: any) {
    logger.error('[AI] Generation failed', { message: err?.message });
    res.status(500).json({ error: 'AI generation failed. Please try again.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/billing/create-checkout
// Body: { uid: string; email: string }
// Creates a Stripe Checkout session for the Pro plan.
// ---------------------------------------------------------------------------
app.post('/api/billing/create-checkout', async (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    res.status(503).json({ error: 'Billing is not configured on this server.' });
    return;
  }
  // Identity comes from the verified ID token, never from the request body.
  const user = await verifyRequestUser(req);
  if (!user || !user.email) {
    res.status(401).json({ error: 'Please sign in before upgrading.' });
    return;
  }
  const { uid, email } = user;
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-04-22.dahlia' });
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [
        {
          price: process.env.STRIPE_PRO_PRICE_ID!,
          quantity: 1,
        },
      ],
      client_reference_id: uid,
      metadata: { uid },
      // The webhook receives subscription events, so the uid must live there too
      subscription_data: { metadata: { uid } },
      success_url: `${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/dashboard?upgraded=1`,
      cancel_url: `${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/pricing`,
    });
    res.json({ url: session.url });
  } catch (err: any) {
    logger.error('[Billing] Checkout creation failed', { message: err?.message });
    res.status(500).json({ error: 'Could not create checkout session.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/billing/webhook
// Stripe webhook — upgrades / downgrades user plan in Firestore.
// ---------------------------------------------------------------------------
app.post(
  '/api/billing/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
      res.status(503).json({ error: 'Billing webhook not configured.' });
      return;
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-04-22.dahlia' });
    const sig = req.headers['stripe-signature'] as string;
    let event: ReturnType<typeof stripe.webhooks.constructEvent>;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      logger.warn('[Billing] Webhook signature verification failed', { message: err?.message });
      res.status(400).send(`Webhook Error: ${err?.message}`);
      return;
    }

    // Plan state is written to entitlements/{uid}, which clients can read but
    // never write. Any failure returns 500 so Stripe retries the event.
    const db = adminDb();
    if (!db) {
      logger.error('[Billing] Webhook received but Firebase Admin is not configured');
      res.status(500).json({ error: 'Entitlement store unavailable.' });
      return;
    }

    try {
      const planFor = (status?: string): 'pro' | 'free' => {
        // trialing counts as paid; past_due keeps access during Stripe's retry window
        return status === 'active' || status === 'trialing' || status === 'past_due' ? 'pro' : 'free';
      };
      const save = async (uid: string, data: Record<string, unknown>) => {
        await db.collection('entitlements').doc(uid).set({ ...data, updatedAt: Date.now() }, { merge: true });
        logger.info('[Billing] Entitlement updated', { uid, ...data });
      };

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as { client_reference_id?: string | null; metadata?: { uid?: string }; customer?: string | null };
        const uid = session.client_reference_id || session.metadata?.uid;
        if (uid) await save(uid, { plan: 'pro', status: 'active', stripeCustomerId: session.customer ?? null });
      } else if (
        event.type === 'customer.subscription.created' ||
        event.type === 'customer.subscription.updated' ||
        event.type === 'customer.subscription.deleted'
      ) {
        const sub = event.data.object as { metadata?: { uid?: string }; status?: string; customer?: string };
        const uid = sub.metadata?.uid;
        if (uid) {
          const status = event.type === 'customer.subscription.deleted' ? 'canceled' : sub.status;
          await save(uid, { plan: planFor(status), status: status ?? 'unknown', stripeCustomerId: sub.customer ?? null });
        } else {
          logger.warn('[Billing] Subscription event without uid metadata', { type: event.type });
        }
      }
    } catch (err: any) {
      logger.error('[Billing] Entitlement update failed', { message: err?.message });
      res.status(500).json({ error: 'Could not record the billing event.' });
      return;
    }

    res.json({ received: true });
  }
);

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
// Per-game timer handles — lets us cancel / replace timers for pause & extend
// ---------------------------------------------------------------------------
const questionTimers = new Map<string, ReturnType<typeof setTimeout>>();
const revealTimers   = new Map<string, ReturnType<typeof setTimeout>>();
const hostAbandonTimers = new Map<string, ReturnType<typeof setTimeout>>();

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
    (payload: unknown, callback: (data: { code?: string; hostToken?: string; error?: string }) => void) => {
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
      const created = createGame(socket.id, result.data.questions, result.data.quizTitle);
      if (!created) {
        return callback({ error: 'Server is at capacity. Please try again later.' });
      }
      const { code, hostToken } = created;

      socket.join(code);

      // Notify the host of their role so the client does not need URL params
      socket.emit(EVENTS.GAME_ROLE, { role: 'host', code });

      // hostToken lets this host (and only this host) reclaim the game after a refresh
      callback({ code, hostToken });
    }
  );

  // -----------------------------------------------------------------------
  // player:join - Player joins an existing game
  // -----------------------------------------------------------------------
  socket.on(
    'player:join',
    (payload: unknown, callback: (data: { ok: boolean; reason?: string; playerToken?: string }) => void) => {
      if (typeof callback !== 'function') return;
      if (!checkRateLimit(socket.id, 'player:join', RATE_LIMITS.playerJoin)) {
        logger.warn('Rate limit exceeded for join attempts', { socketId: socket.id });
        return callback({ ok: false, reason: 'Too many join attempts. Please wait a moment.' });
      }

      const result = JoinGameSchema.safeParse(payload);
      if (!result.success) {
        return callback({ ok: false, reason: 'Invalid game code or name provided.' });
      }

      const { code, name, avatar } = result.data;

      // Returning players resume with their token (session:resume); joining by
      // name alone can no longer take over someone else's seat.
      const joinResult = addPlayer(code, socket.id, name, avatar);

      if (!joinResult.ok) {
        return callback(joinResult);
      }

      socket.join(code);

      // If teams are enabled, assign this player a team
      const teamName = assignPlayerTeam(code, socket.id);

      // Notify the player of their role (include teamName if assigned)
      socket.emit(EVENTS.GAME_ROLE, { role: 'player', code, teamName });

      // Broadcast updated player list to all participants
      io.to(code).emit(EVENTS.LOBBY_UPDATE, getConnectedPlayerList(code));
      // Also broadcast updated team info so host can see team assignments live
      if (teamName) {
        const game = getGame(code);
        if (game) io.to(code).emit('lobby:teams', { teamsEnabled: true, teamNames: game.teamNames });
      }

      callback({ ok: true, playerToken: joinResult.playerToken });
    }
  );

  // -----------------------------------------------------------------------
  // player:update - Change your own sticker (name / avatar) before the start
  // -----------------------------------------------------------------------
  socket.on(
    EVENTS.PLAYER_UPDATE,
    (payload: unknown, callback: (data: { ok: boolean; reason?: string; name?: string; avatar?: string }) => void) => {
      if (typeof callback !== 'function') return;
      if (!checkRateLimit(socket.id, 'player:update', RATE_LIMITS.playerJoin)) {
        return callback({ ok: false, reason: 'Slow down a little and try again.' });
      }
      const parsed = PlayerUpdateSchema.safeParse(payload);
      if (!parsed.success || (!parsed.data.name && !parsed.data.avatar)) {
        return callback({ ok: false, reason: 'That name or sticker is not allowed.' });
      }
      const { code, playerToken, name, avatar } = parsed.data;
      const result = updatePlayer(code, socket.id, playerToken, { name, avatar });
      if (!result.ok) return callback(result);
      io.to(code).emit(EVENTS.LOBBY_UPDATE, getConnectedPlayerList(code));
      callback(result);
    }
  );

  // -----------------------------------------------------------------------
  // host:set-teams - Host enables teams and sets team names before game starts
  // -----------------------------------------------------------------------
  socket.on('host:set-teams', (payload: unknown, callback?: (res: { ok: boolean; error?: string }) => void) => {
    const cb = typeof callback === 'function' ? callback : () => {};
    const parsed = SetTeamsSchema.safeParse(payload);
    if (!parsed.success) {
      return cb({ ok: false, error: 'Use 2 to 8 short team names.' });
    }
    const { code, teamNames } = parsed.data;
    if (!isGameHost(code, socket.id)) {
      return cb({ ok: false, error: 'Not the host.' });
    }
    const ok = setTeams(code, teamNames);
    if (!ok) return cb({ ok: false, error: 'Cannot set teams after game starts.' });
    io.to(code).emit('lobby:teams', { teamsEnabled: true, teamNames });
    cb({ ok: true });
  });

  // -----------------------------------------------------------------------
  // host:start - Host starts the quiz
  // -----------------------------------------------------------------------
  socket.on(EVENTS.HOST_START, (payload: unknown) => {
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
    // Only from the lobby: a double click or a stale button can't skip questions
    if (!game || game.state !== 'lobby' || Object.keys(game.players).length === 0) return;

    startNextQuestion(code);
  });

  // -----------------------------------------------------------------------
  // player:answer - Player submits an answer
  // -----------------------------------------------------------------------
  socket.on(EVENTS.PLAYER_ANSWER, (payload: unknown) => {
    if (!checkRateLimit(socket.id, 'player:answer', RATE_LIMITS.playerAnswer)) {
      return;
    }

    const result = AnswerSchema.safeParse(payload);
    if (!result.success) return;

    const { code, choiceIndex } = result.data;
    const recorded = recordAnswer(code, socket.id, choiceIndex);

    if (recorded) {
      io.to(socket.id).emit('player:answer:ack');

      // Broadcast live answer count to all in the room (host shows a progress bar)
      const gameForCount = getGame(code);
      if (gameForCount) {
        const count = Object.keys(gameForCount.answers).length;
        io.to(code).emit(EVENTS.GAME_ANSWER_COUNT, count);
      }

      // If every player has now answered, end the question early
      const game = getGame(code);
      if (game && game.state === 'question') {
        // Disconnected players can't answer, so they don't hold everyone up
        const playerCount = connectedPlayerCount(game);
        const answerCount = Object.keys(game.answers).length;
        if (answerCount >= playerCount && playerCount > 0) {
          endCurrentQuestion(code, game.currentQuestionIndex);
        }
      }
    }
  });

  // -----------------------------------------------------------------------
  // lobby:request - Client requests a fresh player list (used on mount)
  // -----------------------------------------------------------------------
  socket.on(EVENTS.LOBBY_REQUEST, (payload: unknown) => {
    const parsed = CodeSchema.safeParse((payload as { code?: unknown })?.code);
    if (!parsed.success) return;
    const code = parsed.data;
    const game = getGame(code);
    if (!game) return;
    // Only the host and players of this game may watch its room
    const isMember = game.hostSocketId === socket.id || socket.id in game.players;
    if (!isMember) return;
    socket.join(code);
    socket.emit(EVENTS.LOBBY_UPDATE, getConnectedPlayerList(code));
  });

  // -----------------------------------------------------------------------
  // host:skip - Host skips the current question immediately
  // -----------------------------------------------------------------------
  socket.on(EVENTS.HOST_SKIP, (payload: unknown) => {
    const result = GameActionSchema.safeParse(payload);
    if (!result.success) return;
    const { code } = result.data;
    if (!isGameHost(code, socket.id)) return;
    const game = getGame(code);
    if (!game || game.state !== 'question') return;
    logger.info('Host skipped question', { code, questionIndex: game.currentQuestionIndex + 1 });
    endCurrentQuestion(code, game.currentQuestionIndex);
  });

  // -----------------------------------------------------------------------
  // host:end - Host ends the game early with current scores
  // -----------------------------------------------------------------------
  socket.on(EVENTS.HOST_END_GAME, (payload: unknown) => {
    const result = GameActionSchema.safeParse(payload);
    if (!result.success) return;
    const { code } = result.data;
    if (!isGameHost(code, socket.id)) return;
    const game = getGame(code);
    if (!game) return;
    logger.info('Host ended game early', { code });
    const leaderboard = Object.values(game.players)
      .sort((a, b) => b.score - a.score)
      .map((p, i) => ({
        rank: i + 1,
        name: p.name,
        avatar: p.avatar,
        score: p.score,
        pointsEarned: 0,
        streak: p.streak,
        rankDelta: 0,
      }));
    io.to(code).emit(EVENTS.GAME_RESULTS, {
      leaderboard,
      teamLeaderboard: getTeamLeaderboard(code),
      quizTitle: game.quizTitle,
      code,
      playedAt: Date.now(),
    });
    removeGame(code);
  });

  // -----------------------------------------------------------------------
  // disconnect - Handle client disconnection
  // -----------------------------------------------------------------------
  socket.on('disconnect', () => {
    logger.info('Client disconnected', { socketId: socket.id });

    const result = handleDisconnect(socket.id);

    if (result.type === 'host' && result.code) {
      if (result.keepAlive) {
        // Game kept alive — give host 90s to reconnect before ending for everyone
        const code = result.code;
        io.to(code).emit('host:away');  // players see a "host disconnected" banner
        const t = setTimeout(() => {
          const game = getGame(code);
          if (game && !game.hostConnected) {
            io.to(code).emit(EVENTS.GAME_ENDED);
            abandonGame(code);
            questionTimers.delete(code);
            revealTimers.delete(code);
          }
          hostAbandonTimers.delete(code);
        }, 90_000);
        hostAbandonTimers.set(code, t);
      } else {
        io.to(result.code).emit(EVENTS.GAME_ENDED);
      }
    } else if (result.type === 'player' && result.code && result.players) {
      io.to(result.code).emit(EVENTS.LOBBY_UPDATE, result.players);
    }

    // Clean up rate limit entries for this socket
    clearRateLimits(socket.id);
  });

  // -----------------------------------------------------------------------
  // host:reconnect - Host re-identifies after losing connection
  // -----------------------------------------------------------------------
  socket.on('host:reconnect', (payload: unknown) => {
    const parsed = HostReconnectSchema.safeParse(payload);
    if (!parsed.success) {
      socket.emit('host:reconnect:failed');
      return;
    }
    const { code, hostToken } = parsed.data;

    const result = reconnectHost(code, socket.id, hostToken);
    if (!result.ok || !result.game) {
      socket.emit('host:reconnect:failed');
      return;
    }
    if (result.previousSocketId && result.previousSocketId !== socket.id) {
      io.sockets.sockets.get(result.previousSocketId)?.leave(code);
    }

    // Cancel the abandon timer
    const t = hostAbandonTimers.get(code);
    if (t) { clearTimeout(t); hostAbandonTimers.delete(code); }

    socket.join(code);
    socket.emit(EVENTS.GAME_ROLE, { role: 'host', code });

    // Tell players the host is back
    io.to(code).emit('host:back');

    // Send current game state snapshot back to the host
    const game = result.game;
    const currentQ = game.questions[game.currentQuestionIndex];
    socket.emit('game:state', {
      state: game.state,
      paused: game.paused,
      currentQuestion: currentQ ? {
        index: game.currentQuestionIndex,
        total: game.questions.length,
        endsAt: game.questionEndsAt,
        timeRemainingMs: game.paused ? game.pauseTimeRemainingMs : undefined,
        q: {
          id: currentQ.id,
          text: currentQ.text,
          choices: currentQ.choices,
          durationSec: currentQ.durationSec,
        },
      } : undefined,
      players: getConnectedPlayerList(code),
      answerCount: Object.keys(game.answers).length,
      quizTitle: game.quizTitle,
    });
  });

  // -----------------------------------------------------------------------
  // session:resume - A player comes back after a refresh or network drop
  // -----------------------------------------------------------------------
  socket.on('session:resume', (payload: unknown) => {
    if (!checkRateLimit(socket.id, 'player:join', RATE_LIMITS.playerJoin)) return;
    const parsed = PlayerResumeSchema.safeParse(payload);
    if (!parsed.success) {
      socket.emit('session:resume:failed');
      return;
    }
    const { code, playerToken } = parsed.data;
    const resumed = resumePlayer(code, socket.id, playerToken);
    const game = getGame(code);
    if (!resumed.ok || !resumed.player || !game) {
      socket.emit('session:resume:failed');
      return;
    }
    if (resumed.previousSocketId) {
      io.sockets.sockets.get(resumed.previousSocketId)?.leave(code);
    }
    socket.join(code);
    socket.emit(EVENTS.GAME_ROLE, { role: 'player', code, teamName: resumed.player.teamName });

    const currentQ = game.state === 'question' ? game.questions[game.currentQuestionIndex] : undefined;
    const answer = game.answers[socket.id];
    socket.emit('player:state', {
      state: game.state,
      paused: game.paused,
      currentQuestion: currentQ ? {
        index: game.currentQuestionIndex,
        total: game.questions.length,
        endsAt: game.questionEndsAt,
        timeRemainingMs: game.paused ? game.pauseTimeRemainingMs : undefined,
        q: { id: currentQ.id, text: currentQ.text, choices: currentQ.choices, durationSec: currentQ.durationSec },
      } : undefined,
      answered: Boolean(answer),
      choiceIndex: answer?.choiceIndex,
      score: resumed.player.score,
      rank: rankOf(game, socket.id),
      players: getConnectedPlayerList(code),
    });
    io.to(code).emit(EVENTS.LOBBY_UPDATE, getConnectedPlayerList(code));
  });

  // -----------------------------------------------------------------------
  // host:pause - Host pauses the current question timer
  // -----------------------------------------------------------------------
  socket.on('host:pause', (payload: unknown) => {
    const parsed = GameActionSchema.safeParse(payload);
    if (!parsed.success) return;
    const { code } = parsed.data;
    if (!isGameHost(code, socket.id)) return;
    const result = pauseGame(code);
    if (!result.ok) return;
    // Clear the pending question-end timer
    const t = questionTimers.get(code);
    if (t) { clearTimeout(t); questionTimers.delete(code); }
    io.to(code).emit('game:paused', { timeRemainingMs: result.timeRemainingMs });
  });

  // -----------------------------------------------------------------------
  // host:resume - Host resumes a paused question
  // -----------------------------------------------------------------------
  socket.on('host:resume', (payload: unknown) => {
    const parsed = GameActionSchema.safeParse(payload);
    if (!parsed.success) return;
    const { code } = parsed.data;
    if (!isGameHost(code, socket.id)) return;
    const result = resumeGame(code);
    if (!result.ok || !result.newEndsAt) return;
    const game = getGame(code);
    if (!game) return;
    // Reschedule the question-end timer with remaining time
    const remaining = result.newEndsAt - Date.now();
    const qi = game.currentQuestionIndex;
    const t = setTimeout(() => endCurrentQuestion(code, qi), Math.max(remaining + 500, 500));
    questionTimers.set(code, t);
    io.to(code).emit('game:resumed', { endsAt: result.newEndsAt });
  });

  // -----------------------------------------------------------------------
  // host:extend-time - Host adds extra seconds to the current question
  // -----------------------------------------------------------------------
  socket.on('host:extend-time', (payload: unknown) => {
    const parsed = ExtendTimeSchema.safeParse(payload);
    if (!parsed.success) return;
    const { code, extraSeconds } = parsed.data;
    if (!isGameHost(code, socket.id)) return;
    const result = extendQuestionTime(code, extraSeconds);
    if (!result.ok) return;
    const game = getGame(code);
    if (!game) return;

    if (game.paused) {
      // Just update the displayed remaining time for the host; timer isn't running
      io.to(code).emit('game:paused', { timeRemainingMs: result.newTimeRemainingMs });
    } else if (result.newEndsAt) {
      // Reschedule the end timer
      const t = questionTimers.get(code);
      if (t) clearTimeout(t);
      const qi = game.currentQuestionIndex;
      const remaining = result.newEndsAt - Date.now();
      const nt = setTimeout(() => endCurrentQuestion(code, qi), Math.max(remaining + 500, 500));
      questionTimers.set(code, nt);
      io.to(code).emit('game:resumed', { endsAt: result.newEndsAt });
    }
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
      const game = getGame(code);
      io.to(code).emit(EVENTS.GAME_RESULTS, {
        leaderboard: result.leaderboard,
        teamLeaderboard: getTeamLeaderboard(code),
        quizTitle: game?.quizTitle,
        code,
        playedAt: Date.now(),
      });
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

    // Store timer handle so pause/extend can cancel it
    const questionIndex = result.questionData.index;
    const durationMs = result.questionData.question.durationSec * 1000;
    const t = setTimeout(() => {
      endCurrentQuestion(code, questionIndex);
    }, durationMs + 500); // 500ms buffer for network latency
    questionTimers.set(code, t);
  }
}

/**
 * Finalizes the current question by calculating scores and emitting
 * the full result (correct answer, answer distribution, ranked leaderboard)
 * before automatically advancing to the next question.
 * Guards against being called twice for the same question via questionIndex tag.
 */
function endCurrentQuestion(code: string, questionIndex: number): void {
  const game = getGame(code);
  // Guard: only finalize if we are still on the same question that scheduled this call
  if (!game || game.state !== 'question') return;
  if (game.currentQuestionIndex !== questionIndex) return;
  // Guard: if game is paused, the pause handler will reschedule this call
  if (game.paused) return;

  questionTimers.delete(code);

  const result: QuestionResult | null = finalizeQuestion(code);
  if (result === null) return;

  io.to(code).emit('game:question:end', result);

  // Pause between questions to show the answer reveal screen
  const t = setTimeout(() => {
    revealTimers.delete(code);
    startNextQuestion(code);
  }, 5000);
  revealTimers.set(code, t);
}

// ---------------------------------------------------------------------------
// Periodic Maintenance
// Runs every 60 seconds to clean up abandoned game sessions.
// ---------------------------------------------------------------------------

setInterval(() => {
  cleanupIdleGames();
  cleanupDisconnectedPlayers();
}, 60_000);

// ---------------------------------------------------------------------------
// Last-resort safety net: log and keep serving every other game instead of
// letting one bad event take the whole process (and every live game) down.
// ---------------------------------------------------------------------------

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { message: err.message, stack: err.stack });
});
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason: String(reason) });
});

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
