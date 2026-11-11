// ---------------------------------------------------------------------------
// Trivia library: categories + every bundled pack.
// ---------------------------------------------------------------------------

import type { AvatarKind } from '../../components/sticker/avatars';
import type { TriviaCategoryId, TriviaPack } from './types';
import { PACKS_A } from './packsA';
import { PACKS_B } from './packsB';
import { PACKS_C } from './packsC';

export type { TriviaCategoryId, TriviaPack, TriviaQuestion, Difficulty } from './types';

export interface TriviaCategory {
  id: TriviaCategoryId;
  label: string;
  color: string;
  ink: string;
  avatar: AvatarKind;
}

export const CATEGORIES: TriviaCategory[] = [
  { id: 'general', label: 'General Knowledge', color: '#FFD23F', ink: '#1B1033', avatar: 'egg' },
  { id: 'pop-culture', label: 'Pop Culture', color: '#FF4FA3', ink: '#1B1033', avatar: 'donut' },
  { id: 'movies', label: 'Movies', color: '#3D8BFF', ink: '#1B1033', avatar: 'toast' },
  { id: 'tv', label: 'TV', color: '#7B3CFF', ink: '#FFFFFF', avatar: 'cloud' },
  { id: 'music', label: 'Music', color: '#2EE6A8', ink: '#1B1033', avatar: 'broccoli' },
  { id: 'star-wars', label: 'Star Wars', color: '#1B1033', ink: '#FFD23F', avatar: 'avocado' },
  { id: 'sci-fi', label: 'Sci-Fi', color: '#6B2EFF', ink: '#FFFFFF', avatar: 'moon' },
  { id: 'disney', label: 'Disney & Pixar', color: '#FFC83D', ink: '#1B1033', avatar: 'cupcake' },
  { id: 'christmas', label: 'Christmas', color: '#FF6B5A', ink: '#1B1033', avatar: 'penguin' },
  { id: 'throwback', label: '80s & 90s', color: '#FF4FA3', ink: '#1B1033', avatar: 'waffle' },
  { id: 'food-drink', label: 'Food & Drink', color: '#FFC83D', ink: '#1B1033', avatar: 'taco' },
  { id: 'sports', label: 'Sports', color: '#3D8BFF', ink: '#1B1033', avatar: 'frog' },
  { id: 'geography', label: 'Geography', color: '#2EE6A8', ink: '#1B1033', avatar: 'snail' },
  { id: 'science-nature', label: 'Science & Nature', color: '#7B3CFF', ink: '#FFFFFF', avatar: 'cactus' },
];

export const ALL_PACKS: TriviaPack[] = [...PACKS_A, ...PACKS_B, ...PACKS_C];

export function categoryOf(id: TriviaCategoryId): TriviaCategory {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
}

export function isCategoryId(v: unknown): v is TriviaCategoryId {
  return typeof v === 'string' && CATEGORIES.some((c) => c.id === v);
}

export function packsIn(category?: TriviaCategoryId): TriviaPack[] {
  return category ? ALL_PACKS.filter((p) => p.category === category) : ALL_PACKS;
}

export function findPack(id: string): TriviaPack | undefined {
  return ALL_PACKS.find((p) => p.id === id);
}

/** Every pack shuffled into one long mixed round. */
export function mixedPack(size = 15): TriviaPack {
  const pool = ALL_PACKS.flatMap((p) => p.questions);
  const picked = [...pool].sort(() => Math.random() - 0.5).slice(0, size);
  return {
    id: 'mixed-bag',
    title: 'Mixed Bag',
    category: 'general',
    blurb: 'A little of everything, shuffled fresh every time.',
    difficulty: 'medium',
    timeLimit: 20,
    questions: picked,
  };
}
