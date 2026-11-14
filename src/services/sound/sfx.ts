// ---------------------------------------------------------------------------
// Sound effects. Short, bright and bubbly, never harsh: no red-alert buzzers,
// a wrong answer is a soft "bwomp", not a punishment.
// ---------------------------------------------------------------------------

import { buzz, duck, hiss, tone } from './engine';

const C5 = 523.25, D5 = 587.33, E5 = 659.25, G5 = 783.99, A5 = 880, C6 = 1046.5, E6 = 1318.5, G6 = 1568;

/** A sticker landing on the wall. `seed` varies the pitch per player. */
export function pop(seed = 0) {
  const base = 520 + (seed % 7) * 60;
  tone({ freq: base * 1.9, to: base * 0.7, type: 'sine', dur: 0.12, gain: 0.35 });
  tone({ freq: base * 3, to: base * 1.4, type: 'triangle', dur: 0.05, gain: 0.08 });
  hiss({ dur: 0.03, gain: 0.08, freq: 4500, q: 2 });
}

/** Light UI tap. */
export function tap() {
  tone({ freq: 900, to: 600, type: 'triangle', dur: 0.05, gain: 0.15 });
}

/** New question: swoosh up plus a sticker slap. */
export function questionIn() {
  duck(0.3, 900);
  hiss({ dur: 0.35, gain: 0.18, freq: 400, to: 5000, q: 0.8 });
  tone({ freq: 140, to: 60, type: 'sine', at: 0.3, dur: 0.18, gain: 0.5 });
  hiss({ at: 0.3, dur: 0.06, gain: 0.2, freq: 2000, q: 0.7 });
  tone({ freq: G5, at: 0.34, dur: 0.12, gain: 0.12, type: 'triangle' });
}

/** Countdown woodblock; `urgent` for the last three seconds. */
export function tick(urgent = false) {
  tone({ freq: urgent ? 1650 : 1250, type: 'triangle', dur: 0.06, gain: urgent ? 0.28 : 0.16 });
  tone({ freq: urgent ? 3300 : 2500, type: 'sine', dur: 0.025, gain: 0.05 });
}

/** Player taps an answer tile: a squishy press. */
export function squish() {
  tone({ freq: 420, to: 180, type: 'sine', dur: 0.12, gain: 0.35 });
  hiss({ dur: 0.05, gain: 0.06, freq: 1200, q: 1.5 });
  buzz(18);
}

/** Server confirmed the answer: a satisfying two-step click. */
export function locked() {
  tone({ freq: 700, type: 'square', dur: 0.03, gain: 0.06 });
  tone({ freq: 1050, type: 'square', at: 0.06, dur: 0.04, gain: 0.06 });
}

/** Time's up: a cheeky honk. */
export function timeUp() {
  duck(0.2, 900);
  tone({ freq: 233, to: 196, type: 'sawtooth', dur: 0.32, gain: 0.12 });
  tone({ freq: 175, to: 147, type: 'square', dur: 0.32, gain: 0.07 });
}

/** Correct answer is revealed on the big screen: stamp + sparkle. */
export function reveal() {
  duck(0.25, 1200);
  tone({ freq: 110, to: 55, type: 'sine', dur: 0.2, gain: 0.55 });
  hiss({ dur: 0.08, gain: 0.25, freq: 1800, q: 0.6 });
  [C6, E6, G6].forEach((f, i) => tone({ freq: f, at: 0.08 + i * 0.05, dur: 0.25, gain: 0.08, type: 'sine' }));
}

/** You got it right (phone). */
export function correct() {
  [C5, E5, G5, C6].forEach((f, i) => tone({ freq: f, at: i * 0.07, dur: i === 3 ? 0.35 : 0.12, gain: 0.22, type: 'triangle' }));
  tone({ freq: E6, at: 0.28, dur: 0.4, gain: 0.06, type: 'sine' });
  buzz([30, 40, 30]);
}

