// ---------------------------------------------------------------------------
// Demo Page
// Interactive showcase of PopPop! — shows the teacher "host" view on the
// left and a simulated student device view on the right. Visitors can tap
// answers on the student side to experience a live-quiz feel.
// ---------------------------------------------------------------------------

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './Demo.css';
import './Demo.css';

// ---- Demo quiz data --------------------------------------------------------
const DEMO_QUESTIONS = [
  {
    id: 0,
    question: 'What is the capital of California?',
    answers: ['Los Angeles', 'Sacramento', 'San Francisco', 'San Diego'],
    correctIndex: 1,
    emoji: '🏛️',
    timeLimit: 15,
  },
  {
    id: 1,
    question: 'Which planet is known as the Red Planet?',
    answers: ['Venus', 'Jupiter', 'Mars', 'Saturn'],
    correctIndex: 2,
    emoji: '🪐',
    timeLimit: 15,
  },
  {
    id: 2,
    question: 'How many sides does a hexagon have?',
    answers: ['5', '6', '7', '8'],
    correctIndex: 1,
    emoji: '🔷',
    timeLimit: 15,
  },
  {
    id: 3,
    question: 'What is 12 × 8?',
    answers: ['84', '96', '104', '88'],
    correctIndex: 1,
    emoji: '🔢',
    timeLimit: 15,
  },
];

const ANSWER_COLORS = ['#e74c3c', '#3498db', '#f39c12', '#2ecc71'];
const ANSWER_LABELS = ['A', 'B', 'C', 'D'];

// Fake player list for teacher view
const FAKE_PLAYERS = [
  { name: 'Alex 🦊', score: 0 },
  { name: 'Jordan 🐼', score: 0 },
  { name: 'Sam 🐸', score: 0 },
  { name: 'Riley 🦋', score: 0 },
  { name: 'Casey 🐻', score: 0 },
];

type Phase = 'lobby' | 'question' | 'reveal' | 'leaderboard' | 'end';

