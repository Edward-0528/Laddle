// ---------------------------------------------------------------------------
// Background music for the big screen, generated on the fly by a tiny step
// sequencer. Two moods:
//   lobby    : relaxed, bouncy groove while people join
//   question : a ticking "thinking" loop that gets busier near the end
// Kept quiet under the effects (see MUSIC_LEVEL and duck() in engine.ts).
// ---------------------------------------------------------------------------

import { audio, hiss, musicOut, tone } from './engine';

export type Mood = 'lobby' | 'question' | null;

interface Pattern {
  bpm: number;
  bass: Array<number | null>;   // 16 steps, frequencies
  lead: Array<number | null>;
  hat: boolean[];
  kick: boolean[];
}

const n = (semi: number, base = 220) => base * Math.pow(2, semi / 12); // semitones from A3

// C major pentatonic bounce
const LOBBY: Pattern = {
  bpm: 104,
  bass: [n(3, 110), null, null, n(10, 110), null, null, n(3, 110), null, n(8, 110), null, null, n(15, 110), null, null, n(10, 110), null],
  lead: [n(15), null, n(19), null, n(22), null, n(19), n(15), null, n(17), null, n(15), n(12), null, n(10), null],
  hat: [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, true],
  kick: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
};

// A minor thinking loop
const QUESTION: Pattern = {
  bpm: 132,
  bass: [n(0, 110), null, n(0, 110), null, n(0, 110), null, n(0, 110), n(3, 110), n(-2, 110), null, n(-2, 110), null, n(-2, 110), null, n(-4, 110), null],
  lead: [n(12), null, null, n(15), null, null, n(19), null, n(17), null, null, n(15), null, n(12), null, null],
  hat: Array.from({ length: 16 }, (_, i) => i % 2 === 0),
  kick: [true, false, false, false, false, false, true, false, true, false, false, false, false, false, false, false],
};

let mood: Mood = null;
let intense = false;
let step = 0;
let nextTime = 0;
let timer: number | null = null;

function schedule() {
  const c = audio();
  const out = musicOut();
  if (!c || !out || !mood) return;
  if (c.state !== 'running') return; // waiting for the first tap
  const p = mood === 'lobby' ? LOBBY : QUESTION;
  const stepDur = 60 / p.bpm / 4;
  if (nextTime < c.currentTime) nextTime = c.currentTime + 0.05;
  while (nextTime < c.currentTime + 0.2) {
    const at = nextTime - c.currentTime;
    const i = step % 16;
    const bass = p.bass[i];
    if (bass) tone({ freq: bass, type: 'triangle', at, dur: stepDur * 1.6, gain: 0.5, out });
    const lead = p.lead[i];
    if (lead && (mood === 'lobby' || step % 32 < 16 || intense)) {
      tone({ freq: lead * 2, type: 'sine', at, dur: stepDur * 1.2, gain: 0.22, out });
      tone({ freq: lead * 4, type: 'sine', at, dur: stepDur * 0.5, gain: 0.05, out });
    }
    if (p.hat[i] || (intense && i % 2 === 1)) hiss({ at, dur: 0.03, gain: intense ? 0.12 : 0.08, freq: 8000, q: 1, type: 'highpass', out });
    if (p.kick[i]) tone({ freq: 120, to: 45, type: 'sine', at, dur: 0.14, gain: 0.7, out });
    nextTime += stepDur;
    step++;
  }
}

export function setMood(next: Mood) {
  if (next === mood) return;
  mood = next;
  step = 0;
  nextTime = 0;
  intense = false;
  if (!mood) {
    if (timer !== null) { window.clearInterval(timer); timer = null; }
    return;
  }
  if (timer === null) timer = window.setInterval(schedule, 50);
}

/** Busier hats and lead for the final seconds of a question. */
export function setIntense(on: boolean) { intense = on; }
