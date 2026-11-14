// ---------------------------------------------------------------------------
// Sound engine
// Every sound is synthesized with the Web Audio API: no audio files to load,
// license or cache, and it all matches the bouncy Sticker Sheet feel.
//
// Browsers only allow audio after a tap or key press, so the context is
// created lazily and resumed on the first user gesture (see unlock()).
// Settings live in localStorage and any component can subscribe to them.
// ---------------------------------------------------------------------------

export interface SoundSettings {
  sfx: boolean;
  music: boolean;
}

const KEY = 'ladle.sound';
const DEFAULTS: SoundSettings = { sfx: true, music: true };

let settings: SoundSettings = load();
const listeners = new Set<(s: SoundSettings) => void>();

function load(): SoundSettings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export function getSettings(): SoundSettings { return settings; }

export function setSettings(next: Partial<SoundSettings>) {
  settings = { ...settings, ...next };
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* ignore */ }
  if (sfxBus) sfxBus.gain.value = settings.sfx ? 1 : 0;
  if (musicBus) musicBus.gain.value = settings.music ? MUSIC_LEVEL : 0;
  listeners.forEach((fn) => fn(settings));
}

export function subscribe(fn: (s: SoundSettings) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

// ---------------------------------------------------------------------------
// Audio graph: master <- sfx bus, music bus (ducked while sfx play)
// ---------------------------------------------------------------------------

const MUSIC_LEVEL = 0.22;
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfxBus: GainNode | null = null;
let musicBus: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let volume = 0.8; // per-device overall level (phones play softer)

export function audio(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  master = ctx.createGain();
  master.gain.value = volume;
  const comp = ctx.createDynamicsCompressor(); // keeps stacked pops from clipping
  comp.threshold.value = -14;
  comp.ratio.value = 4;
  master.connect(comp).connect(ctx.destination);
  sfxBus = ctx.createGain();
  sfxBus.gain.value = settings.sfx ? 1 : 0;
  sfxBus.connect(master);
  musicBus = ctx.createGain();
  musicBus.gain.value = settings.music ? MUSIC_LEVEL : 0;
  musicBus.connect(master);
  return ctx;
}

export function sfxOut(): GainNode | null { audio(); return sfxBus; }
export function musicOut(): GainNode | null { audio(); return musicBus; }

export function setVolume(v: number) {
  volume = v;
  if (master) master.gain.value = v;
}

export function isLocked(): boolean {
  return !ctx || ctx.state !== 'running';
}

/** Resume audio on the first tap/key (browser autoplay rules). */
export function installUnlock() {
  const unlock = () => {
    const c = audio();
    if (c && c.state !== 'running') c.resume().then(() => listeners.forEach((fn) => fn(settings))).catch(() => {});
  };
  ['pointerdown', 'keydown', 'touchend'].forEach((ev) => window.addEventListener(ev, unlock, { passive: true }));
}

/** Briefly lower the music so an effect cuts through. */
export function duck(amount = 0.35, ms = 600) {
  if (!ctx || !musicBus || !settings.music) return;
  const t = ctx.currentTime;
  musicBus.gain.cancelScheduledValues(t);
  musicBus.gain.setValueAtTime(musicBus.gain.value, t);
  musicBus.gain.linearRampToValueAtTime(MUSIC_LEVEL * amount, t + 0.04);
  musicBus.gain.linearRampToValueAtTime(MUSIC_LEVEL, t + ms / 1000);
}

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

function noise(): AudioBuffer | null {
  const c = audio();
  if (!c) return null;
  if (!noiseBuffer) {
    noiseBuffer = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

export interface ToneOpts {
  freq: number;
  to?: number;          // glide target frequency
  type?: OscillatorType;
  at?: number;          // seconds from now
  dur?: number;         // seconds
  gain?: number;
  attack?: number;
  out?: AudioNode | null;
}

/** One enveloped oscillator note. */
export function tone({ freq, to, type = 'sine', at = 0, dur = 0.15, gain = 0.3, attack = 0.005, out }: ToneOpts) {
  const c = audio();
  const dest = out ?? sfxBus;
  if (!c || !dest || c.state !== 'running') return;
  const t = c.currentTime + at;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(dest);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

/** Filtered noise burst (claps, swooshes, hats, drum rolls). */
export function hiss({ at = 0, dur = 0.1, gain = 0.2, freq = 3000, to, q = 1, type = 'bandpass' as BiquadFilterType, out }: {
  at?: number; dur?: number; gain?: number; freq?: number; to?: number; q?: number; type?: BiquadFilterType; out?: AudioNode | null;
}) {
  const c = audio();
  const buf = noise();
  const dest = out ?? sfxBus;
  if (!c || !buf || !dest || c.state !== 'running') return;
  const t = c.currentTime + at;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(dest);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.05);
}

/** Phone vibration where supported (Android). Silently ignored elsewhere. */
export function buzz(pattern: number | number[]) {
  if (!settings.sfx) return;
  try { navigator.vibrate?.(pattern); } catch { /* ignore */ }
}
