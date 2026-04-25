// ---------------------------------------------------------------------------
// Dashboard Page
// Displays the authenticated user's saved quizzes in a grid layout.
// Provides actions to create, edit, delete, and launch quizzes.
// ---------------------------------------------------------------------------

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserQuizzes, deleteQuiz } from '../services/quizzes';
import { getRecentGames } from '../services/gameResults';
import { socket } from '../services/socket';
import { QRCodeSVG } from 'qrcode.react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import type { Quiz } from '../types/quiz';
import type { GameResult } from '../types/gameResult';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const [recentGames, setRecentGames] = useState<GameResult[]>([]);
  /** Non-null while the Quick Launch modal is open; holds the game code + join URL */
  const [quickLaunch, setQuickLaunch] = useState<{ code: string; joinUrl: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    loadQuizzes();
    getRecentGames(user.uid, 5).then(setRecentGames).catch(() => {});
  }, [user]);

  async function loadQuizzes() {
    if (!user) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await getUserQuizzes(user.uid);
      setQuizzes(data);
    } catch (err) {
      console.error('[Ladle] Failed to load quizzes:', err);
      setError('Failed to load your quizzes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(quizId: string) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this quiz? This action cannot be undone.'
    );
    if (!confirmed) return;

    setDeletingId(quizId);
    try {
      await deleteQuiz(quizId);
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
    } catch (err) {
      console.error('[Ladle] Failed to delete quiz:', err);
      setError('Failed to delete quiz. Please try again.');
    } finally {
      setDeletingId(null);
    }
  }

  function handleLaunch(quiz: Quiz) {
    setLaunchingId(quiz.id);
    setError('');

    const questions = quiz.questions.map((q, i) => ({
      id: q.id || `q${i + 1}`,
      text: q.text,
      choices: q.choices,
      answerIndex: q.correctAnswerIndex,
      durationSec: quiz.settings?.questionDuration ?? 20,
    }));

    function doEmit() {
      socket.emit(
        'host:create',
        { questions, quizTitle: quiz.title },
        (response: { code?: string; error?: string }) => {
          setLaunchingId(null);
          if (response.error || !response.code) {
            setError(response.error ?? 'Failed to create game. Please try again.');
            return;
          }
          const joinUrl = `${window.location.origin}/join?code=${response.code}`;
          setQuickLaunch({ code: response.code, joinUrl });
        }
      );
    }

    if (socket.connected) {
      doEmit();
    } else {
      // Server is waking up — wait for connection then emit automatically
      socket.connect();
      socket.once('connect', doEmit);
      // If it doesn't connect within 30 s, surface a real error
      const timeout = setTimeout(() => {
        socket.off('connect', doEmit);
        setLaunchingId(null);
        setError('Could not reach the game server. Please check your connection and try again.');
      }, 30000);
      socket.once('connect', () => clearTimeout(timeout));
    }
  }

  if (isLoading) {
    return (
      <div className="dashboard">
        <div className="container">
          <div className="dashboard-loading">
            <div className="loading-spinner" />
            <p>Loading your quizzes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="container">

        {/* ---- Quick Launch Modal ---- */}
        {quickLaunch && (
          <div className="ql-overlay" onClick={() => setQuickLaunch(null)}>
            <div className="ql-modal" onClick={(e) => e.stopPropagation()}>
              <h2 className="ql-title">Game Ready!</h2>
              <p className="ql-sub">Share the code or QR with your players, then open your host view.</p>
              <div className="ql-qr-wrap">
                <QRCodeSVG value={quickLaunch.joinUrl} size={160} bgColor="#ffffff" fgColor="#1a0a3c" level="M" />
              </div>
              <div className="ql-code-display">
                <span className="ql-code-label">Game Code</span>
                <span className="ql-code-value">{quickLaunch.code}</span>
              </div>
              <p className="ql-domain">{window.location.origin}/join</p>
              <div className="ql-actions">
                <Button variant="ghost" size="sm" onClick={() => setQuickLaunch(null)}>Cancel</Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => {
                    setQuickLaunch(null);
                    navigate(`/game/${quickLaunch.code}?host=true`);
                  }}
                >
                  Enter Host View
                </Button>
              </div>
            </div>
          </div>
        )}
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">My Quizzes</h1>
            <p className="dashboard-subtitle">
              {quizzes.length === 0
                ? 'You have not created any quizzes yet.'
                : `${quizzes.length} quiz${quizzes.length !== 1 ? 'zes' : ''} in your library`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Link to="/library">
              <Button variant="secondary" size="md">
                Browse Library
              </Button>
            </Link>
            <Link to="/create">
              <Button variant="primary" size="md">
                Create New Quiz
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <div className="dashboard-error">
            <p>{error}</p>
            <Button variant="ghost" size="sm" onClick={() => setError('')}>
              Dismiss
            </Button>
          </div>
        )}

        {launchingId && !error && (
          <div className="dashboard-info">
            <p>Connecting to game server — this may take up to 30 seconds if the server is waking up...</p>
          </div>
        )}

        {quizzes.length === 0 && !error ? (
          <div className="dashboard-empty">
            <div className="empty-icon">Q</div>
            <h2>No Quizzes Yet</h2>
            <p>Create your first quiz and start hosting interactive sessions.</p>
            <Link to="/create">
              <Button variant="primary" size="lg">
                Create Your First Quiz
              </Button>
            </Link>
          </div>
        ) : (
          <div className="dashboard-grid">
            {quizzes.map((quiz) => (
              <Card key={quiz.id} variant="default" padding="md" className="quiz-card">
                <div className="quiz-card-header">
                  <span className="quiz-card-category">{quiz.category}</span>
                  {quiz.isPublic && <span className="quiz-card-badge">Public</span>}
                  {(quiz as any).forkedFrom && (
                    <span className="quiz-card-badge" style={{ background: 'var(--color-primary-bg)', color: 'var(--color-primary)' }}>
                      From Library
                    </span>
                  )}
                </div>
                <h3 className="quiz-card-title">{quiz.title}</h3>
                <p className="quiz-card-desc">
                  {quiz.description || 'No description provided.'}
                </p>
                <div className="quiz-card-meta">
                  <span>{quiz.questions.length} questions</span>
                  <span>Played {quiz.stats.timesPlayed} times</span>
                </div>
                <div className="quiz-card-actions">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleLaunch(quiz)}
                    isLoading={launchingId === quiz.id}
                  >
                    Launch
                  </Button>
                  <Link to={`/create?edit=${quiz.id}`}>
                    <Button variant="secondary" size="sm">
                      Edit
                    </Button>
                  </Link>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(quiz.id)}
                    isLoading={deletingId === quiz.id}
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ---- Recent Games ---- */}
        {recentGames.length > 0 && (
          <section className="recent-games-section">
            <h2 className="recent-games-heading">Recent Games</h2>
            <div className="recent-games-list">
              {recentGames.map((g) => (
                <div key={g.id} className="recent-game-row">
                  <div className="recent-game-info">
                    <span className="recent-game-title">{g.quizTitle}</span>
                    <span className="recent-game-meta">
                      {new Date(g.playedAt).toLocaleDateString()} · {g.playerCount} player{g.playerCount !== 1 ? 's' : ''} · Code: {g.gameCode}
                    </span>
                  </div>
                  <Link to={`/results/${g.id}`} className="recent-game-link">View Report →</Link>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
