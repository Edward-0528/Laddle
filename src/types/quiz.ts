// ---------------------------------------------------------------------------
// Quiz Type Definitions
// Shared types for quiz data structures used across the application.
// ---------------------------------------------------------------------------

export interface QuizQuestion {
  id: string;
  text: string;
  choices: string[];
  correctAnswerIndex: number;
  timeLimit: number;
  points?: number;
  imageUrl?: string;
}

export interface QuizSettings {
  questionDuration: number;
  showLeaderboardAfterEach: boolean;
  shuffleQuestions: boolean;
  shuffleChoices: boolean;
  maxPlayers: number;
}

export interface QuizStats {
  timesPlayed: number;
  totalPlayers: number;
  averageScore: number;
}

export interface Quiz {
  id: string;
  createdBy: string;
  title: string;
  description: string;
  category: string;
  coverImage?: string;
  isPublic: boolean;
  questions: QuizQuestion[];
  settings: QuizSettings;
  stats: QuizStats;
  createdAt: string;
  updatedAt: string;
}

/**
 * Default settings applied to newly created quizzes.
 */
export const DEFAULT_QUIZ_SETTINGS: QuizSettings = {
  questionDuration: 30,
  showLeaderboardAfterEach: true,
  shuffleQuestions: false,
  shuffleChoices: false,
  maxPlayers: 20,
};

/**
 * Initial stats for a brand new quiz.
 */
export const DEFAULT_QUIZ_STATS: QuizStats = {
  timesPlayed: 0,
  totalPlayers: 0,
  averageScore: 0,
};

/**
 * Available quiz categories for organizing and filtering quizzes.
 */
export const QUIZ_CATEGORIES = [
  'General Knowledge',
  'Science',
  'History',
  'Geography',
  'Movies & TV',
  'Music',
  'Sports',
  'Technology',
  'Literature',
  'Art & Culture',
  'Food & Drink',
  'Pop Culture',
  'Custom',
] as const;

export type QuizCategory = (typeof QUIZ_CATEGORIES)[number];
