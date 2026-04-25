// ---------------------------------------------------------------------------
// Student Dashboard Page
// Shows a logged-in student's game history, stats, and streaks.
// ---------------------------------------------------------------------------

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getStudentProgress } from '../services/studentProgress';
import type { StudentProgressEntry } from '../types/studentProgress';
import Button from '../components/ui/Button';
import './StudentDashboard.css';

function formatDate(epochMs: number): string {
  return new Date(epochMs).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function rankLabel(rank: number, total: number): string {
  if (rank === 1) return '1st';
  if (rank === 2) return '2nd';
  if (rank === 3) return '3rd';
  if (total === 0) return '—';
  const pct = Math.round(((total - rank) / total) * 100);
  return `Top ${100 - pct}%`;
}

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();

  const { data: entries = [], isLoading } = useQuery<StudentProgressEntry[]>({
    queryKey: ['studentProgress', user?.uid],
    queryFn: () => getStudentProgress(user!.uid),
    enabled: !!user,
  });

  // Derived stats
  const stats = useMemo(() => {
    if (entries.length === 0) return null;
    const avgScore = Math.round(entries.reduce((sum, e) => sum + e.score, 0) / entries.length);
    const wins = entries.filter((e) => e.rank === 1).length;
    const bestScore = Math.max(...entries.map((e) => e.score));

    // Current streak: consecutive sessions where rank is in top 3
    let streak = 0;
    for (const e of entries) {
      if (e.rank <= 3) streak++;
      else break;
    }

    // Accuracy approximation: % of sessions where player ranked in top half
    const topHalf = entries.filter((e) => e.rank <= Math.ceil(e.totalPlayers / 2)).length;
    const topHalfPct = Math.round((topHalf / entries.length) * 100);

    return { avgScore, wins, bestScore, streak, topHalfPct, total: entries.length };
  }, [entries]);

  if (!user) {
    return (
      <div className="sd-page">
        <div className="container sd-container">
          <div className="sd-unauthenticated">
            <h1>Your Progress Dashboard</h1>
            <p>Sign in to track your quiz scores, streaks, and history.</p>
            <Link to="/login"><Button variant="primary" size="lg">Sign In</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sd-page">
      <div className="container sd-container">

        {/* Header */}
        <div className="sd-header">
          <div>
            <h1 className="sd-title">My Progress</h1>
            <p className="sd-subtitle">
              Welcome back, <strong>{user.displayName?.split(' ')[0] ?? user.email?.split('@')[0]}</strong>
            </p>
          </div>
          <Link to="/join"><Button variant="primary" size="md">Join a Game</Button></Link>
        </div>

        {isLoading ? (
          <div className="sd-loading"><div className="loading-spinner" /></div>
        ) : entries.length === 0 ? (
          <div className="sd-empty">
            <div className="sd-empty-icon">🎮</div>
            <h2>No games played yet</h2>
            <p>Join a live quiz game to start tracking your progress here.</p>
            <Link to="/join"><Button variant="primary" size="md">Join a Game</Button></Link>
          </div>
        ) : (
          <>
            {/* Stat cards */}
            {stats && (
              <div className="sd-stats">
                <div className="sd-stat">
                  <span className="sd-stat-value">{stats.total}</span>
                  <span className="sd-stat-label">Games Played</span>
                </div>
                <div className="sd-stat">
                  <span className="sd-stat-value">{stats.avgScore.toLocaleString()}</span>
                  <span className="sd-stat-label">Avg Score</span>
                </div>
                <div className="sd-stat">
                  <span className="sd-stat-value">{stats.wins}</span>
                  <span className="sd-stat-label">1st Place Finishes</span>
                </div>
                <div className="sd-stat">
                  <span className="sd-stat-value">{stats.bestScore.toLocaleString()}</span>
                  <span className="sd-stat-label">Best Score</span>
                </div>
                {stats.streak > 1 && (
                  <div className="sd-stat sd-stat-streak">
                    <span className="sd-stat-value">{stats.streak}</span>
                    <span className="sd-stat-label">Top-3 Streak</span>
                  </div>
                )}
                <div className="sd-stat">
                  <span className="sd-stat-value">{stats.topHalfPct}%</span>
                  <span className="sd-stat-label">Top-Half Rate</span>
                </div>
              </div>
            )}

            {/* History table */}
            <div className="sd-section">
              <h2 className="sd-section-title">Game History</h2>
              <div className="sd-table-wrap">
                <table className="sd-table" aria-label="Game history">
                  <thead>
                    <tr>
                      <th>Quiz</th>
                      <th>Score</th>
                      <th>Rank</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.id} className={entry.rank === 1 ? 'sd-row-win' : ''}>
                        <td className="sd-td-title">
                          {entry.quizTitle}
                          <span className="sd-code">#{entry.gameCode}</span>
                        </td>
                        <td className="sd-td-score">{entry.score.toLocaleString()}</td>
                        <td className="sd-td-rank">
                          <span className={`sd-rank-badge ${entry.rank === 1 ? 'gold' : entry.rank === 2 ? 'silver' : entry.rank === 3 ? 'bronze' : ''}`}>
                            {rankLabel(entry.rank, entry.totalPlayers)}
                          </span>
                        </td>
                        <td className="sd-td-date">{formatDate(entry.playedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