/** You missed (phone): soft and friendly. */
export function wrong() {
  tone({ freq: 330, to: 300, type: 'triangle', dur: 0.16, gain: 0.2 });
  tone({ freq: 262, to: 220, type: 'triangle', at: 0.18, dur: 0.3, gain: 0.2 });
  buzz(120);
}

/** Too slow (phone). */
export function noAnswer() {
  tone({ freq: 392, to: 370, type: 'sine', dur: 0.14, gain: 0.15 });
  tone({ freq: 294, to: 277, type: 'sine', at: 0.16, dur: 0.22, gain: 0.15 });
}

/** Leaderboard slides in: ratchet + swoosh. */
export function leaderboard() {
  duck(0.4, 1000);
  hiss({ dur: 0.4, gain: 0.12, freq: 6000, to: 800, q: 0.7 });
  for (let i = 0; i < 6; i++) tone({ freq: 1800 + i * 120, type: 'square', at: 0.05 + i * 0.045, dur: 0.02, gain: 0.04 });
}

/** Someone climbed the leaderboard. */
export function rankUp(at = 0) {
  tone({ freq: E5, to: A5, type: 'triangle', at, dur: 0.12, gain: 0.14 });
}

/** Drum roll that builds for `secs`, ending in a cymbal crash. */
export function drumroll(secs = 2.4) {
  let t = 0;
  let gap = 0.11;
  while (t < secs) {
    hiss({ at: t, dur: 0.06, gain: 0.08 + (t / secs) * 0.14, freq: 900, q: 0.8 });
    tone({ freq: 180, to: 120, type: 'sine', at: t, dur: 0.05, gain: 0.05 + (t / secs) * 0.08 });
    t += gap;
    gap = Math.max(0.035, gap * 0.94);
  }
  hiss({ at: secs, dur: 1.2, gain: 0.22, freq: 7000, q: 0.4, type: 'highpass' });
  tone({ freq: 80, to: 40, type: 'sine', at: secs, dur: 0.4, gain: 0.5 });
}

/** Winner fanfare. */
export function fanfare(at = 0) {
  duck(0.15, 2500);
  const notes: Array<[number, number, number]> = [
    [G5, 0, 0.12], [G5, 0.14, 0.12], [G5, 0.28, 0.12], [C6, 0.44, 0.6],
  ];
  notes.forEach(([f, t, d]) => {
    tone({ freq: f, type: 'sawtooth', at: at + t, dur: d, gain: 0.09 });
    tone({ freq: f / 2, type: 'triangle', at: at + t, dur: d, gain: 0.12 });
  });
  [C5, E5, G5, C6].forEach((f) => tone({ freq: f, type: 'triangle', at: at + 0.44, dur: 1.1, gain: 0.07 }));
  confetti(at + 0.44);
}

/** Crackly confetti sparkle. */
export function confetti(at = 0) {
  for (let i = 0; i < 14; i++) {
    tone({ freq: 2000 + Math.random() * 3000, type: 'sine', at: at + i * 0.06 + Math.random() * 0.03, dur: 0.05, gain: 0.04 });
  }
}

/** Your final placement (phone). */
export function placement(rank: number) {
  if (rank === 1) { fanfare(); buzz([40, 60, 40, 60, 120]); return; }
  if (rank <= 3) {
    [E5, G5, C6].forEach((f, i) => tone({ freq: f, at: i * 0.1, dur: 0.25, gain: 0.2, type: 'triangle' }));
    confetti(0.3);
    buzz([30, 50, 30]);
    return;
  }
  [C5, D5, E5].forEach((f, i) => tone({ freq: f, at: i * 0.1, dur: 0.2, gain: 0.18, type: 'triangle' }));
}

/** Game paused / resumed. */
export function paused() { tone({ freq: 660, to: 330, type: 'sine', dur: 0.25, gain: 0.18 }); }
export function resumed() { tone({ freq: 330, to: 660, type: 'sine', dur: 0.2, gain: 0.18 }); }