export default function Demo() {
  const [phase, setPhase] = useState<Phase>('lobby');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [studentAnswer, setStudentAnswer] = useState<number | null>(null);
  const [studentScore, setStudentScore] = useState(0);
  const [players, setPlayers] = useState(FAKE_PLAYERS.map(p => ({ ...p })));
  // track how many fake players have "answered" for teacher bar chart
  const [fakeAnswerCounts, setFakeAnswerCounts] = useState([0, 0, 0, 0]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const question = DEMO_QUESTIONS[questionIndex];
  const totalQuestions = DEMO_QUESTIONS.length;

  // ---------- helpers -------------------------------------------------------
  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const startTimer = (seconds: number) => {
    clearTimer();
    setTimeLeft(seconds);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearTimer();
          setPhase('reveal');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // simulate fake players trickling in answers
  const simulateFakeAnswers = () => {
    const counts = [0, 0, 0, 0];
    const q = DEMO_QUESTIONS[questionIndex];
    // bias toward correct answer
    FAKE_PLAYERS.forEach(() => {
      const pick = Math.random() < 0.6 ? q.correctIndex : Math.floor(Math.random() * 4);
      counts[pick]++;
    });
    setFakeAnswerCounts(counts);
  };

  // ---------- phase transitions ---------------------------------------------
  const handleStartQuiz = () => {
    setQuestionIndex(0);
    setStudentAnswer(null);
    setStudentScore(0);
    setPlayers(FAKE_PLAYERS.map(p => ({ ...p })));
    setPhase('question');
  };

  const handleStudentAnswer = (idx: number) => {
    if (studentAnswer !== null) return; // already answered
    setStudentAnswer(idx);
    clearTimer();
    setPhase('reveal');
  };

  // When phase becomes 'question', start things up
  useEffect(() => {
    if (phase === 'question') {
      setStudentAnswer(null);
      setFakeAnswerCounts([0, 0, 0, 0]);
      startTimer(question.timeLimit);
      // Stagger fake answers over 8s
      const timeouts: ReturnType<typeof setTimeout>[] = [];
      const delay = Math.random() * 8000 + 1000;
      timeouts.push(
        setTimeout(() => {
          simulateFakeAnswers();
        }, delay),
      );
      return () => {
        clearTimer();
        timeouts.forEach(t => clearTimeout(t));
      };
    }
  }, [phase, questionIndex]);

  // When phase becomes 'reveal', update scores
  useEffect(() => {
    if (phase === 'reveal') {
      clearTimer();
      const q = DEMO_QUESTIONS[questionIndex];
      // update student score
      if (studentAnswer === q.correctIndex) {
        const bonus = Math.max(0, timeLeft) * 5 + 100;
        setStudentScore(prev => prev + bonus);
      }
      // update fake player scores
      setPlayers(prev =>
        prev.map(p => {
          const isCorrect = Math.random() < 0.6;
          return isCorrect ? { ...p, score: p.score + Math.floor(Math.random() * 200 + 100) } : p;
        }),
      );
    }
  }, [phase]);

  const handleNext = () => {
    if (questionIndex + 1 < totalQuestions) {
      setQuestionIndex(prev => prev + 1);
      setPhase('question');
    } else {
      setPhase('end');
    }
  };

  // Sort leaderboard
  const leaderboard = [...players, { name: 'You 🌟', score: studentScore }].sort(
    (a, b) => b.score - a.score,
  );

  const timerPct = (timeLeft / question.timeLimit) * 100;

  // ---------- render --------------------------------------------------------
  return (
    <div className="demo-page">
      {/* Header */}
      <div className="demo-header">
        <Link to="/" className="demo-back">
          ← Back to PopPop!
        </Link>
        <div className="demo-header-title">
          <span className="demo-logo">🎉 PopPop!</span>
          <span className="demo-badge">Live Demo</span>
        </div>
        <div className="demo-header-hint">
          This is how PopPop! works in a real classroom
        </div>
      </div>

      {/* Split layout */}
      <div className="demo-split">
        {/* ---- LEFT: Teacher / Monitor view ---- */}
        <div className="demo-panel demo-panel-teacher">
          <div className="demo-panel-label teacher-label">
            🖥️ Teacher's Screen (projected in class)
          </div>

          {phase === 'lobby' && (
            <div className="demo-teacher-lobby">
              <h2 className="demo-quiz-title">🎉 PopPop! Demo Quiz</h2>
              <p className="demo-quiz-subtitle">{totalQuestions} Questions · General Knowledge</p>
              <div className="demo-join-code-box">
                <span className="demo-join-code-label">Game Code</span>
                <span className="demo-join-code">DEMO42</span>
                <span className="demo-join-hint">Students enter this at poppop.app/join</span>
              </div>
              <div className="demo-player-chips">
                {players.map(p => (
                  <span key={p.name} className="demo-player-chip">{p.name}</span>
                ))}
                <span className="demo-player-chip chip-you">You 🌟</span>
              </div>
              <p className="demo-waiting">{players.length + 1} players joined and waiting…</p>
              <button className="demo-start-btn" onClick={handleStartQuiz}>
                ▶ Start Quiz
              </button>
            </div>
          )}

          {(phase === 'question' || phase === 'reveal') && (
            <div className="demo-teacher-question">
              <div className="demo-q-header">
                <span className="demo-q-num">Q{questionIndex + 1}/{totalQuestions}</span>
                {phase === 'question' && (
                  <div className="demo-timer-ring" style={{ '--pct': timerPct } as React.CSSProperties}>
                    <span className="demo-timer-num">{timeLeft}</span>
                  </div>
                )}
                {phase === 'reveal' && <span className="demo-time-up">⏱ Time's up!</span>}
              </div>

              <div className="demo-question-text">
                <span className="demo-q-emoji">{question.emoji}</span>
                {question.question}
              </div>

              {/* Answer bar chart (teacher sees distribution) */}
              <div className="demo-answer-bars">
                {question.answers.map((ans, i) => {
                  const total = fakeAnswerCounts.reduce((a, b) => a + b, 0) || 1;
                  const pct = Math.round((fakeAnswerCounts[i] / total) * 100);
                  const isCorrect = i === question.correctIndex;
                  return (
                    <div key={i} className="demo-bar-row">
                      <span
                        className="demo-bar-label"
                        style={{ background: ANSWER_COLORS[i] }}
                      >
                        {ANSWER_LABELS[i]}
                      </span>
                      <div className="demo-bar-track">
                        <div
                          className={`demo-bar-fill ${phase === 'reveal' && isCorrect ? 'bar-correct' : ''}`}
                          style={{ width: `${pct}%`, background: ANSWER_COLORS[i] }}
                        />
                      </div>
                      <span className="demo-bar-ans">{ans}</span>
                      {phase === 'reveal' && isCorrect && <span className="demo-check">✓</span>}
                    </div>
                  );
                })}
              </div>

              {phase === 'reveal' && (
                <div className="demo-reveal-footer">
                  <p className="demo-correct-ans">
                    ✅ Correct answer: <strong>{question.answers[question.correctIndex]}</strong>
                  </p>
                  <button className="demo-next-btn" onClick={handleNext}>
                    {questionIndex + 1 < totalQuestions ? 'Next Question →' : 'See Final Results →'}
                  </button>
                </div>
              )}
            </div>
          )}

          {phase === 'end' && (
            <div className="demo-teacher-end">
              <h2 className="demo-end-title">🏆 Final Leaderboard</h2>
              <div className="demo-leaderboard">
                {leaderboard.map((p, i) => (
                  <div
                    key={p.name}
                    className={`demo-lb-row ${p.name === 'You 🌟' ? 'lb-you' : ''}`}
                  >
                    <span className="demo-lb-rank">{i + 1}</span>
                    <span className="demo-lb-name">{p.name}</span>
                    <span className="demo-lb-score">{p.score.toLocaleString()} pts</span>
                  </div>
                ))}
              </div>
              <div className="demo-end-cta">
                <p>Ready to run real pop quizzes?</p>
                <Link to="/register" className="demo-signup-btn">
                  🚀 Create Free Account
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ---- RIGHT: Student device view ---- */}
        <div className="demo-panel demo-panel-student">
          <div className="demo-panel-label student-label">
            📱 Student's Phone (each student sees this)
          </div>

          <div className="demo-phone-frame">
            <div className="demo-phone-inner">

              {phase === 'lobby' && (
                <div className="student-lobby">
                  <div className="student-app-logo">🎉</div>
                  <h3 className="student-lobby-title">PopPop!</h3>
                  <div className="student-joined-badge">✅ Joined!</div>
                  <p className="student-name-display">You 🌟</p>
                  <p className="student-waiting-msg">Waiting for teacher<br />to start the quiz…</p>
                  <div className="student-waiting-dots">
                    <span /><span /><span />
                  </div>
                </div>
              )}

              {phase === 'question' && (
                <div className="student-question">
                  <div className="student-q-meta">
                    <span className="student-q-num">Q{questionIndex + 1}/{totalQuestions}</span>
                    <div
                      className="student-timer-bar"
                      style={{ width: `${timerPct}%`, background: timerPct > 40 ? '#2ecc71' : timerPct > 20 ? '#f39c12' : '#e74c3c' }}
                    />
                  </div>
                  <p className="student-question-text">
                    <span className="student-q-emoji">{question.emoji}</span>
                    {question.question}
                  </p>
                  <div className="student-answers">
                    {question.answers.map((ans, i) => (
                      <button
                        key={i}
                        className="student-answer-btn"
                        style={{ background: ANSWER_COLORS[i] }}
                        onClick={() => handleStudentAnswer(i)}
                      >
                        <span className="student-ans-label">{ANSWER_LABELS[i]}</span>
                        <span className="student-ans-text">{ans}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {phase === 'reveal' && (
                <div className="student-reveal">
                  {studentAnswer === question.correctIndex ? (
                    <>
                      <div className="student-result-icon correct-icon">🎉</div>
                      <p className="student-result-text correct-text">Correct!</p>
                      <p className="student-result-pts">+{Math.max(0, timeLeft) * 5 + 100} pts</p>
                    </>
                  ) : (
                    <>
                      <div className="student-result-icon wrong-icon">😬</div>
                      <p className="student-result-text wrong-text">Not quite!</p>
                      <p className="student-result-correct">
                        Answer: <strong>{question.answers[question.correctIndex]}</strong>
                      </p>
                    </>
                  )}
                  <p className="student-total-score">Total: {studentScore.toLocaleString()} pts</p>
                  <p className="student-waiting-next">⏳ Waiting for next question…</p>
                </div>
              )}

              {phase === 'end' && (
                <div className="student-end">
                  <div className="student-end-icon">🏅</div>
                  <p className="student-end-label">Quiz Complete!</p>
                  <p className="student-final-score">{studentScore.toLocaleString()} pts</p>
                  <p className="student-rank">
                    Rank: #{leaderboard.findIndex(p => p.name === 'You 🌟') + 1} of {leaderboard.length}
                  </p>
                  <Link to="/register" className="student-signup-link">
                    Play more →
                  </Link>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA banner */}
      <div className="demo-bottom-cta">
        <p className="demo-cta-text">
          🎓 Ready to run a real PopPop! quiz with your class?
        </p>
        <div className="demo-cta-btns">
          <Link to="/register" className="demo-cta-primary">Create Free Account</Link>
          <Link to="/" className="demo-cta-secondary">Learn More</Link>
        </div>
      </div>
    </div>
  );
}
