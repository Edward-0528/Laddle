// ---------------------------------------------------------------------------
// Quiz Type Definitions
// Shared types for quiz data structures used across the application.
// ---------------------------------------------------------------------------

export type QuestionType = 'multiple-choice' | 'true-false';

export interface QuizQuestion {
  id: string;
  text: string;
  choices: string[];
  correctAnswerIndex: number;
  timeLimit: number;
  questionType?: QuestionType;
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

// K-12 subject taxonomy aligned to California state curriculum standards
export type SubjectArea =
  | 'math'
  | 'science'
  | 'english'
  | 'history'
  | 'social-studies'
  | 'other';

// Grade band groupings used in the library filter UI
export type GradeBand = 'K-2' | '3-5' | '6-8' | '9-12';

// Individual grade levels (K = Kindergarten)
export type GradeLevel = 'K' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12';

export interface Quiz {
  id: string;
  createdBy: string;       // uid, or 'SYSTEM' for library templates
  title: string;
  description: string;
  category: string;
  coverImage?: string;
  isPublic: boolean;
  isTemplate?: boolean;    // true = read-only library quiz; users fork a copy
  subject?: SubjectArea;
  gradeLevel?: GradeLevel;
  gradeBand?: GradeBand;
  caStandard?: string;     // e.g. "CCSS.MATH.3.OA" — California curriculum alignment
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
