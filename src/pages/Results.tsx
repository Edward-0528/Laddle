// ---------------------------------------------------------------------------
// Results Page
// Full game report for a completed session. Loaded by the host after a game
// ends and accessible from the Dashboard "Recent Games" section.
// ---------------------------------------------------------------------------

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getGameResult } from '../services/gameResults';
import type { GameResult } from '../types/gameResult';
import Button from '../components/ui/Button';
import './Results.css';

const Results: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const [result, setResult] = useState<GameResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!gameId) return;
    getGameResult(gameId)
      .then((data) => {
        if (!data) setError('Result not found.');
        else setResult(data);
      })
      .catch(() => setError('Failed to load result.'))
      .finally(() => setIsLoading(false));
  }, [gameId]);

  if (isLoading) {
    return (
      <div className="results-page">
        <div className="container results-loading">
          <div className="loading-spinner" />
          <p>Loading results...</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="results-page">
        <div className="container results-error">
          <p>{error || 'Result not found.'}</p>
          <Link to="/dashboard">
            <Button variant="primary" size="md">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const date = new Date(result.playedAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const time = new Date(result.playedAt).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const medalLabel = (rank: number) => {
    if (rank === 1) return '1st';
    if (rank === 2) return '2nd';
    if (rank === 3) return '3rd';
    return `#${rank}`;
  };

  return (
    <div className="results-page">
      <div className="container">
        {/* Header */}
        <div className="results-header">
          <div>
            <h1 className="results-title">{result.quizTitle}</h1>
            <p className="results-meta">
              {date} at {time} &middot; {result.playerCount} player{result.playerCount !== 1 ? 's' : ''}
              &middot; Code: <span className="results-code">{result.gameCode}</span>
            </p>
          </div>
          <div className="results-header-actions">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">Back to Dashboard</Button>
            </Link>
          </div>
        </div>

        {/* Podium (top 3) */}
        {result.players.length >= 1 && (
          <div className="results-podium">
            {[result.players[1], result.players[0], result.players[2]]
              .filter(Boolean)
              .map((p) => (
                <div key={p.rank} className={`results-podium-col results-podium-rank-${p.rank}`}>
                  <div className="results-podium-avatar">{p.name.charAt(0).toUpperCase()}</div>
                  <div className="results-podium-name">{p.name}</div>
                  <div className="results-podium-score">{p.score.toLocaleString()} pts</div>
                  <div className={`results-podium-block results-podium-block-${p.rank}`}>
                    <span className="results-podium-medal">{medalLabel(p.rank)}</span>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Full rankings table */}
        <div className="results-table-wrap">
          <h2 className="results-table-title">All Players</h2>
          <table className="results-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {result.players.map((p) => (
                <tr key={p.name} className={p.rank <= 3 ? 'results-row-top' : ''}>
                  <td className="results-rank-cell">{medalLabel(p.rank)}</td>
                  <td className="results-name-cell">{p.name}</td>
                  <td className="results-score-cell">{p.score.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Results;
