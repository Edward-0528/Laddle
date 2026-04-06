// ---------------------------------------------------------------------------
// Game Page
// Full Kahoot-style game experience with speed-based scoring, streak bonuses,
// animated countdown timer, fullscreen animated reveal between questions,
// rank deltas, live leaderboard, and an animated final podium.
// Host is spectator-only: sees question + live answer counts + leaderboard.
// Players see the question and answer choices only.
// ---------------------------------------------------------------------------

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { socket } from '../services/socket';
import { QRCodeSVG } from 'qrcode.react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import './Game.css';

// ---------------------------------------------------------------------------
// Types
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

interface RankedPlayer {
  rank: number;
  name: string;
  score: number;
  pointsEarned: number;
  streak: number;
  rankDelta: number;
}

interface QuestionResult {
  correctIndex: number;
  answerCounts: number[];
  leaderboard: RankedPlayer[];
}

// ---------------------------------------------------------------------------
// Choice color theme (Kahoot-style: red, blue, yellow, green)
// ---------------------------------------------------------------------------

const CHOICE_COLORS = [
  { base: '#E53E3E', light: 'rgba(229, 62, 62, 0.15)', label: 'A' },
  { base: '#3182CE', light: 'rgba(49, 130, 206, 0.15)', label: 'B' },
  { base: '#D69E2E', light: 'rgba(214, 158, 46, 0.15)', label: 'C' },
  { base: '#38A169', light: 'rgba(56, 161, 105, 0.15)', label: 'D' },
];

