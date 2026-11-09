// ---------------------------------------------------------------------------
// Avatar: one of the 20 sticker characters at any size.
// ---------------------------------------------------------------------------

import { avatarForName, avatarLabel, isAvatarKind, type AvatarKind } from './avatars';

interface AvatarProps {
  kind?: string;
  /** Used to pick a stable avatar when kind is missing. */
  name?: string;
  size?: number;
  className?: string;
  /** Decorative avatars next to a visible name should be hidden from screen readers. */
  decorative?: boolean;
}

export default function Avatar({ kind, name = '', size = 48, className = '', decorative = false }: AvatarProps) {
  const k: AvatarKind = isAvatarKind(kind) ? kind : avatarForName(name);
  return (
    <img
      src={`/avatars/${k}.webp`}
      alt={decorative ? '' : avatarLabel(k)}
      width={size}
      height={size}
      draggable={false}
      className={className}
      style={{ width: size, height: size, maxWidth: 'none', flexShrink: 0, filter: 'drop-shadow(0 3px 5px rgba(27,16,51,.2))' }}
    />
  );
}
