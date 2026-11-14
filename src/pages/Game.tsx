// ---------------------------------------------------------------------------
// Game Page (Sticker Sheet)
// One component, two audiences:
//   Host (big screen): sticker-wall lobby, question columns, reveal that turns
//     the columns into a bar chart, top-5 leaderboard, staged podium.
//   Player (phone): "you're stuck in" lobby, 2x2 answer stickers in the thumb
//     zone, a personal result card after every question, final placement card.
// Socket protocol is unchanged apart from the optional `avatar` field.
// ---------------------------------------------------------------------------

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socket } from '../services/socket';
import { clearPlayerToken, getHostToken, getPlayerToken } from '../services/session';
import { EVENTS } from '../types/events';
import { useAuth } from '../context/AuthContext';
import { saveGameResult } from '../services/gameResults';
import { saveStudentProgress } from '../services/studentProgress';
import { QRCodeSVG } from 'qrcode.react';
import Avatar from '../components/sticker/Avatar';
import StickerEditor from '../components/sticker/StickerEditor';
import type { AvatarKind } from '../components/sticker/avatars';
import AnswerShape, { answerStyle, ArrowIcon, CheckIcon, CrossIcon } from '../components/sticker/AnswerShape';
import './Game.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Player {
  id: string;
  name: string;
  score: number;
  avatar?: string;
  teamName?: string;
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
  avatar?: string;
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

interface GameResultsPayload {
  leaderboard: RankedPlayer[];
  teamLeaderboard?: Array<{ teamName: string; score: number; rank: number }>;
  quizTitle?: string;
  code: string;
  playedAt: number;
}

type RevealPhase = 'correct' | 'leaderboard';

const STICKER_TILTS = [-6, 4, -3, 7, -8, 2, 5, -5];
const CHIP_COLORS = ['var(--st-answer-1)', 'var(--st-answer-2)', 'var(--st-answer-3)', '#2EE6A8', '#FF6B5A', '#B48CFF'];

/** Stable per-player look: the same name always gets the same tilt and color,
 *  so stickers don't reshuffle when someone else joins, leaves or reconnects. */
function nameHash(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
}
const tiltFor = (name: string) => STICKER_TILTS[nameHash(name) % STICKER_TILTS.length];
const colorFor = (name: string) => CHIP_COLORS[(nameHash(name) >>> 3) % CHIP_COLORS.length];
const CONFETTI_COLORS = ['#FF4FA3', '#3D8BFF', '#FFC83D', '#7B3CFF', '#2EE6A8', '#FF6B5A'];

