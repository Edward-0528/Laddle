// ---------------------------------------------------------------------------
// Trivia packs: ready-to-host quizzes bundled with the app (no database
// needed). A host picks a pack and starts a game in one tap, or copies it
// into their own quizzes to edit.
// ---------------------------------------------------------------------------

export type TriviaCategoryId =
  | 'general'
  | 'pop-culture'
  | 'movies'
  | 'tv'
  | 'music'
  | 'star-wars'
  | 'sci-fi'
  | 'disney'
  | 'christmas'
  | 'throwback'
  | 'food-drink'
  | 'sports'
  | 'geography'
  | 'science-nature';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface TriviaQuestion {
  text: string;
  /** 4 choices (2 for true/false). */
  choices: string[];
  /** Index into choices. */
  answer: number;
}

export interface TriviaPack {
  /** Stable slug, unique across all packs, e.g. "star-wars-original-trilogy". */
  id: string;
  title: string;
  category: TriviaCategoryId;
  /** One short, fun sentence. */
  blurb: string;
  difficulty: Difficulty;
  /** Seconds per question (default 20). */
  timeLimit?: number;
  questions: TriviaQuestion[];
}
