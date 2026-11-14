// ---------------------------------------------------------------------------
// StickerEditor: a bottom sheet where a player changes their avatar and name
// while waiting in the lobby. Saving is handled by the caller.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import Avatar from './Avatar';
import { AVATARS, avatarLabel, isAvatarKind, randomAvatar, type AvatarKind } from './avatars';
import './StickerEditor.css';

interface Props {
  name: string;
  avatar?: string;
  onSave: (changes: { name: string; avatar: AvatarKind }) => Promise<string | null>; // resolves to an error message, or null
  onClose: () => void;
}

export default function StickerEditor({ name, avatar, onSave, onClose }: Props) {
  const [draftName, setDraftName] = useState(name);
  const [draftAvatar, setDraftAvatar] = useState<AvatarKind>(isAvatarKind(avatar) ? avatar : randomAvatar());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const trimmed = draftName.trim();
  const changed = trimmed !== name || draftAvatar !== avatar;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!trimmed) { setError('Your sticker needs a name.'); return; }
    if (!changed) { onClose(); return; }
    setSaving(true);
    setError('');
    const err = await onSave({ name: trimmed, avatar: draftAvatar });
    setSaving(false);
    if (err) setError(err);
    else onClose();
  }

  return (
    <div className="se-overlay" role="dialog" aria-modal="true" aria-label="Edit your sticker" onClick={onClose}>
      <form className="st-sticker se-sheet st-anim-peel" onSubmit={save} onClick={(e) => e.stopPropagation()} noValidate>
        <div className="se-head">
          <Avatar kind={draftAvatar} size={84} />
          <div className="se-head__text">
            <div className="st-display se-title">You're the {avatarLabel(draftAvatar)}</div>
            <button type="button" className="st-btn st-btn--lemon se-shuffle" onClick={() => setDraftAvatar(randomAvatar(draftAvatar))}>Shuffle</button>
          </div>
        </div>

        <div className="se-grid" role="group" aria-label="Pick a sticker">
          {AVATARS.map((a) => (
            <button
              key={a.kind}
              type="button"
              className={`se-pick ${a.kind === draftAvatar ? 'is-on' : ''}`}
              aria-pressed={a.kind === draftAvatar}
              aria-label={a.label}
              onClick={() => setDraftAvatar(a.kind)}
            >
              <Avatar kind={a.kind} size={40} decorative />
            </button>
          ))}
        </div>

        <label className="st-label" htmlFor="se-name">Name on your sticker</label>
        <input
          id="se-name"
          className="st-input"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value.slice(0, 30))}
          maxLength={30}
          autoComplete="nickname"
          enterKeyHint="done"
        />

        {error && <div className="st-error" role="alert">{error}</div>}

        <div className="se-actions">
          <button type="button" className="st-btn st-btn--quiet" onClick={onClose}>Cancel</button>
          <button type="submit" className="st-btn st-btn--ink se-save" disabled={saving || !trimmed}>
            {saving ? 'Saving…' : 'Save sticker'}
          </button>
        </div>
      </form>
    </div>
  );
}
