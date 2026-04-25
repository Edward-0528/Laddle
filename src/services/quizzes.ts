// ---------------------------------------------------------------------------
// Quiz Service
// Firestore CRUD operations for managing quizzes. Each quiz is stored in
// the top-level "quizzes" collection, keyed by auto-generated document ID.
// ---------------------------------------------------------------------------

import {
  addDoc,
  updateDoc,
  deleteDoc,
  increment,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { getCol, getDocRef, safeFetchDoc, safeFetchDocs } from './db';
import type { Quiz, QuizQuestion, QuizSettings } from '../types/quiz';

const COLLECTION_NAME = 'quizzes';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCollection() {
  return getCol(COLLECTION_NAME);
}

/**
 * Converts a Firestore document snapshot into a typed Quiz object.
 * Exported so other services (e.g. library.ts) can reuse without duplication.
 */
export function docToQuiz(docSnap: any): Quiz {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    title: data.title ?? '',
    description: data.description ?? '',
    category: data.category ?? 'General Knowledge',
    questions: data.questions ?? [],
    settings: data.settings ?? {},
    stats: data.stats ?? { timesPlayed: 0, totalPlayers: 0, averageScore: 0 },
    createdBy: data.createdBy ?? '',
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt ?? '',
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt ?? '',
    isPublic: data.isPublic ?? false,
    // Library / template fields
    isTemplate: data.isTemplate ?? false,
    subject: data.subject ?? undefined,
    gradeLevel: data.gradeLevel ?? undefined,
    gradeBand: data.gradeBand ?? undefined,
    caStandard: data.caStandard ?? undefined,
    standards: data.standards ?? undefined,
    rating: data.rating ?? 0,
    forkCount: data.forkCount ?? 0,
  };
}

// ---------------------------------------------------------------------------
// CRUD Operations
// ---------------------------------------------------------------------------

/**
 * Creates a new quiz document in Firestore.
 * Returns the auto-generated document ID.
 */
export async function createQuiz(
  userId: string,
  title: string,
  description: string,
  category: string,
  questions: QuizQuestion[],
  settings: QuizSettings,
  isPublic: boolean = false
): Promise<string> {
  const col = getCollection();
  const docRef = await addDoc(col, {
    title,
    description,
    category,
    questions,
    settings,
    stats: { timesPlayed: 0, totalPlayers: 0, averageScore: 0 },
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isPublic,
  });
  console.log('[Ladle] Quiz created with ID:', docRef.id);
  return docRef.id;
}

/**
 * Retrieves a single quiz by document ID.
 */
export async function getQuiz(quizId: string): Promise<Quiz | null> {
  if (!db) return null;
  try {
    const snap = await safeFetchDoc(COLLECTION_NAME, quizId);
    return docToQuiz(snap);
  } catch {
    return null;
  }
}

/**
 * Retrieves all quizzes created by a specific user, ordered by most
 * recently updated first.
 */
export async function getUserQuizzes(userId: string): Promise<Quiz[]> {
  const col = getCollection();
  const q = query(col, where('createdBy', '==', userId), orderBy('updatedAt', 'desc'));
  const snapshot = await safeFetchDocs(q);
  return snapshot.docs.map(docToQuiz);
}

/**
 * Updates an existing quiz document.
 */
export async function updateQuiz(
  quizId: string,
  data: Partial<Pick<Quiz, 'title' | 'description' | 'category' | 'questions' | 'settings' | 'isPublic'>>
): Promise<void> {
  if (!db) return;
  const docRef = getDocRef(COLLECTION_NAME, quizId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
  console.log('[Ladle] Quiz updated:', quizId);
}

/**
 * Deletes a quiz document.
 */
export async function deleteQuiz(quizId: string): Promise<void> {
  if (!db) return;
  const docRef = getDocRef(COLLECTION_NAME, quizId);
  await deleteDoc(docRef);
  console.log('[Ladle] Quiz deleted:', quizId);
}

/**
 * Increments the play stats for a quiz after a game ends.
 */
export async function incrementQuizStats(
  quizId: string,
  playerCount: number,
  averageScore: number
): Promise<void> {
  const existing = await getQuiz(quizId);
  if (!existing) return;

  const stats = existing.stats;
  const totalGames = stats.timesPlayed + 1;
  const totalPlayers = stats.totalPlayers + playerCount;
  const newAverage =
    (stats.averageScore * stats.timesPlayed + averageScore) / totalGames;

  await updateQuiz(quizId, {} as any);
  if (!db) return;
  const docRef = getDocRef(COLLECTION_NAME, quizId);
  await updateDoc(docRef, {
    'stats.timesPlayed': totalGames,
    'stats.totalPlayers': totalPlayers,
    'stats.averageScore': Math.round(newAverage),
    updatedAt: serverTimestamp(),
  });
  console.log('[Ladle] Quiz stats updated:', quizId);
}

// ---------------------------------------------------------------------------
// Marketplace
// ---------------------------------------------------------------------------

/**
 * Returns all publicly visible quizzes, ordered by rating desc.
 * Optionally filter by subject, gradeBand, or a text search on title.
 */
export async function getPublicQuizzes(opts: {
  subject?: string;
  gradeBand?: string;
  search?: string;
  maxResults?: number;
} = {}): Promise<Quiz[]> {
  const col = getCollection();
  let q = query(
    col,
    where('isPublic', '==', true),
    orderBy('rating', 'desc'),
    limit(opts.maxResults ?? 60)
  );
  if (opts.subject) {
    q = query(col, where('isPublic', '==', true), where('subject', '==', opts.subject), orderBy('rating', 'desc'), limit(opts.maxResults ?? 60));
  }
  const snapshot = await safeFetchDocs(q);
  let results = snapshot.docs.map(docToQuiz);
  // Client-side grade band + text search (Firestore doesn't support multi-field inequality)
  if (opts.gradeBand) results = results.filter((qz) => qz.gradeBand === opts.gradeBand);
  if (opts.search) {
    const term = opts.search.toLowerCase();
    results = results.filter(
      (qz) =>
        qz.title.toLowerCase().includes(term) ||
        qz.description.toLowerCase().includes(term) ||
        qz.category.toLowerCase().includes(term)
    );
  }
  return results;
}

/**
 * Upvotes a quiz in the marketplace (increments rating by 1).
 */
export async function upvoteQuiz(quizId: string): Promise<void> {
  if (!db) return;
  const docRef = getDocRef(COLLECTION_NAME, quizId);
  await updateDoc(docRef, { rating: increment(1) });
}

/**
 * Forks a quiz into the given user's collection and increments forkCount.
 */
export async function forkQuiz(quiz: Quiz, userId: string): Promise<string> {
  const col = getCollection();
  const docRef = await addDoc(col, {
    title: `${quiz.title} (Copy)`,
    description: quiz.description,
    category: quiz.category,
    questions: quiz.questions,
    settings: quiz.settings,
    stats: { timesPlayed: 0, totalPlayers: 0, averageScore: 0 },
    createdBy: userId,
    isPublic: false,
    isTemplate: false,
    subject: quiz.subject,
    gradeLevel: quiz.gradeLevel,
    gradeBand: quiz.gradeBand,
    standards: quiz.standards,
    caStandard: quiz.caStandard,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  // Bump the original's forkCount
  const origRef = getDocRef(COLLECTION_NAME, quiz.id);
  await updateDoc(origRef, { forkCount: increment(1) });
  return docRef.id;
}
