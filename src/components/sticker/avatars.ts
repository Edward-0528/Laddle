// ---------------------------------------------------------------------------
// Sticker avatars: 20 silly characters players pick (or get at random) when
// they join. Images live in /public/avatars/<kind>.webp (384px). The server
// validates the same list in server/src/validators/schemas.ts (AVATAR_KINDS).
// ---------------------------------------------------------------------------

export const AVATARS = [
  { kind: 'goose', label: 'Silly Goose' },
  { kind: 'tomato', label: 'Tow Truck Tomato' },
  { kind: 'pickle', label: 'Pickle Pilot' },
  { kind: 'donut', label: 'Disco Donut' },
  { kind: 'cactus', label: 'Sleepy Cactus' },
  { kind: 'toast', label: 'Toast Ghost' },
  { kind: 'avocado', label: 'Avocado Astronaut' },
  { kind: 'cloud', label: 'Grumpy Cloud' },
  { kind: 'banana', label: 'Banana Detective' },
  { kind: 'taco', label: 'Taco Cat' },
  { kind: 'snail', label: 'Snail Mail' },
  { kind: 'waffle', label: 'Waffle Wizard' },
  { kind: 'broccoli', label: 'Broccoli Rockstar' },
  { kind: 'moon', label: 'Moody Moon' },
  { kind: 'cupcake', label: 'Cupcake Knight' },
  { kind: 'penguin', label: 'Sweater Penguin' },
  { kind: 'jelly', label: 'Jelly Jellyfish' },
  { kind: 'egg', label: 'Egg Roll' },
  { kind: 'lemon', label: 'Lemon Lifeguard' },
  { kind: 'frog', label: 'Party Frog' },
] as const;

export type AvatarKind = (typeof AVATARS)[number]['kind'];

export function isAvatarKind(value: unknown): value is AvatarKind {
  return typeof value === 'string' && AVATARS.some((a) => a.kind === value);
}

export function avatarLabel(kind: AvatarKind): string {
  return AVATARS.find((a) => a.kind === kind)?.label ?? 'Player';
}

export function randomAvatar(except?: AvatarKind): AvatarKind {
  const pool = AVATARS.filter((a) => a.kind !== except);
  return pool[Math.floor(Math.random() * pool.length)].kind;
}

/** Stable fallback for players who joined without picking (e.g. older clients). */
export function avatarForName(name: string): AvatarKind {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATARS[h % AVATARS.length].kind;
}
