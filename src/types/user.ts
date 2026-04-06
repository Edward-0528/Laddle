// ---------------------------------------------------------------------------
// User Type Definitions
// Types for user profiles, authentication state, and plan configuration.
// ---------------------------------------------------------------------------

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Date;
  plan: UserPlan;
  quizzesCreated: number;
}

export type UserPlan = 'free' | 'pro';

/**
 * Plan limits define the maximum resources available for each tier.
 */
export interface PlanLimits {
  maxQuizzes: number;
  maxQuestionsPerQuiz: number;
  maxPlayersPerGame: number;
  canExportResults: boolean;
  hasCustomBranding: boolean;
  hasDetailedAnalytics: boolean;
}

/**
 * Configuration for each plan tier. Used for both client-side display
 * and server-side enforcement.
 */
export const PLAN_LIMITS: Record<UserPlan, PlanLimits> = {
  free: {
    maxQuizzes: 5,
    maxQuestionsPerQuiz: 20,
    maxPlayersPerGame: 20,
    canExportResults: false,
    hasCustomBranding: false,
    hasDetailedAnalytics: false,
  },
  pro: {
    maxQuizzes: Infinity,
    maxQuestionsPerQuiz: Infinity,
    maxPlayersPerGame: 100,
    canExportResults: true,
    hasCustomBranding: true,
    hasDetailedAnalytics: true,
  },
};
