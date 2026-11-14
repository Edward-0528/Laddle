// ---------------------------------------------------------------------------
// useGameSounds: turns game moments into sound. Everything is driven by
// state transitions, so Game.tsx only reports what is happening.
//
// Big screen (host): the "show": join pops, music, countdown, stings, podium.
// Phones (players): personal and quiet: tap, lock, right/wrong, placement,
// plus vibration. A pub with 30 phones beeping in unison is not fun.
// ---------------------------------------------------------------------------

import { useEffect, useRef } from 'react';
import { setVolume } from '../services/sound/engine';
import { setIntense, setMood } from '../services/sound/music';
import * as sfx from '../services/sound/sfx';

interface Args {
  isHost: boolean;
  gameState: 'lobby' | 'question' | 'reveal' | 'results' | 'ended' | 'gone';
  playerNames: string[];
  questionIndex: number | null;
  timeLeft: number;
  isPaused: boolean;
  revealPhase: string;
  /** Phone only: did my answer match, null if I didn't answer. */
  myResult: 'correct' | 'wrong' | 'none' | null;
  hasAnswered: boolean;
  /** Players who climbed on this round's leaderboard (host). */
  climbers: number;
  /** Phone only: my final rank. */
  myFinalRank: number | null;
}

const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };

export function useGameSounds(a: Args) {
  const prev = useRef<Args | null>(null);
  const known = useRef<Set<string>>(new Set());

  // Big screen plays louder than phones
  useEffect(() => { setVolume(a.isHost ? 0.9 : 0.55); }, [a.isHost]);

  // Stop the music when leaving the game screen
  useEffect(() => () => setMood(null), []);

  useEffect(() => {
    const p = prev.current;
    prev.current = a;

    // ---- Players joining (host wall pops; quiet on phones) ----
    const newcomers = a.playerNames.filter((n) => !known.current.has(n));
    if (p && a.isHost && a.gameState === 'lobby') {
      newcomers.slice(0, 5).forEach((name, i) => setTimeout(() => sfx.pop(hash(name)), i * 90));
    }
    known.current = new Set(a.playerNames);

    // ---- Music mood (host only) ----
    if (a.isHost) {
      if (a.isPaused) setMood(null);
      else if (a.gameState === 'lobby') setMood('lobby');
      else if (a.gameState === 'question' && a.timeLeft > 0) setMood('question');
      else setMood(null);
      setIntense(a.gameState === 'question' && a.timeLeft > 0 && a.timeLeft <= 5);
    }

    if (!p) return; // first render: don't replay sounds for a state we joined mid-way

    // ---- Pause / resume ----
    if (a.isPaused !== p.isPaused && a.gameState === 'question') {
      if (a.isPaused) sfx.paused(); else sfx.resumed();
    }

    // ---- New question ----
    if (a.gameState === 'question' && a.questionIndex !== p.questionIndex && a.questionIndex !== null) {
      if (a.isHost) sfx.questionIn(); else sfx.tap();
    }

    // ---- Countdown ----
    if (a.gameState === 'question' && !a.isPaused && a.timeLeft !== p.timeLeft && a.timeLeft < p.timeLeft) {
      if (a.timeLeft > 0 && a.timeLeft <= 5) {
        if (a.isHost) sfx.tick(a.timeLeft <= 3);
        else if (!a.hasAnswered && a.timeLeft <= 3) sfx.tick(true);
      }
      if (a.timeLeft === 0 && a.isHost) sfx.timeUp();
    }

    // ---- Answer locked in (phone) ----
    if (!a.isHost && a.hasAnswered && !p.hasAnswered && a.gameState === 'question') sfx.locked();

    // ---- Reveal ----
    if (a.gameState === 'reveal' && p.gameState === 'question') {
      if (a.isHost) sfx.reveal();
      else if (a.myResult === 'correct') sfx.correct();
      else if (a.myResult === 'wrong') sfx.wrong();
      else sfx.noAnswer();
    }
    if (a.isHost && a.gameState === 'reveal' && a.revealPhase === 'leaderboard' && p.revealPhase !== 'leaderboard') {
      sfx.leaderboard();
      for (let i = 0; i < Math.min(3, a.climbers); i++) sfx.rankUp(0.5 + i * 0.12);
    }

    // ---- Final results ----
    if (a.gameState === 'results' && p.gameState !== 'results') {
      if (a.isHost) { sfx.drumroll(2.4); sfx.fanfare(2.4); }
      else if (a.myFinalRank) setTimeout(() => sfx.placement(a.myFinalRank!), 400);
    }
  });
}