function readMe(code?: string): { name: string; avatar?: string } | null {
  if (!code) return null;
  try {
    const raw = sessionStorage.getItem(`ladle.me.${code}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Game = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [gameState, setGameState] = useState<'lobby' | 'question' | 'reveal' | 'results' | 'ended' | 'gone'>('lobby');
  const [offline, setOffline] = useState(!socket.connected);
  const [resumedMidGame, setResumedMidGame] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<GameData | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [questionResult, setQuestionResult] = useState<QuestionResult | null>(null);
  const [leaderboard, setLeaderboard] = useState<RankedPlayer[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [answerCount, setAnswerCount] = useState(0);
  const [revealPhase, setRevealPhase] = useState<RevealPhase>('correct');
  const [savedResultId, setSavedResultId] = useState<string | null>(null);
  const [quizTitle, setQuizTitle] = useState<string>('');
  const [reconnectBanner, setReconnectBanner] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hostAway, setHostAway] = useState(false);
  const [teamsEnabled, setTeamsEnabled] = useState(false);
  const [teamNames, setTeamNames] = useState<string[]>([]);
  const [myTeamName, setMyTeamName] = useState<string | null>(null);
  const [teamLeaderboard, setTeamLeaderboard] = useState<Array<{ teamName: string; score: number; rank: number }>>([]);
  const [teamSetupInput, setTeamSetupInput] = useState('');
  const [showTeams, setShowTeams] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHostRef = useRef(false);
  const [me, setMe] = useState(() => readMe(code));
  const [editingSticker, setEditingSticker] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const joinUrl = `${origin}/j/${code}`;
  const joinHost = origin.replace(/^https?:\/\//, '');

  useEffect(() => {
    socket.on(EVENTS.GAME_ROLE, (data: { role: 'host' | 'player'; teamName?: string }) => {
      isHostRef.current = data.role === 'host';
      setIsHost(data.role === 'host');
      if (data.teamName) setMyTeamName(data.teamName);
    });

    socket.on('lobby:teams', (data: { teamsEnabled: boolean; teamNames: string[] }) => {
      setTeamsEnabled(data.teamsEnabled);
      setTeamNames(data.teamNames);
    });

    socket.on(EVENTS.GAME_PAUSED, () => setIsPaused(true));

    socket.on(EVENTS.GAME_RESUMED, (data: { endsAt: number }) => {
      setIsPaused(false);
      const remaining = Math.max(0, Math.round((data.endsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      setTotalTime(remaining);
    });

    socket.on(EVENTS.HOST_AWAY, () => setHostAway(true));
    socket.on(EVENTS.HOST_BACK, () => setHostAway(false));

    socket.on(EVENTS.GAME_STATE, (data: {
      state: string;
      paused: boolean;
      currentQuestion?: {
        index: number;
        total: number;
        endsAt?: number;
        timeRemainingMs?: number;
        q: Question;
      };
      players: Player[];
      answerCount: number;
    }) => {
      setPlayers(data.players);
      setAnswerCount(data.answerCount);
      setIsPaused(data.paused);
      if (data.state === 'question' && data.currentQuestion) {
        const q = data.currentQuestion;
        setCurrentQuestion({ index: q.index, total: q.total, endsAt: q.endsAt ?? 0, q: q.q });
        const remaining = data.paused && q.timeRemainingMs != null
          ? Math.round(q.timeRemainingMs / 1000)
          : Math.max(0, Math.round(((q.endsAt ?? Date.now()) - Date.now()) / 1000));
        setTimeLeft(remaining);
        setTotalTime(q.q.durationSec);
        setGameState('question');
      }
    });

    // Re-identify with our secret token on every (re)connect.
    const reclaim = () => {
      if (!code) return;
      const hostToken = getHostToken(code);
      const playerToken = getPlayerToken(code);
      if (hostToken && isHostRef.current) socket.emit(EVENTS.HOST_RECONNECT, { code, hostToken });
      else if (playerToken) socket.emit(EVENTS.SESSION_RESUME, { code, playerToken });
    };
    // The socket may have connected between first render and this effect
    setOffline(!socket.connected);
    socket.on('connect', () => { setOffline(false); reclaim(); });
    socket.on('disconnect', () => setOffline(true));

    socket.on(EVENTS.HOST_RECONNECT_FAILED, () => setGameState('gone'));
    socket.on(EVENTS.SESSION_RESUME_FAILED, () => {
      if (code) clearPlayerToken(code);
      setGameState('gone');
    });

    // Player resumed: rebuild the screen from the server's snapshot.
    socket.on(EVENTS.PLAYER_STATE, (data: {
      state: string;
      paused: boolean;
      currentQuestion?: { index: number; total: number; endsAt?: number; timeRemainingMs?: number; q: Question };
      answered: boolean;
      choiceIndex?: number;
      players: Player[];
    }) => {
      setPlayers(data.players);
      setIsPaused(data.paused);
      if (data.state === 'question' && data.currentQuestion) {
        const q = data.currentQuestion;
        setCurrentQuestion({ index: q.index, total: q.total, endsAt: q.endsAt ?? 0, q: q.q });
        const remaining = data.paused && q.timeRemainingMs != null
          ? Math.round(q.timeRemainingMs / 1000)
          : Math.max(0, Math.round(((q.endsAt ?? Date.now()) - Date.now()) / 1000));
        setTimeLeft(remaining);
        setTotalTime(q.q.durationSec);
        setSelectedChoice(data.answered ? (data.choiceIndex ?? null) : null);
        setHasAnswered(data.answered);
        setGameState('question');
      } else if (data.state === 'reveal') {
        setResumedMidGame(true);
        setGameState('lobby');
      }
    });

    socket.on(EVENTS.LOBBY_UPDATE, (playerList: Player[]) => setPlayers(playerList));

    socket.on(EVENTS.GAME_QUESTION, (data: GameData) => {
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
      setResumedMidGame(false);
      setAnswerCount(0);
      setGameState('question');
      setCurrentQuestion(data);
      setSelectedChoice(null);
      setHasAnswered(false);
      setQuestionResult(null);
      setRevealPhase('correct');
      setTimeLeft(data.q.durationSec);
      setTotalTime(data.q.durationSec);
    });

    socket.on(EVENTS.GAME_ANSWER_COUNT, (count: number) => setAnswerCount(count));

    socket.on(EVENTS.GAME_QUESTION_END, (result: QuestionResult) => {
      setQuestionResult(result);
      setLeaderboard(result.leaderboard);
      setGameState('reveal');
      setTimeLeft(0);
      setRevealPhase('correct');
      // Answer chart first, then the leaderboard until the next question arrives.
      revealTimerRef.current = setTimeout(() => setRevealPhase('leaderboard'), 2800);
    });

    socket.on(EVENTS.GAME_RESULTS, (data: GameResultsPayload) => {
      setLeaderboard(data.leaderboard);
      setQuizTitle(data.quizTitle ?? '');
      setGameState('results');
      if (isHostRef.current && user) {
        saveGameResult({
          hostUid: user.uid,
          quizTitle: data.quizTitle ?? 'Untitled Quiz',
          gameCode: data.code,
          playedAt: data.playedAt,
          playerCount: data.leaderboard.length,
          players: data.leaderboard.map((p) => ({ name: p.name, score: p.score, rank: p.rank })),
        }).then((id) => {
          if (id) setSavedResultId(id);
        });
      }
      // Logged-in students save their own progress, but only for their own row.
      if (!isHostRef.current && user) {
        const myName = readMe(data.code)?.name ?? user.displayName?.split(' ')[0] ?? '';
        const myEntry = data.leaderboard.find((p) => p.name.toLowerCase() === myName.toLowerCase());
        if (myEntry) {
          saveStudentProgress({
            uid: user.uid,
            playerName: myEntry.name,
            quizTitle: data.quizTitle ?? 'Untitled Quiz',
            gameCode: data.code,
            score: myEntry.score,
            rank: myEntry.rank,
            totalPlayers: data.leaderboard.length,
            playedAt: data.playedAt,
          });
        }
      }
      if (data.teamLeaderboard) setTeamLeaderboard(data.teamLeaderboard);
    });

    socket.on(EVENTS.PLAYER_RECONNECTED, () => {
      setReconnectBanner(true);
      setTimeout(() => setReconnectBanner(false), 4000);
    });

    socket.on(EVENTS.GAME_ENDED, () => setGameState('ended'));
    socket.on(EVENTS.PLAYER_ANSWER_ACK, () => setHasAnswered(true));

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('host') === 'true') {
      isHostRef.current = true;
      setIsHost(true);
    }

    // Fresh page load (refresh): reclaim our seat first, then ask for the lobby.
    if (code) {
      if (getHostToken(code) && urlParams.get('host') === 'true') isHostRef.current = true;
      if (socket.connected) reclaim();
      socket.emit(EVENTS.LOBBY_REQUEST, { code });
    }

    return () => {
      socket.off(EVENTS.GAME_ROLE);
      socket.off('lobby:teams');
      socket.off(EVENTS.LOBBY_UPDATE);
      socket.off(EVENTS.GAME_QUESTION);
      socket.off(EVENTS.GAME_QUESTION_END);
      socket.off(EVENTS.GAME_ANSWER_COUNT);
      socket.off(EVENTS.GAME_RESULTS);
      socket.off(EVENTS.GAME_ENDED);
      socket.off(EVENTS.GAME_PAUSED);
      socket.off(EVENTS.GAME_RESUMED);
      socket.off(EVENTS.GAME_STATE);
      socket.off(EVENTS.HOST_AWAY);
      socket.off(EVENTS.HOST_BACK);
      socket.off('connect');
      socket.off('disconnect');
      socket.off(EVENTS.HOST_RECONNECT_FAILED);
      socket.off(EVENTS.SESSION_RESUME_FAILED);
      socket.off(EVENTS.PLAYER_STATE);
      socket.off(EVENTS.PLAYER_ANSWER_ACK);
      socket.off(EVENTS.PLAYER_RECONNECTED);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown timer, stopped while paused
  useEffect(() => {
    if (gameState === 'question' && timeLeft > 0 && !isPaused) {
      timerRef.current = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }
  }, [gameState, timeLeft, isPaused]);

  function startGame() {
    socket.emit(EVENTS.HOST_START, { code });
  }

  function selectChoice(choiceIndex: number) {
    if (isHost || hasAnswered || selectedChoice !== null || timeLeft <= 0 || gameState !== 'question' || isPaused) return;
    setSelectedChoice(choiceIndex);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(15);
    socket.emit(EVENTS.PLAYER_ANSWER, { code, choiceIndex });
  }

  const fusePct = totalTime > 0 ? Math.max(0, Math.min(100, (timeLeft / totalTime) * 100)) : 0;
  const myEntry = me ? leaderboard.find((p) => p.name.toLowerCase() === me.name.toLowerCase()) : undefined;

  // ---------------------------------------------------------------------------
  // Shared overlays
  // ---------------------------------------------------------------------------

  const overlays = (
    <>
      {isPaused && (
        <div className="g-interstitial" role="status" aria-live="polite">
          <div className="st-sticker g-interstitial__card st-anim-slap">
            <svg width="56" height="56" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="5" height="16" rx="2" fill="currentColor" /><rect x="14" y="4" width="5" height="16" rx="2" fill="currentColor" /></svg>
            <div className="st-display g-interstitial__title">Paused</div>
            <div className="st-muted">{isHost ? 'The timer is stopped. Resume when you are ready.' : 'Your host paused the game. Hang tight.'}</div>
            {isHost && (
              <button type="button" className="st-btn st-btn--ink" onClick={() => socket.emit(EVENTS.HOST_RESUME, { code })}>Resume</button>
            )}
          </div>
        </div>
      )}
      {hostAway && !isPaused && !isHost && (
        <div className="g-toast" role="status" aria-live="polite">
          Your host lost connection. Waiting for them to come back<span className="st-dots"><span>.</span><span>.</span><span>.</span></span>
        </div>
      )}
      {reconnectBanner && <div className="g-toast g-toast--good" role="status">You're back in. Nothing was lost.</div>}
      {offline && (
        <div className="g-toast" role="status" aria-live="polite">
          Reconnecting<span className="st-dots"><span>.</span><span>.</span><span>.</span></span> your spot is saved
        </div>
      )}
    </>
  );

  const fuse = (running: boolean) => (
    <div className="g-fuse" role="timer" aria-label={`${timeLeft} seconds left`}>
      <div className="g-fuse__burn" style={{ width: `${running ? fusePct : 0}%` }}>
        {running && timeLeft > 0 && <span className="g-fuse__spark" aria-hidden="true" />}
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Game no longer exists (ended, or expired while we were away)
  // ---------------------------------------------------------------------------

  if (gameState === 'gone') {
    return (
      <div className="st-stage g-phone">
        <div className="g-phone__inner g-center" style={{ justifyContent: 'center' }}>
          <div className="st-sticker g-cta-card st-anim-slap">
            <div className="st-display g-cta-card__title">This game has finished</div>
            <div className="st-muted">It ended or timed out while you were away. Grab the new code from the big screen to jump into the next one.</div>
            <button type="button" className="st-btn st-btn--ink st-btn--block" onClick={() => navigate(isHost ? '/dashboard' : '/join')}>
              {isHost ? 'Back to my quizzes' : 'Join a game'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Final results: podium (host) / placement card (player)
  // ---------------------------------------------------------------------------

  if (gameState === 'ended' || gameState === 'results') {
    if (!isHost) {
      const place = myEntry?.rank;
      return (
        <div className="st-stage g-phone">
          <div className="g-phone__inner g-center">
            <div className="st-tag g-tilt-r">Game over</div>
            {myEntry ? (
              <>
                <div className="st-anim-slap"><Avatar kind={myEntry.avatar ?? me?.avatar} name={myEntry.name} size={170} /></div>
                <div className="st-display g-final-place">You placed {ordinal(place!)}</div>
                <div className="st-muted g-final-sub">of {leaderboard.length} {leaderboard.length === 1 ? 'player' : 'players'} · {myEntry.score.toLocaleString()} points</div>
              </>
            ) : (
              <div className="st-display g-final-place">Thanks for playing!</div>
            )}
            <div className="g-spacer" />
            <div className="st-sticker g-cta-card">
              <div className="st-display g-cta-card__title">That was fun. Your turn?</div>
              <div className="st-muted">Make your own quiz in a minute. Free, and your friends join just like you did.</div>
              <button type="button" className="st-btn st-btn--ink st-btn--block" onClick={() => navigate('/register')}>Host your own</button>
            </div>
            <button type="button" className="st-btn st-btn--quiet st-btn--block" onClick={() => navigate('/join')}>Join another game</button>
          </div>
        </div>
      );
    }

    const top3 = leaderboard.slice(0, 3);
    const podium = [
      top3[1] && { entry: top3[1], height: 210, color: 'var(--st-answer-2)', pod: 1.4, av: 1.9, size: 140 },
      top3[0] && { entry: top3[0], height: 290, color: 'var(--st-lemon)', pod: 2.6, av: 3.2, size: 170 },
      top3[2] && { entry: top3[2], height: 150, color: 'var(--st-answer-1)', pod: 0.3, av: 0.8, size: 130 },
    ].filter(Boolean) as Array<{ entry: RankedPlayer; height: number; color: string; pod: number; av: number; size: number }>;
    const rest = leaderboard.slice(3, 10);

    return (
      <div className="st-stage g-host g-podium">
        <div className="st-display g-podium__title">{quizTitle ? `${quizTitle}: the winner is…` : 'And the winner is…'}</div>
        <div className="g-podium__stage">
          {podium.map(({ entry, height, color, pod, av, size }) => (
            <div key={entry.rank} className="g-podium__col">
              <div className="g-podium__who g-anim-popup" style={{ animationDelay: `${av}s` }}>
                <Avatar kind={entry.avatar} name={entry.name} size={size} decorative />
                <div className="st-display g-podium__name">{entry.name}</div>
                <div className="st-muted">{entry.score.toLocaleString()} pts</div>
              </div>
              <div className="g-podium__block g-anim-rise" style={{ height: `min(${height}px, ${Math.round(height / 9)}vh)`, background: color, animationDelay: `${pod}s` }}>
                <span className="st-display">{entry.rank}</span>
              </div>
            </div>
          ))}
        </div>
        {Array.from({ length: 36 }).map((_, i) => (
          <span
            key={i}
            className="g-confetti"
            aria-hidden="true"
            style={{
              left: `${(i * 37) % 100}%`,
              animationDelay: `${3.4 + (i % 9) * 0.12}s`,
              width: i % 3 === 0 ? 10 : 14,
              height: i % 2 === 0 ? 22 : 12,
              background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              borderRadius: i % 4 === 0 ? '50%' : 3,
            }}
          />
        ))}
        <div className="g-podium__footer">
          {rest.length > 0 && (
            <ol className="g-podium__rest" start={4}>
              {rest.map((p) => (
                <li key={p.rank} className="st-chip" style={{ background: 'var(--st-white)' }}>
                  <Avatar kind={p.avatar} name={p.name} size={30} decorative />
                  <span>{p.rank}. {p.name}</span>
                </li>
              ))}
            </ol>
          )}
          {teamsEnabled && teamLeaderboard.length > 0 && (
            <div className="g-podium__teams">
              {teamLeaderboard.map((t) => (
                <span key={t.teamName} className="st-tag">{t.rank}. {t.teamName} · {t.score.toLocaleString()}</span>
              ))}
            </div>
          )}
          <div className="g-podium__actions">
            {savedResultId && (
              <button type="button" className="st-btn st-btn--lemon" onClick={() => navigate(`/results/${savedResultId}`)}>See the report</button>
            )}
            <button type="button" className="st-btn st-btn--ink" onClick={() => navigate('/dashboard')}>Back to my quizzes</button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Reveal
  // ---------------------------------------------------------------------------

  if (gameState === 'reveal' && currentQuestion && questionResult) {
    if (!isHost) {
      const picked = selectedChoice;
      const correct = picked !== null && picked === questionResult.correctIndex;
      const missed = picked === null;
      const entry = me ? questionResult.leaderboard.find((p) => p.name.toLowerCase() === me.name.toLowerCase()) : undefined;
      const above = entry ? questionResult.leaderboard.find((p) => p.rank === entry.rank - 1) : undefined;
      const right = answerStyle(questionResult.correctIndex);
      return (
        <div className={`st-stage g-phone g-result ${correct ? 'is-correct' : 'is-wrong'}`}>
          <div className="g-phone__inner g-center">
            <div className="g-result__burst st-anim-slap">
              <span className="g-result__icon">{correct ? <CheckIcon size={64} /> : <CrossIcon size={56} />}</span>
            </div>
            <div className="st-display g-result__title">{correct ? 'Correct!' : missed ? 'Out of time' : 'Not quite'}</div>
            {correct && entry && <div className="st-display g-result__points st-anim-slap" style={{ animationDelay: '.25s' }}>+{entry.pointsEarned.toLocaleString()}</div>}
            {!correct && (
              <div className="st-sticker g-result__answer">
                <AnswerShape index={questionResult.correctIndex} size={34} fill={right.color} />
                <span>The answer was <strong>{currentQuestion.q.choices[questionResult.correctIndex]}</strong></span>
              </div>
            )}
            {correct && entry && entry.streak >= 2 && (
              <div className="st-tag g-tilt-r g-result__streak">{entry.streak} in a row</div>
            )}
            <div className="g-spacer" />
            {entry && (
              <div className="st-sticker g-result__rank">
                <div className="st-display g-result__rank-big">You're {ordinal(entry.rank)}</div>
                <div className="g-result__rank-sub">
                  {entry.rankDelta !== 0 && (
                    <span className={`g-delta ${entry.rankDelta > 0 ? 'is-up' : 'is-down'}`}>
                      <ArrowIcon up={entry.rankDelta > 0} /> {Math.abs(entry.rankDelta)}
                    </span>
                  )}
                  {above ? `${(above.score - entry.score).toLocaleString()} behind ${above.name}` : 'In the lead!'}
                </div>
              </div>
            )}
          </div>
          {overlays}
        </div>
      );
    }

    const total = questionResult.answerCounts.reduce((a, b) => a + b, 0);
    const correctCount = questionResult.answerCounts[questionResult.correctIndex] ?? 0;

    if (revealPhase === 'leaderboard') {
      return (
        <div className="st-stage g-host g-board">
          <div className="g-board__head">
            <div className="st-display g-board__title">Leaderboard</div>
            <div className="st-tag g-tilt-r">after {currentQuestion.index + 1} of {currentQuestion.total}</div>
          </div>
          <ol className="g-board__list">
            {leaderboard.slice(0, 5).map((p, i) => (
              <li key={p.name} className="st-anim-row" style={{ animationDelay: `${0.1 + (4 - i) * 0.12}s` }}>
                <div className={`g-board__row ${p.rankDelta > 0 ? 'st-anim-hop' : ''} ${p.rank === 1 ? 'is-first' : ''}`}>
                  <span className="st-display g-board__rank">{p.rank}</span>
                  <Avatar kind={p.avatar} name={p.name} size={68} decorative />
                  <span className="st-display g-board__name">{p.name}</span>
                  {p.streak >= 2 && <span className="st-tag g-board__streak">{p.streak} streak</span>}
                  {p.rankDelta !== 0 && (
                    <span className={`g-delta ${p.rankDelta > 0 ? 'is-up' : 'is-down'}`}>
                      <ArrowIcon up={p.rankDelta > 0} /> {Math.abs(p.rankDelta)}
                    </span>
                  )}
                  <span className="st-display g-board__score">{p.score.toLocaleString()}</span>
                </div>
              </li>
            ))}
          </ol>
          <p className="st-muted g-board__hint">Next question coming up<span className="st-dots"><span>.</span><span>.</span><span>.</span></span></p>
        </div>
      );
    }

    return (
      <div className="st-stage g-host g-q">
        {fuse(false)}
        <div className="g-q__head">
          <span className="st-tag g-tilt-l">{currentQuestion.index + 1} / {currentQuestion.total}</span>
          <h1 className="st-display g-q__text">{currentQuestion.q.text}</h1>
          <span className="st-muted g-q__status">{correctCount} of {total} got it</span>
        </div>
        <div className="g-cols" style={{ gridTemplateColumns: `repeat(${currentQuestion.q.choices.length}, minmax(0, 1fr))` }}>
          {currentQuestion.q.choices.map((choice, i) => {
            const count = questionResult.answerCounts[i] || 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const isCorrect = i === questionResult.correctIndex;
            const s = answerStyle(i);
            return (
              <div key={i} className={`g-col is-revealed ${isCorrect ? 'is-correct' : 'is-dim'}`}>
                <div className="g-col__fill g-anim-rise" style={{ height: `${pct}%`, background: s.color }} />
                <AnswerShape index={i} size={84} fill="var(--st-ink)" />
                <span className="st-display g-col__count">{count}</span>
                <span className="st-display g-col__label">{choice}</span>
                {isCorrect && (
                  <span className="g-col__stamp"><span className="st-anim-slap" style={{ animationDelay: '.8s' }}><CheckIcon size={26} /> Correct!</span></span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Question: host (big screen)
  // ---------------------------------------------------------------------------

  if (gameState === 'question' && currentQuestion && isHost) {
    const playerCount = players.length;
    return (
      <div className="st-stage g-host g-q">
        {fuse(!isPaused)}
        <div className="g-q__head">
          <span className="st-tag g-tilt-l">{currentQuestion.index + 1} / {currentQuestion.total}</span>
          <h1 className="st-display g-q__text">{currentQuestion.q.text}</h1>
          <span className="g-q__clock st-display" aria-hidden="true">{timeLeft}</span>
        </div>
        <div className="g-cols" style={{ gridTemplateColumns: `repeat(${currentQuestion.q.choices.length}, minmax(0, 1fr))` }}>
          {currentQuestion.q.choices.map((choice, i) => {
            const s = answerStyle(i);
            return (
              <div key={i} className="g-col st-anim-peel" style={{ background: s.color, color: s.ink, animationDelay: `${i * 0.08}s` }}>
                <AnswerShape index={i} size={96} />
                <span className="st-display g-col__label">{choice}</span>
              </div>
            );
          })}
        </div>
        <div className="g-host__bar">
          <span className="st-muted g-host__answered" aria-live="polite"><strong>{answerCount}</strong> of {playerCount} answered</span>
          <div className="g-host__controls">
            <button type="button" className="st-btn st-btn--quiet" onClick={() => socket.emit(isPaused ? EVENTS.HOST_RESUME : EVENTS.HOST_PAUSE, { code })}>{isPaused ? 'Resume' : 'Pause'}</button>
            <button type="button" className="st-btn st-btn--quiet" onClick={() => socket.emit(EVENTS.HOST_EXTEND_TIME, { code, extraSeconds: 15 })}>+15 s</button>
            <button type="button" className="st-btn st-btn--quiet" onClick={() => socket.emit(EVENTS.HOST_SKIP, { code })}>Reveal now</button>
            <button
              type="button"
              className="st-btn st-btn--quiet"
              onClick={() => { if (window.confirm('End the game now and show final scores?')) socket.emit(EVENTS.HOST_END_GAME, { code }); }}
            >
              End game
            </button>
          </div>
        </div>
        {overlays}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Question: player (phone)
  // ---------------------------------------------------------------------------

  if (gameState === 'question' && currentQuestion) {
    const locked = selectedChoice !== null;
    const timeUp = timeLeft <= 0 && !locked;
    return (
      <div className="st-stage g-phone g-pq">
        {fuse(!isPaused)}
        <div className="g-pq__meta st-muted">
          <span>{currentQuestion.index + 1} of {currentQuestion.total}</span>
          <span>{timeLeft}s</span>
        </div>
        <h1 className="st-display g-pq__text">{currentQuestion.q.text}</h1>
        <div className="g-pq__grid" role="group" aria-label="Answer choices">
          {currentQuestion.q.choices.map((choice, i) => {
            const s = answerStyle(i);
            const isPicked = selectedChoice === i;
            return (
              <div key={i} className="g-pq__cell" style={{ transform: `rotate(${i % 2 === 0 ? -1.5 : 1.5}deg)` }}>
                <button
                  type="button"
                  className={`g-tile st-anim-peel ${isPicked ? 'st-anim-squish' : ''} ${locked && !isPicked ? 'is-faded' : ''}`}
                  style={{ background: s.color, color: s.ink, animationDelay: isPicked ? undefined : `${i * 0.07}s` }}
                  onClick={() => selectChoice(i)}
                  disabled={locked || timeLeft <= 0 || isPaused}
                  aria-pressed={isPicked}
                  aria-label={`${s.letter}: ${choice}`}
                >
                  <AnswerShape index={i} size={58} />
                  <span className="st-display g-tile__label">{choice}</span>
                  {isPicked && <span className="g-tile__locked st-anim-slap">{hasAnswered ? 'LOCKED' : 'Sending…'}</span>}
                </button>
              </div>
            );
          })}
        </div>
        <p className="st-muted g-pq__hint" role="status" aria-live="polite">
          {timeUp ? "Time's up!" : locked ? 'Locked in. Eyes on the big screen.' : 'Tap your answer'}
        </p>
        {overlays}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Lobby: player (phone)
  // ---------------------------------------------------------------------------

  /** Player edits their own sticker in the lobby. Resolves to an error message or null. */
  function saveSticker(changes: { name: string; avatar: AvatarKind }): Promise<string | null> {
    const playerToken = code ? getPlayerToken(code) : null;
    if (!code || !playerToken) return Promise.resolve('We could not find your seat. Try refreshing.');
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve('No answer from the game. Check your connection.'), 8000);
      socket.emit(EVENTS.PLAYER_UPDATE, { code, playerToken, ...changes }, (res: { ok: boolean; reason?: string; name?: string; avatar?: string }) => {
        clearTimeout(timer);
        if (!res?.ok) { resolve(res?.reason ?? 'Could not save your sticker.'); return; }
        const next = { name: res.name ?? changes.name, avatar: res.avatar ?? changes.avatar };
        setMe(next);
        try {
          sessionStorage.setItem(`ladle.me.${code}`, JSON.stringify(next));
          localStorage.setItem('ladle.name', next.name);
          localStorage.setItem('ladle.avatar', next.avatar);
        } catch { /* storage unavailable: fine */ }
        resolve(null);
      });
    });
  }

  if (!isHost) {
    const mine = me ? players.find((p) => p.name.toLowerCase() === me.name.toLowerCase()) : undefined;
    const others = players.filter((p) => p !== mine);
    const shown = others.slice(-8);
    return (
      <div className="st-stage g-phone g-plobby">
        <div className="g-phone__inner g-center g-plobby__me">
          <button type="button" className="g-plobby__avatar" onClick={() => setEditingSticker(true)} aria-label="Edit your sticker">
            <div className="st-anim-slap"><Avatar kind={mine?.avatar ?? me?.avatar} name={me?.name ?? ''} size={180} decorative /></div>
            <span className="g-plobby__edit">Edit</span>
          </button>
          <div className="st-display g-plobby__title">{resumedMidGame ? "You're back in!" : "You're stuck in!"}</div>
          {me && <div className="st-display g-plobby__name">{me.name}</div>}
          {myTeamName && <div className="st-tag">Team {myTeamName}</div>}
          <p className="st-muted g-plobby__hint">
            {resumedMidGame ? 'Your score is safe. The next question is on its way' : 'Find your sticker on the big screen. The game starts soon'}<span className="st-dots"><span>.</span><span>.</span><span>.</span></span>
          </p>
          {others.length > 0 && (
            <div className="g-plobby__others" aria-label={`${others.length} other players in the lobby`}>
              <span className="g-plobby__others-label">Also here</span>
              <div className="g-plobby__others-row">
                {shown.map((p) => (
                  <span key={p.name} className="g-plobby__other st-anim-slap" title={p.name} style={{ rotate: `${tiltFor(p.name)}deg` }}>
                    <Avatar kind={p.avatar} name={p.name} size={40} decorative />
                  </span>
                ))}
                {others.length > shown.length && <span className="g-plobby__more">+{others.length - shown.length}</span>}
              </div>
            </div>
          )}
        </div>
        {editingSticker && me && (
          <StickerEditor
            name={me.name}
            avatar={mine?.avatar ?? me.avatar}
            onSave={saveSticker}
            onClose={() => setEditingSticker(false)}
          />
        )}
        {overlays}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Lobby: host (big screen sticker wall)
  // ---------------------------------------------------------------------------

  const teamCount = teamSetupInput.split(',').filter((s) => s.trim()).length;
  return (
    <div className="st-stage g-host g-lobby">
      <header className="g-lobby__top">
        <span className="st-display g-lobby__brand">PopPop</span>
        <span className="st-muted">{quizTitle || 'Get ready'}</span>
      </header>

      <section className="g-lobby__join" aria-label="How to join">
        <div className="st-display g-lobby__how">Go to <span className="g-lobby__url">{joinHost}/j</span> and stick in</div>
        <div className="g-lobby__codes">
          <div className="g-lobby__code" aria-label={`Game code ${code}`}>{code}</div>
          <div className="st-sticker g-lobby__qr" style={{ transform: 'rotate(3deg)' }}>
            <QRCodeSVG value={joinUrl} size={168} bgColor="#ffffff" fgColor="#1B1033" level="M" />
          </div>
        </div>
        <div className="g-lobby__count">
          <span className="st-display g-lobby__count-num">{players.length}</span>
          <span className="g-lobby__count-label">{players.length === 1 ? 'sticker on the wall' : 'stickers on the wall'}</span>
        </div>
      </section>

      <section className="g-lobby__wall" aria-label="Players">
        {players.length === 0 && <p className="st-muted g-lobby__empty">Players will pop up here as they join.</p>}
        {players.map((p) => (
          <div key={p.name} className="g-lobby__slot" style={{ rotate: `${tiltFor(p.name)}deg` }}>
            <span className="st-chip st-anim-slap g-lobby__chip" style={{ background: colorFor(p.name) }}>
              <Avatar kind={p.avatar} name={p.name} size={40} decorative />
              {p.name}
              {teamsEnabled && p.teamName && <span className="g-lobby__team">{p.teamName}</span>}
            </span>
          </div>
        ))}
      </section>

      <footer className="g-host__bar">
        <div className="g-lobby__teams">
          {showTeams ? (
            <>
              <label className="st-sr-only" htmlFor="team-names">Team names, separated by commas</label>
              <input
                id="team-names"
                className="st-input g-lobby__team-input"
                placeholder="Team names: Red, Blue"
                value={teamSetupInput}
                onChange={(e) => setTeamSetupInput(e.target.value)}
              />
              <button
                type="button"
                className="st-btn st-btn--quiet"
                disabled={teamCount < 2}
                onClick={() => {
                  const names = teamSetupInput.split(',').map((s) => s.trim()).filter(Boolean);
                  if (names.length >= 2) socket.emit('host:set-teams', { code, teamNames: names });
                }}
              >
                {teamsEnabled ? 'Update teams' : 'Use teams'}
              </button>
            </>
          ) : (
            <button type="button" className="st-btn st-btn--quiet" onClick={() => setShowTeams(true)}>
              {teamsEnabled ? `Teams: ${teamNames.join(', ')}` : 'Play in teams'}
            </button>
          )}
        </div>
        <button type="button" className="st-btn st-btn--ink st-btn--lg" onClick={startGame} disabled={players.length === 0}>
          {players.length === 0 ? 'Waiting for players…' : 'Start game'}
        </button>
      </footer>
      {overlays}
    </div>
  );
};

export default Game;
