import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      process.env.CLIENT_ORIGIN || 'http://localhost:5173',
      'https://ladle-3c896.web.app',
      'https://ladle-3c896.firebaseapp.com',
      'https://laddle-server.onrender.com'
    ],
    methods: ['GET', 'POST']
  }
});

// In-memory game store for $0 infrastructure cost
// For production scaling, consider moving to Redis or a database
interface Player {
  id: string;
  name: string;
  score: number;
}

interface Question {
  id: string;
  text: string;
  choices: string[];
  answerIndex: number; // 0-based index of correct answer
  durationSec: number;
}

interface Game {
  code: string;
  hostSocketId: string;
  players: Record<string, Player>; // keyed by socketId
  questions: Question[];
  state: 'lobby' | 'question' | 'results' | 'ended';
  currentQIndex: number;
  questionEndsAt?: number; // timestamp when current question ends
  answers: Record<string, { qid: string; choiceIndex: number; answeredAt: number }>; // by socketId
}

const games: Record<string, Game> = {};

function generateGameCode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded similar chars
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Test endpoint to verify connection
  socket.on('test:ping', (callback) => {
    console.log(`Test ping from ${socket.id}`);
    callback({ success: true, message: 'Server is working!', socketId: socket.id });
  });

  // Host creates a new game
  socket.on('host:create', (payload: { questions: Question[] }, callback: (data: { code: string }) => void) => {
    const code = generateGameCode();
    games[code] = {
      code,
      hostSocketId: socket.id,
      players: {},
      questions: payload.questions,
      state: 'lobby',
      currentQIndex: -1,
      answers: {}
    };
    
    socket.join(code);
    console.log(`Game created with code: ${code}`);
    callback({ code });
  });

  // Player joins an existing game
  socket.on('player:join', (payload: { code: string; name: string }, callback: (data: { ok: boolean; reason?: string }) => void) => {
    console.log(`🎯 Player join attempt: ${payload.name} -> ${payload.code}`);
    console.log(`📋 Available games:`, Object.keys(games));
    console.log(`🔍 Looking for game ${payload.code}:`, games[payload.code] ? 'EXISTS' : 'NOT FOUND');
    
    const game = games[payload.code];
    if (!game) {
      console.log(`❌ Game ${payload.code} not found. Available: [${Object.keys(games).join(', ')}]`);
      return callback({ ok: false, reason: `Game ${payload.code} not found. Available games: ${Object.keys(games).length}` });
    }
    if (game.state !== 'lobby') {
      console.log(`❌ Game ${payload.code} is not in lobby state: ${game.state}`);
      return callback({ ok: false, reason: 'Game already started' });
    }
    
    game.players[socket.id] = {
      id: socket.id,
      name: payload.name,
      score: 0
    };
    
    socket.join(payload.code);
    io.to(payload.code).emit('lobby:update', Object.values(game.players));
    console.log(`Player ${payload.name} joined game ${payload.code}`);
    callback({ ok: true });
  });

  // Host starts the quiz
  socket.on('host:start', (payload: { code: string }) => {
    const game = games[payload.code];
    if (!game || game.hostSocketId !== socket.id) return;
    
    console.log(`Starting game ${payload.code}`);
    nextQuestion(game);
  });

  // Player submits an answer
  socket.on('player:answer', (payload: { code: string; choiceIndex: number }) => {
    const game = games[payload.code];
    if (!game || game.state !== 'question') return;
    if (!(socket.id in game.players)) return;
    
    const currentQ = game.questions[game.currentQIndex];
    const now = Date.now();
    
    // Check if question time has expired
    if (now > (game.questionEndsAt || 0)) return;
    
    // Only allow one answer per question
    if (!game.answers[socket.id]) {
      game.answers[socket.id] = {
        qid: currentQ.id,
        choiceIndex: payload.choiceIndex,
        answeredAt: now
      };
      
      // Send acknowledgment to player
      io.to(socket.id).emit('player:answer:ack');
      console.log(`Player ${game.players[socket.id].name} answered question ${game.currentQIndex}`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Find and handle player/host leaving
    const game = Object.values(games).find(g => 
      g.players[socket.id] || g.hostSocketId === socket.id
    );
    
    if (!game) return;
    
    if (game.hostSocketId === socket.id) {
      // Host left - end the game
      io.to(game.code).emit('game:ended');
      delete games[game.code];
      console.log(`Game ${game.code} ended - host disconnected`);
    } else if (game.players[socket.id]) {
      // Player left - remove from game
      delete game.players[socket.id];
      delete game.answers[socket.id];
      io.to(game.code).emit('lobby:update', Object.values(game.players));
      console.log(`Player left game ${game.code}`);
    }
  });
});

