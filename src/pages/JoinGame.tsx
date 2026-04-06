// ---------------------------------------------------------------------------
// Join Game Page
// Allows players to enter a game code (or receive one via QR / URL) and
// their display name, then join the game lobby. Replaces the original
// Player page with a cleaner, design-system-aligned interface.
// ---------------------------------------------------------------------------

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { socket } from '../services/socket';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import './JoinGame.css';

const JoinGame: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [gameCode, setGameCode] = useState(searchParams.get('code') || '');
  const [playerName, setPlayerName] = useState(user?.displayName || '');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  // Auto-fill name from auth
  useEffect(() => {
    if (user?.displayName && !playerName) {
      setPlayerName(user.displayName);
    }
  }, [user]);

  function handleJoin() {
    if (!gameCode.trim()) {
      setError('Please enter a game code.');
      return;
    }
    if (!playerName.trim()) {
      setError('Please enter your name.');
      return;
    }

    setIsJoining(true);
    setError('');

    const code = gameCode.toUpperCase().trim();
    console.log('[Ladle] Attempting to join game:', code, 'as', playerName);

    socket.emit(
      'player:join',
      { code, name: playerName.trim() },
      (response: { ok: boolean; reason?: string }) => {
        setIsJoining(false);
        if (response.ok) {
          console.log('[Ladle] Successfully joined game:', code);
          navigate(`/game/${code}`);
        } else {
          console.error('[Ladle] Failed to join game:', response.reason);
          setError(response.reason || 'Failed to join game. Please check the code and try again.');
        }
      }
    );
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      handleJoin();
    }
  }

  return (
    <div className="join-game">
      <div className="container join-game-inner">
        <Card variant="elevated" padding="lg" className="join-card">
          <h1 className="join-title">Join a Quiz</h1>
          <p className="join-subtitle">
            Enter the 6-character game code provided by your host
          </p>

          <div className="join-form">
            <Input
              label="Game Code"
              placeholder="e.g. ABC123"
              value={gameCode}
              onChange={(e) => setGameCode(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              error={error && !gameCode.trim() ? 'Game code is required' : undefined}
              fullWidth
            />

            <Input
              label="Your Name"
              placeholder="Enter your display name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={handleKeyDown}
              error={error && gameCode.trim() && !playerName.trim() ? 'Name is required' : undefined}
              fullWidth
            />

            {error && gameCode.trim() && playerName.trim() && (
              <div className="join-error">{error}</div>
            )}

            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleJoin}
              isLoading={isJoining}
              disabled={!gameCode.trim() || !playerName.trim()}
            >
              Join Game
            </Button>
          </div>

          <p className="join-hint">
            Ask your host for the game code, or scan the QR code displayed
            on their screen.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default JoinGame;