// ---------------------------------------------------------------------------
// Reveal sub-screens
// ---------------------------------------------------------------------------
type RevealPhase = 'correct' | 'scores' | 'leaderboard';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Game = () => {
  const { code } = useParams<{ code: string }>();
  const [gameState, setGameState] = useState<'lobby' | 'question' | 'reveal' | 'results' | 'ended'>('lobby');
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<GameData | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [questionResult, setQuestionResult] = useState<QuestionResult | null>(null);
  const [leaderboard, setLeaderboard] = useState<RankedPlayer[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [questionTransition, setQuestionTransition] = useState(false);
  // Live answer counts visible to host during a question
  const [answerCount, setAnswerCount] = useState(0);
  // Animated reveal sub-phase
  const [revealPhase, setRevealPhase] = useState<RevealPhase>('correct');
  // Tracks which player scores are being animated
  const [animatedScores, setAnimatedScores] = useState<Record<string, number>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/join?code=${code}`
    : '';

  useEffect(() => {
    socket.on('game:role', (data: { role: 'host' | 'player' }) => {
      setIsHost(data.role === 'host');
    });

    socket.on('lobby:update', (playerList: Player[]) => {
      setPlayers(playerList);
    });

    socket.on('game:question', (data: GameData) => {
      setQuestionTransition(true);
      // Reset live answer count for host
      setAnswerCount(0);
      setTimeout(() => {
        setGameState('question');
        setCurrentQuestion(data);
        setSelectedChoice(null);
        setHasAnswered(false);
        setQuestionResult(null);
        setRevealPhase('correct');
        setTimeLeft(data.q.durationSec);
        setTotalTime(data.q.durationSec);
        setQuestionTransition(false);
      }, 400);
    });

    socket.on('game:answer:count', (count: number) => {
      setAnswerCount(count);
    });

    socket.on('game:question:end', (result: QuestionResult) => {
      setQuestionResult(result);
      setLeaderboard(result.leaderboard);
      setGameState('reveal');
      setTimeLeft(0);
      setRevealPhase('correct');

      // Phase 1: show correct answer + bars (2s)
      // Phase 2: animate point gains (3s)
      // Phase 3: show updated leaderboard (stays until next question starts)
      revealTimerRef.current = setTimeout(() => {
        setRevealPhase('scores');
        // Build starting scores (pre-points) for animation
        const preScores: Record<string, number> = {};
        result.leaderboard.forEach(p => {
          preScores[p.name] = p.score - p.pointsEarned;
        });
        setAnimatedScores(preScores);

        // After a beat, animate scores counting up
        setTimeout(() => {
          const finalScores: Record<string, number> = {};
          result.leaderboard.forEach(p => { finalScores[p.name] = p.score; });
          setAnimatedScores(finalScores);
        }, 300);

        // Phase 3: leaderboard
        revealTimerRef.current = setTimeout(() => {
          setRevealPhase('leaderboard');
        }, 2500);
      }, 2000);
    });

    socket.on('game:results', (data: RankedPlayer[]) => {
      setLeaderboard(data);
      setGameState('results');
    });

    socket.on('game:ended', () => {
      setGameState('ended');
    });

    socket.on('player:answer:ack', () => {
      setHasAnswered(true);
    });

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('host') === 'true') setIsHost(true);

    if (code) {
      socket.emit('lobby:request', { code });
    }

    return () => {
      socket.off('game:role');
      socket.off('lobby:update');
      socket.off('game:question');
      socket.off('game:question:end');
      socket.off('game:answer:count');
      socket.off('game:results');
      socket.off('game:ended');
      socket.off('player:answer:ack');
      if (timerRef.current) clearTimeout(timerRef.current);
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    };
  }, []);

  // Countdown timer
  useEffect(() => {
    if (gameState === 'question' && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }
  }, [gameState, timeLeft]);

  function startGame() {
    socket.emit('host:start', { code });
  }

  function selectChoice(choiceIndex: number) {
    if (isHost || hasAnswered || timeLeft <= 0 || gameState !== 'question') return;
    setSelectedChoice(choiceIndex);
    socket.emit('player:answer', { code, choiceIndex });
  }

  // ---------------------------------------------------------------------------
  // Timer helpers
  // ---------------------------------------------------------------------------

  const timerPercent = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;
  const timerColor = timeLeft > 10 ? 'var(--color-success)' : timeLeft > 5 ? 'var(--color-warning)' : 'var(--color-error)';

  // ---------------------------------------------------------------------------
  // Choice state helpers
  // ---------------------------------------------------------------------------

  function getChoiceState(index: number): 'default' | 'selected' | 'correct' | 'incorrect' | 'unselected' {
    if (questionResult === null) {
      return selectedChoice === index ? 'selected' : 'default';
    }
    if (index === questionResult.correctIndex) return 'correct';
    if (selectedChoice === index) return 'incorrect';
    return 'unselected';
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  function renderStreakBadge(streak: number) {
    if (streak < 2) return null;
    return <span className="streak-badge">{streak}x streak</span>;
  }

  function renderRankDelta(delta: number) {
    if (delta === 0) return <span className="rank-delta rank-delta-same">--</span>;
    if (delta > 0) return <span className="rank-delta rank-delta-up">+{delta}</span>;
    return <span className="rank-delta rank-delta-down">{delta}</span>;
  }

  // ---------------------------------------------------------------------------
  // Ended / Results state — final podium
  // ---------------------------------------------------------------------------

  if (gameState === 'ended' || gameState === 'results') {
    const top3 = leaderboard.slice(0, 3);
    const rest = leaderboard.slice(3);
    const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);

    return (
      <div className="game-page game-page-dark">
        <div className="container">
          <div className="podium-screen">
            <h1 className="podium-title">Final Results</h1>
            <div className="podium-stage">
              {podiumOrder.map((entry) => (
                <div key={entry.rank} className={`podium-column podium-rank-${entry.rank}`}>
                  <div className="podium-avatar">{entry.name.charAt(0).toUpperCase()}</div>
                  <div className="podium-name">{entry.name}</div>
                  <div className="podium-score">{entry.score.toLocaleString()} pts</div>
                  <div className={`podium-block podium-block-${entry.rank}`}>
                    <span className="podium-medal">
                      {entry.rank === 1 ? '1st' : entry.rank === 2 ? '2nd' : '3rd'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {rest.length > 0 && (
              <div className="podium-rest">
                {rest.map((entry) => (
                  <div key={entry.rank} className="podium-rest-row">
                    <span className="podium-rest-rank">#{entry.rank}</span>
                    <span className="podium-rest-name">{entry.name}</span>
                    <span className="podium-rest-score">{entry.score.toLocaleString()} pts</span>
                  </div>
                ))}
              </div>
            )}
            <div className="podium-actions">
              <Button variant="primary" size="lg" onClick={() => window.location.href = '/'}>
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Reveal state — fullscreen animated between-question screen
  // ---------------------------------------------------------------------------

  if (gameState === 'reveal' && currentQuestion && questionResult) {
    const totalAnswers = questionResult.answerCounts.reduce((a, b) => a + b, 0);

    return (
      <div className="game-page game-page-dark reveal-fullscreen">
        <div className={`reveal-phase-wrapper reveal-phase-${revealPhase}`}>

          {/* ---- Phase: correct answer ---- */}
          {revealPhase === 'correct' && (
            <div className="reveal-correct-phase">
              <p className="reveal-phase-label">Question {(currentQuestion.index + 1)} of {currentQuestion.total}</p>
              <div className="reveal-question-banner">{currentQuestion.q.text}</div>
              <div className="reveal-choices-grid">
                {currentQuestion.q.choices.map((choice, index) => {
                  const count = questionResult.answerCounts[index] || 0;
                  const pct = totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0;
                  const isCorrect = index === questionResult.correctIndex;
                  const color = CHOICE_COLORS[index % CHOICE_COLORS.length];
                  return (
                    <div
                      key={index}
                      className={`reveal-choice-card ${isCorrect ? 'reveal-choice-card-correct' : 'reveal-choice-card-wrong'}`}
                      style={{ '--choice-color': color.base } as React.CSSProperties}
                    >
                      <div className="reveal-choice-card-header">
                        <span className="reveal-choice-badge" style={{ background: color.base }}>{color.label}</span>
                        <span className="reveal-choice-card-text">{choice}</span>
                        {isCorrect && <span className="reveal-correct-checkmark">✓</span>}
                      </div>
                      <div className="reveal-bar-track">
                        <div
                          className="reveal-bar-fill"
                          style={{ width: `${pct}%`, background: isCorrect ? '#48BB78' : color.base }}
                        />
                      </div>
                      <div className="reveal-bar-label">{count} {count === 1 ? 'player' : 'players'} · {pct}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ---- Phase: score gains (big numbers flying up) ---- */}
          {revealPhase === 'scores' && (
            <div className="reveal-scores-phase">
              <p className="reveal-phase-label">Points Earned</p>
              <div className="reveal-score-list">
                {questionResult.leaderboard.map((entry, i) => (
                  <div
                    key={entry.name}
                    className="reveal-score-row"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <span className="reveal-score-rank">#{entry.rank}</span>
                    <span className="reveal-score-name">{entry.name}</span>
                    {entry.pointsEarned > 0 && (
                      <span className="reveal-score-points-earned points-pop">
                        +{entry.pointsEarned}
                      </span>
                    )}
                    {entry.streak >= 2 && renderStreakBadge(entry.streak)}
                    <span className="reveal-score-total">
                      {(animatedScores[entry.name] ?? entry.score).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ---- Phase: leaderboard with rank movement ---- */}
          {revealPhase === 'leaderboard' && (
            <div className="reveal-leaderboard-phase">
              <p className="reveal-phase-label">Leaderboard</p>
              <div className="reveal-lb-list">
                {leaderboard.slice(0, 8).map((entry, i) => (
                  <div
                    key={entry.name}
                    className={`reveal-lb-row ${entry.rank === 1 ? 'reveal-lb-first' : ''}`}
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <span className={`reveal-lb-rank ${entry.rankDelta > 0 ? 'rank-moved-up' : entry.rankDelta < 0 ? 'rank-moved-down' : ''}`}>
                      #{entry.rank}
                    </span>
                    <span className="reveal-lb-name">{entry.name}</span>
                    {renderStreakBadge(entry.streak)}
                    {renderRankDelta(entry.rankDelta)}
                    <span className="reveal-lb-score">{entry.score.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <p className="reveal-next-hint">Next question coming up...</p>
            </div>
          )}

        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Question state — HOST view (spectator: see question + live answer count + choices displayed)
  // ---------------------------------------------------------------------------

  if (gameState === 'question' && currentQuestion && isHost) {
    const playerCount = players.length;
    const pct = playerCount > 0 ? Math.round((answerCount / playerCount) * 100) : 0;

    return (
      <div className="game-page game-page-dark">
        <div className="container game-container">
          <div className={`game-question-screen ${questionTransition ? 'game-transition-out' : 'game-transition-in'}`}>

            <div className="question-top-bar">
              <span className="question-progress">
                Q{currentQuestion.index + 1} / {currentQuestion.total}
              </span>
              <div className="timer-container">
                <svg className="timer-ring" viewBox="0 0 44 44">
                  <circle className="timer-ring-bg" cx="22" cy="22" r="18" />
                  <circle
                    className="timer-ring-fill"
                    cx="22" cy="22" r="18"
                    style={{ stroke: timerColor, strokeDashoffset: `${(1 - timerPercent / 100) * 113}px` }}
                  />
                </svg>
                <span className={`timer-number ${timeLeft <= 5 ? 'timer-urgent' : ''}`} style={{ color: timerColor }}>
                  {timeLeft}
                </span>
              </div>
            </div>

            <div className="question-text-box">
              <h2 className="question-text">{currentQuestion.q.text}</h2>
            </div>

            {/* Host sees choices as display tiles, not buttons */}
            <div className="choices-grid host-choices">
              {currentQuestion.q.choices.map((choice, index) => {
                const color = CHOICE_COLORS[index % CHOICE_COLORS.length];
                return (
                  <div
                    key={index}
                    className="game-choice game-choice-host"
                    style={{ borderColor: color.base, background: color.light }}
                  >
                    <span className="choice-letter" style={{ background: color.base }}>{color.label}</span>
                    <span className="choice-text">{choice}</span>
                  </div>
                );
              })}
            </div>

            {/* Live answer progress bar */}
            <div className="host-answer-tracker">
              <div className="hat-bar-row">
                <span className="hat-label">{answerCount} / {playerCount} answered</span>
                <span className="hat-pct">{pct}%</span>
              </div>
              <div className="hat-bar-track">
                <div className="hat-bar-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Question state — PLAYER view
  // ---------------------------------------------------------------------------

  if (gameState === 'question' && currentQuestion) {
    return (
      <div className="game-page">
        <div className="container game-container">
          <div className={`game-question-screen ${questionTransition ? 'game-transition-out' : 'game-transition-in'}`}>

            <div className="question-top-bar">
              <span className="question-progress">
                {currentQuestion.index + 1} / {currentQuestion.total}
              </span>
              <div className="timer-container">
                <svg className="timer-ring" viewBox="0 0 44 44">
                  <circle className="timer-ring-bg" cx="22" cy="22" r="18" />
                  <circle
                    className="timer-ring-fill"
                    cx="22" cy="22" r="18"
                    style={{ stroke: timerColor, strokeDashoffset: `${(1 - timerPercent / 100) * 113}px` }}
                  />
                </svg>
                <span className={`timer-number ${timeLeft <= 5 ? 'timer-urgent' : ''}`} style={{ color: timerColor }}>
                  {timeLeft}
                </span>
              </div>
            </div>

            <div className="question-text-box">
              <h2 className="question-text">{currentQuestion.q.text}</h2>
            </div>

            <div className="choices-grid">
              {currentQuestion.q.choices.map((choice, index) => {
                const color = CHOICE_COLORS[index % CHOICE_COLORS.length];
                const state = getChoiceState(index);
                return (
                  <button
                    key={index}
                    className={`game-choice game-choice-${state}`}
                    style={{
                      borderColor: state === 'default' ? color.base : undefined,
                      background: state === 'selected' ? color.light : undefined,
                    }}
                    onClick={() => selectChoice(index)}
                    disabled={hasAnswered || timeLeft <= 0}
                  >
                    <span className="choice-letter" style={{ background: color.base }}>{color.label}</span>
                    <span className="choice-text">{choice}</span>
                  </button>
                );
              })}
            </div>

            {hasAnswered && (
              <div className="answer-submitted-banner">
                Answer locked in — waiting for results...
              </div>
            )}
            {timeLeft <= 0 && !hasAnswered && (
              <div className="time-up-banner">Time is up!</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Lobby state
  // ---------------------------------------------------------------------------

  return (
    <div className="game-page">
      <div className="container game-container">
        <Card variant="elevated" padding="lg" className="game-card game-card-wide">
          <h2 className="game-heading">Game Lobby</h2>
          {isHost && <div className="host-badge">You are the Host</div>}

          <div className="lobby-layout">
            {/* ---- Left: QR + code ---- */}
            <div className="lobby-join-panel">
              <p className="lobby-join-panel-label">Scan to join</p>
              <div className="lobby-qr-wrapper">
                <QRCodeSVG value={joinUrl} size={180} bgColor="#ffffff" fgColor="#1a0a3e" level="M" />
              </div>
              <p className="lobby-or">or go to</p>
              <p className="lobby-join-domain">
                {typeof window !== 'undefined' ? window.location.origin : ''}/join
              </p>
              <div className="game-code-display">
                <span className="game-code-label">Game Code</span>
                <span className="game-code-value">{code}</span>
              </div>
            </div>

            {/* ---- Right: player list + actions ---- */}
            <div className="lobby-players-panel">
              <div className="leaderboard">
                <h3 className="leaderboard-title">Players ({players.length})</h3>
                {players.length === 0 ? (
                  <p className="lobby-waiting">Waiting for players to join...</p>
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
                    {players.length === 0
                      ? 'Waiting for Players...'
                      : `Start Quiz (${players.length} player${players.length !== 1 ? 's' : ''})`}
                  </Button>
                  {players.length === 0 && (
                    <p className="game-actions-hint">At least 1 player must join before starting.</p>
                  )}
                </div>
              )}

              {!isHost && (
                <p className="lobby-waiting" style={{ marginTop: '1.5rem' }}>
                  Waiting for the host to start the quiz...
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Game;