function nextQuestion(game: Game) {
  game.currentQIndex += 1;
  game.answers = {}; // Reset answers for new question
  
  if (game.currentQIndex >= game.questions.length) {
    // Quiz finished - show results
    game.state = 'results';
    const leaderboard = Object.values(game.players)
      .sort((a, b) => b.score - a.score)
      .map((player, index) => ({
        rank: index + 1,
        name: player.name,
        score: player.score
      }));
    
    io.to(game.code).emit('game:results', leaderboard);
    console.log(`Game ${game.code} finished`);
    return;
  }
  
  const question = game.questions[game.currentQIndex];
  game.state = 'question';
  game.questionEndsAt = Date.now() + question.durationSec * 1000;
  
  // Send question to all players (without the correct answer)
  io.to(game.code).emit('game:question', {
    index: game.currentQIndex,
    total: game.questions.length,
    endsAt: game.questionEndsAt,
    q: {
      id: question.id,
      text: question.text,
      choices: question.choices,
      durationSec: question.durationSec
    }
  });
  
  console.log(`Question ${game.currentQIndex + 1} started for game ${game.code}`);
  
  // Auto-close question when time expires
  setTimeout(() => {
    finalizeQuestion(game);
  }, question.durationSec * 1000 + 500); // Small buffer for network delay
}

function finalizeQuestion(game: Game) {
  if (game.state !== 'question') return;
  
  const question = game.questions[game.currentQIndex];
  const maxTimeBonus = 1000; // Maximum bonus points for quick answers
  const questionDurationMs = question.durationSec * 1000;
  
  // Calculate scores
  for (const [playerId, answer] of Object.entries(game.answers)) {
    const player = game.players[playerId];
    if (!player) continue;
    
    const isCorrect = answer.choiceIndex === question.answerIndex;
    if (isCorrect) {
      // Base points + time bonus
      const timeRemaining = Math.max(0, (game.questionEndsAt || 0) - answer.answeredAt);
      const timeBonus = Math.round((timeRemaining / questionDurationMs) * maxTimeBonus);
      player.score += 1000 + timeBonus; // 1000 base + up to 1000 bonus
    }
  }
  
  // Show correct answer to all players
  io.to(game.code).emit('game:question:end', {
    correctIndex: question.answerIndex
  });
  
  console.log(`Question ${game.currentQIndex + 1} ended for game ${game.code}`);
  
  // Move to next question after showing results
  setTimeout(() => {
    nextQuestion(game);
  }, 3000); // 3 second pause between questions
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🎮 Laddle Quiz Server',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      ping: '/ping'
    },
    games: Object.keys(games).length,
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    games: Object.keys(games).length,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Keep-alive endpoint for free tier hosting
app.get('/ping', (req, res) => {
  res.json({ pong: Date.now() });
});

// Debug endpoint to check current games
app.get('/games', (req, res) => {
  const gamesList = Object.entries(games).map(([code, game]) => ({
    code,
    state: game.state,
    players: Object.keys(game.players).length,
    questions: game.questions.length,
    hostConnected: game.hostSocketId ? 'yes' : 'no'
  }));
  res.json({ 
    count: Object.keys(games).length,
    games: gamesList 
  });
});

const port = Number(process.env.PORT || 3001);
server.listen(port, () => {
  console.log(`🚀 Laddle server running on http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
});

// Cleanup old games periodically (prevent memory leaks)
setInterval(() => {
  const now = Date.now();
  Object.entries(games).forEach(([code, game]) => {
    // Remove games that have been idle for more than 1 hour
    if (game.state === 'lobby' && Object.keys(game.players).length === 0) {
      delete games[code];
      console.log(`Cleaned up idle game: ${code}`);
    }
  });
}, 60000); // Check every minute
