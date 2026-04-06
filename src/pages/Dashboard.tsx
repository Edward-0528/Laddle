// ---------------------------------------------------------------------------
// Dashboard Page
// Displays the authenticated user's saved quizzes in a grid layout.
// Provides actions to create, edit, delete, and launch quizzes.
// ---------------------------------------------------------------------------

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserQuizzes, deleteQuiz } from '../services/quizzes';
import { socket } from '../services/socket';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import type { Quiz } from '../types/quiz';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [launchingId, setLaunchingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadQuizzes();
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

    const questions = quiz.questions.map((q) => ({
      text: q.text,
      choices: q.choices,
      answerIndex: q.correctAnswerIndex,
      durationSec: quiz.settings?.questionDuration ?? 20,
    }));

    function doEmit() {
      socket.emit(
        'host:create',
        { questions },
        (response: { code?: string; error?: string }) => {
          setLaunchingId(null);
          if (response.error || !response.code) {
            setError(response.error ?? 'Failed to create game. Please try again.');
            return;
          }
          console.log('[Ladle] Game created with code:', response.code);
          navigate(`/game/${response.code}?host=true`);
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
      </div>
    </div>
  );
};

export default Dashboard;
