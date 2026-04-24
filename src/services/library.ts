// ---------------------------------------------------------------------------
// Library Service
// Firestore operations for pre-built template quizzes and the
// "fork" operation that copies a template into a user's own library.
//
// Data model note (senior engineer rationale):
//   Templates live in the SAME "quizzes" collection as user quizzes.
//   They are distinguished by:
//     createdBy  === 'SYSTEM'
//     isTemplate === true
//   This means:
//   1. No duplicate service code — getQuiz(), updateQuiz() all still work
//   2. Firestore queries can join user + template quizzes in one pass
//   3. New templates can be added via Firebase console with zero deploys
//   4. Usage stats (timesPlayed) are tracked just like user quizzes
//
// Forking:
//   When a teacher clicks "Use This Quiz", we addDoc a deep copy with
//   createdBy = uid, isTemplate = false. The original is never mutated.
//   Teachers can then edit, rename, and launch the fork freely.
// ---------------------------------------------------------------------------

import {
  addDoc,
  query,
  where,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { getCol, getDocRef, safeFetchDocs } from './db';
import type { Quiz, SubjectArea, GradeBand } from '../types/quiz';
import { LIBRARY_QUIZZES } from '../data/libraryQuizzes';
import { docToQuiz } from './quizzes';

const COLLECTION_NAME = 'quizzes';

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * Fetches all library template quizzes, optionally filtered by subject
 * and/or grade band. Results are ordered alphabetically by title.
 *
 * Falls back to a minimal two-field query if composite indexes aren't
 * ready yet (first deploy scenario), then filters client-side.
 */
export async function getLibraryQuizzes(opts?: {
  subject?: SubjectArea;
  gradeBand?: GradeBand;
}): Promise<Quiz[]> {
  if (!db) return [];

  const col = getCol(COLLECTION_NAME);

  let results: Quiz[] = [];

  try {
    // Attempt the full query (requires composite index)
    const constraints: Parameters<typeof query>[1][] = [
      where('isTemplate', '==', true),
      where('createdBy', '==', 'SYSTEM'),
    ];

    if (opts?.subject) {
      constraints.push(where('subject', '==', opts.subject));
    }
    if (opts?.gradeBand) {
      constraints.push(where('gradeBand', '==', opts.gradeBand));
    }

    const q = query(col, ...constraints);
    const snapshot = await safeFetchDocs(q);
    results = snapshot.docs.map(docToQuiz);
  } catch (err: any) {
    // Composite index not ready yet — fall back to the minimal 2-field query
    // and filter client-side. This covers the first few minutes after deploy.
    if (err?.code === 'failed-precondition' || err?.message?.includes('index')) {
      console.warn('[Ladle] Composite index not ready, falling back to client-side filter');
      const fallbackQ = query(
        col,
        where('isTemplate', '==', true),
        where('createdBy', '==', 'SYSTEM')
      );
      const snapshot = await safeFetchDocs(fallbackQ);
      results = snapshot.docs.map(docToQuiz);

      // Apply filters client-side
      if (opts?.subject) {
        results = results.filter((q) => q.subject === opts.subject);
      }
      if (opts?.gradeBand) {
        results = results.filter((q) => q.gradeBand === opts.gradeBand);
      }
    } else {
      throw err; // Re-throw unexpected errors
    }
  }

  // Always sort client-side for consistency
  results.sort((a, b) => a.title.localeCompare(b.title));
  return results;
}

// ---------------------------------------------------------------------------
// Fork (copy template → user's library)
// ---------------------------------------------------------------------------

/**
 * Creates a personal, editable copy of a library template quiz in the
 * teacher's own library. Returns the new quiz's Firestore document ID.
 *
 * The original template is never modified. Stats on the template are
 * incremented to show how many times it has been "adopted."
 */
export async function forkQuizToUser(
  template: Quiz,
  userId: string
): Promise<string> {
  if (!db) throw new Error('Firestore is not initialized.');

  const col = getCol(COLLECTION_NAME);

  const newDoc = await addDoc(col, {
    title: template.title,
    description: template.description,
    category: template.category,
    subject: template.subject ?? null,
    gradeLevel: template.gradeLevel ?? null,
    gradeBand: template.gradeBand ?? null,
    caStandard: template.caStandard ?? null,
    questions: template.questions,
    settings: template.settings,
    stats: { timesPlayed: 0, totalPlayers: 0, averageScore: 0 },
    createdBy: userId,
    isTemplate: false,
    isPublic: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    // Track lineage — useful for analytics / "based on template" badge
    forkedFrom: template.id,
  });

  // Increment adoptions counter on the template (best-effort, no throw)
  try {
    const batch = writeBatch(db);
    const templateRef = getDocRef(COLLECTION_NAME, template.id);
    batch.update(templateRef, {
      'stats.timesPlayed': (template.stats.timesPlayed ?? 0) + 1,
    });
    await batch.commit();
  } catch (_) {
    // Non-critical — swallow silently
  }

  console.log('[Ladle] Forked template', template.id, '→ new quiz', newDoc.id);
  return newDoc.id;
}

// ---------------------------------------------------------------------------
// Seed (run once from the admin/CLI seed script)
// ---------------------------------------------------------------------------

/**
 * Seeds the Firestore "quizzes" collection with all library templates.
 * Safe to run multiple times — checks for existing templates by title
 * before inserting to prevent duplicates.
 *
 * Usage:
 *   import { seedLibrary } from './services/library';
 *   await seedLibrary();  // called from scripts/seedLibrary.ts
 */
export async function seedLibrary(): Promise<void> {
  if (!db) throw new Error('Firestore not initialized.');

  const col = getCol(COLLECTION_NAME);

  // Fetch existing template titles to skip duplicates
  const existing = await safeFetchDocs(
    query(col, where('isTemplate', '==', true), where('createdBy', '==', 'SYSTEM'))
  );
  const existingTitles = new Set(existing.docs.map((d) => (d.data() as { title: string }).title));

  let seeded = 0;
  for (const template of LIBRARY_QUIZZES) {
    if (existingTitles.has(template.title)) {
      console.log(`[Seed] Skipping existing: "${template.title}"`);
      continue;
    }

    // Attach stable IDs to each question
    const questions = template.questions.map((q, i) => ({
      ...q,
      id: `q${i + 1}`,
    }));

    await addDoc(col, {
      ...template,
      questions,
      createdBy: 'SYSTEM',
      isTemplate: true,
      isPublic: false,
      stats: { timesPlayed: 0, totalPlayers: 0, averageScore: 0 },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log(`[Seed] Added: "${template.title}"`);
    seeded++;
  }

  console.log(`[Seed] Done — ${seeded} new templates added.`);
}
