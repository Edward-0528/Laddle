// ---------------------------------------------------------------------------
// Answer identity: every choice is a color + a shape + a letter, so players
// who can't tell colors apart still know which tile is which.
// ---------------------------------------------------------------------------

export const ANSWER_STYLES = [
  { letter: 'A', shape: 'triangle', color: 'var(--st-answer-1)', ink: 'var(--st-ink)' },
  { letter: 'B', shape: 'diamond', color: 'var(--st-answer-2)', ink: 'var(--st-ink)' },
  { letter: 'C', shape: 'circle', color: 'var(--st-answer-3)', ink: 'var(--st-ink)' },
  { letter: 'D', shape: 'square', color: 'var(--st-answer-4)', ink: '#FFFFFF' },
] as const;

export function answerStyle(index: number) {
  return ANSWER_STYLES[index % ANSWER_STYLES.length];
}

export default function AnswerShape({ index, size = 48, fill }: { index: number; size?: number; fill?: string }) {
  const s = answerStyle(index);
  const f = fill ?? s.ink;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
      {s.shape === 'triangle' && <path d="M12 3 L22 20 L2 20 Z" fill={f} />}
      {s.shape === 'diamond' && <path d="M12 2 L22 12 L12 22 L2 12 Z" fill={f} />}
      {s.shape === 'circle' && <circle cx="12" cy="12" r="10" fill={f} />}
      {s.shape === 'square' && <rect x="3" y="3" width="18" height="18" rx="3" fill={f} />}
    </svg>
  );
}

export function CheckIcon({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 12.5 L10 18 L20 6" fill="none" stroke={color} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CrossIcon({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6 L18 18 M18 6 L6 18" fill="none" stroke={color} strokeWidth="3.4" strokeLinecap="round" />
    </svg>
  );
}

export function ArrowIcon({ up, size = 16 }: { up: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d={up ? 'M12 4 L21 18 L3 18 Z' : 'M12 20 L21 6 L3 6 Z'} fill="currentColor" />
    </svg>
  );
}
