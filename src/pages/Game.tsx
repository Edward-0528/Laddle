// ---------------------------------------------------------------------------
// Game Page
// Handles all game states: lobby, active question, question results, and
// final leaderboard. Uses server-emitted "game:role" event to determine
// whether the current user is the host (no more URL query parameter).
// ---------------------------------------------------------------------------

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { socket } from '../services/socket';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import './Game.css';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface Player {
  id: string;
  name: string;
  score: number;
}

interface Question {
  id: string;
  text: string;
  choices: string[];
  durationSec: number;
}

interface GameData {
  index: number;
  total: number;
  endsAt: number;
  q: Question;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Game = () => {
  const { code } = useParams<{ code: string }>();
  const [gameState, setGameState] = useState<'lobby' | 'question' | 'reveal' | 'results' | 'ended'>('lobby');
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<GameData | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isHost, setIsHost] = useState(false);

  // Build the join URL for display and future QR code
  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/join?code=${code}`
    : '';

  useEffect(() => {
    // Server tells us our role when we connect to a game
    socket.on('game:role', (data: { role: 'host' | 'player' }) => {
      setIsHost(data.role === 'host');
      console.log('[Ladle] Assigned role:', data.role);
    });

    socket.on('lobby:update', (playerList: Player[]) => {
      setPlayers(playerList);
    });

    socket.on('game:question', (data: GameData) => {
      setGameState('question');
      setCurrentQuestion(data);
      setSelectedChoice(null);
      setHasAnswered(false);
      setCorrectAnswer(null);
      setTimeLeft(data.q.durationSec);
    });

    socket.on('game:question:end', (data: { correctIndex: number }) => {
      setCorrectAnswer(data.correctIndex);
      setGameState('reveal');
      // Auto-advance from reveal state after 3 seconds
      setTimeout(() => {
        setGameState('lobby');
      }, 3000);
    });

    socket.on('game:results', (data: LeaderboardEntry[]) => {
      setGameState('results');
      setLeaderboard(data);
    });

    socket.on('game:ended', () => {
      setGameState('ended');
    });

    socket.on('player:answer:ack', () => {
      setHasAnswered(true);
    });

    // Fallback: check URL param for backwards compatibility
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('host') === 'true') {
      setIsHost(true);
    }

    return () => {
      socket.off('game:role');
      socket.off('lobby:update');
      socket.off('game:question');
      socket.off('game:question:end');
      socket.off('game:results');
      socket.off('game:ended');
      socket.off('player:answer:ack');
    };
  }, []);

  // Countdown timer
  useEffect(() => {
    if (gameState === 'question' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [gameState, timeLeft]);

  function startGame() {
    console.log('[Ladle] Starting game:', code);
    socket.emit('host:start', { code });
  }

  function selectChoice(choiceIndex: number) {
    if (hasAnswered || timeLeft <= 0) return;
    setSelectedChoice(choiceIndex);
    socket.emit('player:answer', { code, choiceIndex });
  }

  function getChoiceClass(index: number): string {
    let cls = 'game-choice';
    if (selectedChoice === index) cls += ' selected';
    if (correctAnswer !== null) {
      if (index === correctAnswer) cls += ' correct';
      else if (selectedChoice === index) cls += ' incorrect';
    }
    return cls;
  }

  // -------- Ended State --------
  if (gameState === 'ended') {
    return (
      <div className="game-page">
        <div className="container game-container">
          <Card variant="elevated" padding="lg" className="game-card">
            <h2 className="game-heading">Game Over</h2>
            <p className="game-subheading">Thanks for playing!</p>
            {leaderboard.length > 0 && (
              <div className="leaderboard">
                <h3 className="leaderboard-title">Final Leaderboard</h3>
                {leaderboard.map((entry) => (
                  <div key={entry.rank} className="leaderboard-row">
                    <span className="leaderboard-rank">#{entry.rank}</span>
                    <span className="leaderboard-name">{entry.name}</span>
                    <span className="leaderboard-score">{entry.score} pts</span>
                  </div>
                ))}
              </div>
            )}
            <div className="game-actions">
              <Button variant="primary" size="lg" onClick={() => window.location.href = '/'}>
                Back to Home
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // -------- Results State --------
  if (gameState === 'results') {
    return (
      <div className="game-page">
        <div className="container game-container">
          <Card variant="elevated" padding="lg" className="game-card">
            <h2 className="game-heading">Final Results</h2>
            <div className="leaderboard">
              {leaderboard.map((entry) => (
                <div key={entry.rank} className={`leaderboard-row ${entry.rank <= 3 ? 'top-three' : ''}`}>
                  <span className="leaderboard-rank">#{entry.rank}</span>
                  <span className="leaderboard-name">{entry.name}</span>
                  <span className="leaderboard-score">{entry.score} pts</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // -------- Question State --------
  if ((gameState === 'question' || gameState === 'reveal') && currentQuestion) {
    return (
      <div className="game-page">
        <div className="container game-container">
          <Card variant="elevated" padding="lg" className="game-card game-card-wide">
            <div className="question-header">
              <span className="question-progress">
                Question {currentQuestion.index + 1} of {currentQuestion.total}
              </span>
              <span className={`question-timer ${timeLeft <= 5 ? 'timer-warning' : ''}`}>
                {timeLeft}s
              </span>
            </div>

            <h2 className="question-text">{currentQuestion.q.text}</h2>

            <div className="choices-grid">
              {currentQuestion.q.choices.map((choice, index) => (
                <button
                  key={index}
                  className={getChoiceClass(index)}
                  onClick={() => selectChoice(index)}
                  disabled={hasAnswered || timeLeft <= 0}
                >
                  <span className="choice-letter">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="choice-text">{choice}</span>
                </button>
              ))}
            </div>

            {hasAnswered && gameState === 'question' && (
              <p className="answer-submitted">Answer submitted. Waiting for results...</p>
            )}
          </Card>
        </div>
      </div>
    );
  }

  // -------- Lobby State --------
  return (
    <div className="game-page">
      <div className="container game-container">
        <Card variant="elevated" padding="lg" className="game-card">
          <h2 className="game-heading">Game Lobby</h2>

          {isHost && (
            <div className="host-badge">
              You are the Host
            </div>
          )}

          <div className="game-code-display">
            <span className="game-code-label">Game Code</span>
            <span className="game-code-value">{code}</span>
          </div>

          <p className="lobby-join-url">
            Players can join at: <strong>{joinUrl}</strong>
          </p>

          <div className="leaderboard">
            <h3 className="leaderboard-title">
              Players ({players.length})
            </h3>
            {players.length === 0 ? (
              <p className="lobby-waiting">
                No players have joined yet. Share the game code above.
              </p>
            ) : (
              players.map((player) => (
                <div key={player.id} className="leaderboard-row">
                  <span className="leaderboard-name">{player.name}</span>
                  <span className="leaderboard-score">{player.score} pts</span>
                </div>
              ))
            )}
          </div>

          {isHost && (
            <div className="game-actions">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={startGame}
                disabled={players.length === 0}
              >
                {players.length === 0 ? 'Waiting for Players...' : 'Start Quiz'}
              </Button>
              {players.length === 0 && (
                <p className="game-actions-hint">
                  At least 1 player must join before starting.
                </p>
              )}
              {players.length > 0 && (
                <p className="game-actions-hint">
                  Ready to start with {players.length} player{players.length !== 1 ? 's' : ''}.
                </p>
              )}
            </div>
          )}

          {!isHost && (
            <p className="lobby-waiting" style={{ marginTop: '1.5rem' }}>
              Waiting for the host to start the quiz...
            </p>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Game;
