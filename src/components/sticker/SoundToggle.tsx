// ---------------------------------------------------------------------------
// Sound controls. Host gets sound + music; phones get a single sound toggle.
// If the browser hasn't allowed audio yet (no tap since the page loaded),
// the host sees a "Tap for sound" hint.
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import { audio, getSettings, isLocked, setSettings, subscribe } from '../../services/sound/engine';
import { tap } from '../../services/sound/sfx';
import './SoundToggle.css';

function SpeakerIcon({ on }: { on: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
      {on ? (
        <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      ) : (
        <path d="M16.5 9.5l5 5M21.5 9.5l-5 5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      )}
    </svg>
  );
}

function NoteIcon({ on }: { on: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 17V6l10-2v11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx="6.5" cy="17.5" r="2.6" fill="currentColor" />
      <circle cx="16.5" cy="15.5" r="2.6" fill="currentColor" />
      {!on && <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />}
    </svg>
  );
}

export default function SoundToggle({ withMusic = false, className = '' }: { withMusic?: boolean; className?: string }) {
  const [s, setS] = useState(getSettings());
  const [locked, setLocked] = useState(isLocked());

  useEffect(() => {
    const off = subscribe((next) => { setS({ ...next }); setLocked(isLocked()); });
    const iv = window.setInterval(() => setLocked(isLocked()), 1000);
    return () => { off(); window.clearInterval(iv); };
  }, []);

  function toggle(key: 'sfx' | 'music') {
    audio()?.resume().catch(() => {});
    setSettings({ [key]: !s[key] });
    if (key === 'sfx' && !s.sfx) setTimeout(tap, 50);
  }

  return (
    <div className={`snd ${className}`}>
      {withMusic && locked && (s.sfx || s.music) && (
        <button type="button" className="snd__hint" onClick={() => audio()?.resume().catch(() => {})}>Tap for sound</button>
      )}
      {withMusic && (
        <button type="button" className={`snd__btn ${s.music ? '' : 'is-off'}`} onClick={() => toggle('music')} aria-pressed={s.music} aria-label={s.music ? 'Turn music off' : 'Turn music on'} title="Music">
          <NoteIcon on={s.music} />
        </button>
      )}
      <button type="button" className={`snd__btn ${s.sfx ? '' : 'is-off'}`} onClick={() => toggle('sfx')} aria-pressed={s.sfx} aria-label={s.sfx ? 'Turn sound off' : 'Turn sound on'} title="Sound effects">
        <SpeakerIcon on={s.sfx} />
      </button>
    </div>
  );
}
