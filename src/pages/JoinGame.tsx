// ---------------------------------------------------------------------------
// Join Game (Sticker Sheet)
// Guests reach this from a QR code or link (/j/CODE, /join/CODE, /join?code=)
// with the code already filled in. Their name and avatar are remembered on
// this device, so a returning guest joins with a single tap.
// ---------------------------------------------------------------------------

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { socket } from '../services/socket';
import { getPlayerToken, savePlayerToken } from '../services/session';
import Avatar from '../components/sticker/Avatar';
import { AVATARS, avatarLabel, isAvatarKind, randomAvatar, type AvatarKind } from '../components/sticker/avatars';
import { pop } from '../services/sound/sfx';
import './JoinGame.css';

const NAME_KEY = 'ladle.name';
const AVATAR_KEY = 'ladle.avatar';

function readStored(key: string): string {
  try { return localStorage.getItem(key) ?? ''; } catch { return ''; }
}
function writeStored(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* private mode: fine */ }
}

/** Saved per game so the game screen knows which leaderboard row is "me". */
export function saveMe(code: string, name: string, avatar: AvatarKind) {
  try { sessionStorage.setItem(`ladle.me.${code}`, JSON.stringify({ name, avatar })); } catch { /* ignore */ }
}

const JoinGame: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const params = useParams<{ code?: string }>();
  const [searchParams] = useSearchParams();
  const linkCode = (params.code || searchParams.get('code') || '').toUpperCase().trim();

  const [gameCode, setGameCode] = useState(linkCode);
  const [editingCode, setEditingCode] = useState(!linkCode);
  const [playerName, setPlayerName] = useState(() => readStored(NAME_KEY) || user?.displayName?.split(' ')[0] || '');
  const [avatar, setAvatar] = useState<AvatarKind>(() => {
    const saved = readStored(AVATAR_KEY);
    return isAvatarKind(saved) ? saved : randomAvatar();
  });
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!playerName && user?.displayName) setPlayerName(user.displayName.split(' ')[0]);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    (editingCode ? codeRef : nameRef).current?.focus();
  }, [editingCode]);

  const code = gameCode.toUpperCase().replace(/\s+/g, '');
  const canJoin = code.length >= 4 && playerName.trim().length > 0 && !isJoining;

  function handleJoin(e?: React.FormEvent) {
    e?.preventDefault();
    if (!code) { setError('Type the game code from the big screen.'); setEditingCode(true); return; }
    if (!playerName.trim()) { setError('Add a name so your friends know it is you.'); nameRef.current?.focus(); return; }

    // Already in this game on this device (refresh, closed tab): just go back in
    if (getPlayerToken(code)) {
      navigate(`/game/${code}`);
      return;
    }

    setIsJoining(true);
    setError('');
    const name = playerName.trim();

    socket.emit('player:join', { code, name, avatar }, (response: { ok: boolean; reason?: string; playerToken?: string }) => {
      setIsJoining(false);
      if (response.ok) {
        pop();
        writeStored(NAME_KEY, name);
        writeStored(AVATAR_KEY, avatar);
        saveMe(code, name, avatar);
        if (response.playerToken) savePlayerToken(code, response.playerToken);
        navigate(`/game/${code}`);
      } else {
        setError(response.reason || 'We could not join that game. Check the code and try again.');
        if (/not found|code/i.test(response.reason || '')) setEditingCode(true);
      }
    });
  }

  return (
    <div className="st-stage join">
      <form className="join__inner" onSubmit={handleJoin} noValidate>
        <header className="join__top">
          <span className="join__brand st-display">PopPop</span>
          {!editingCode && (
            <button type="button" className="join__code-chip" onClick={() => setEditingCode(true)} aria-label={`Game code ${code}. Change code`}>
              <span className="join__code-chip-code">{code}</span>
              <span className="join__code-chip-edit">change</span>
            </button>
          )}
        </header>

        {editingCode && (
          <div className="join__field st-anim-peel">
            <label className="st-label" htmlFor="join-code">Game code</label>
            <input
              id="join-code"
              ref={codeRef}
              className="st-input st-input--code"
              value={gameCode}
              onChange={(e) => setGameCode(e.target.value.toUpperCase().slice(0, 8))}
              placeholder="ABC123"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              enterKeyHint="next"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (code) { setEditingCode(false); } } }}
            />
            <p className="st-muted join__hint">It's on the big screen at the front of the room.</p>
          </div>
        )}

        <section className="join__me" aria-label="Your sticker">
          <div className="join__me-avatar st-anim-wobble">
            <Avatar kind={avatar} size={128} />
          </div>
          <div className="join__me-text">
            <div className="st-display join__me-title">You're the {avatarLabel(avatar)}</div>
            <button type="button" className="st-btn st-btn--lemon join__shuffle" onClick={() => setAvatar(randomAvatar(avatar))}>
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7 H8 L16 17 H21 M3 17 H8 L10 14.5 M14 9.5 L16 7 H21 M18 4 L21 7 L18 10 M18 14 L21 17 L18 20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Shuffle
            </button>
          </div>
        </section>

        <fieldset className="join__picker">
          <legend className="st-label">Or pick one</legend>
          <div className="join__picker-grid">
            {AVATARS.map((a) => (
              <button
                key={a.kind}
                type="button"
                className={`join__pick ${a.kind === avatar ? 'is-on' : ''}`}
                aria-pressed={a.kind === avatar}
                aria-label={a.label}
                onClick={() => setAvatar(a.kind)}
              >
                <Avatar kind={a.kind} size={46} decorative />
              </button>
            ))}
          </div>
        </fieldset>

        <div className="join__field">
          <label className="st-label" htmlFor="join-name">Name on your sticker</label>
          <input
            id="join-name"
            ref={nameRef}
            className="st-input"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value.slice(0, 30))}
            placeholder="Your name"
            autoComplete="nickname"
            enterKeyHint="go"
            maxLength={30}
          />
        </div>

        {error && <div className="st-error" role="alert">{error}</div>}

        <div className="join__spacer" />

        <button type="submit" className="st-btn st-btn--ink st-btn--lg st-btn--block" disabled={!canJoin}>
          {isJoining ? 'Joining…' : 'Stick it on the wall'}
        </button>
      </form>
    </div>
  );
};

export default JoinGame;
