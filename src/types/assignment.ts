// ---------------------------------------------------------------------------
// Assignment Type Definitions
// Assignments are async quizzes students complete before a deadline.
// No live socket connection is required — all data is stored in Firestore.
// ---------------------------------------------------------------------------

import type { QuizQuestion } from './quiz';

export interface Assignment {
  id: string;
  hostUid: string;
  quizId: string;
  quizTitle: string;
  /** Snapshot of questions at creation time (changes to the source quiz won't affect this) */
  questions: QuizQuestion[];
  /** Join code shown to students, 6 uppercase alpha chars */
  code: string;
  /** Unix ms timestamp of the deadline */
  deadline: number;
  /** Optional label e.g. "Period 3 – Homework #4" */
  label?: string;
  createdAt: number;
  /** Whether the host has closed/archived this assignment */
  closed: boolean;
}

export type NewAssignment = Omit<Assignment, 'id'>;

// ---------------------------------------------------------------------------
// Response — one per student submission
// ---------------------------------------------------------------------------

export interface AssignmentAnswer {
  questionId: string;
  selectedIndex: number;
  correct: boolean;
  timeTakenMs: number;
}

export interface AssignmentResponse {
  id: string;
  assignmentId: string;
  assignmentCode: string;
  playerName: string;
  answers: AssignmentAnswer[];
  score: number;
  /** Total questions in this assignment */
  totalQuestions: number;
  submittedAt: number;
}

export type NewAssignmentResponse = Omit<AssignmentResponse, 'id'>;
