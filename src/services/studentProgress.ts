// ---------------------------------------------------------------------------
// Student Progress Service
// Writes per-player game history to Firestore under studentProgress/{uid}.
// ---------------------------------------------------------------------------

import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import type { StudentProgressEntry, NewStudentProgressEntry } from '../types/studentProgress';

const COLLECTION = 'studentProgress';

export async function saveStudentProgress(
  entry: NewStudentProgressEntry
): Promise<string | null> {
  if (!db) return null;
  try {
    const ref = await addDoc(
      collection(db, COLLECTION, entry.uid, 'entries'),
      entry
    );
    return ref.id;
  } catch (err) {
    console.error('[Ladle] Failed to save student progress:', err);
    return null;
  }
}

export async function getStudentProgress(
  uid: string,
  maxEntries = 50
): Promise<StudentProgressEntry[]> {
  if (!db) return [];
  try {
    const q = query(
      collection(db, COLLECTION, uid, 'entries'),
      orderBy('playedAt', 'desc'),
      limit(maxEntries)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as StudentProgressEntry));
  } catch (err) {
    console.error('[Ladle] Failed to fetch student progress:', err);
    return [];
  }
}
