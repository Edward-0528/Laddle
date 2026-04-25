// ---------------------------------------------------------------------------
// Game Results Service
// Persists game history to Firestore and reads it back for the Dashboard
// "Recent Games" section and the full Results report page.
// ---------------------------------------------------------------------------

import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import type { GameResult, NewGameResult } from '../types/gameResult';

/**
 * Persists a completed game result. Returns the Firestore document ID,
 * or null if Firebase is not configured.
 */
export async function saveGameResult(data: NewGameResult): Promise<string | null> {
  if (!db) return null;
  try {
    const ref = await addDoc(collection(db, 'gameResults'), data);
    return ref.id;
  } catch (err) {
    console.error('[Ladle] Failed to save game result:', err);
    return null;
  }
}

/**
 * Returns the most recent N game results for a host, ordered newest first.
 * Returns an empty array if Firebase is not configured or if the query fails.
 */
export async function getRecentGames(
  hostUid: string,
  count = 5
): Promise<GameResult[]> {
  if (!db) return [];
  try {
    const q = query(
      collection(db, 'gameResults'),
      where('hostUid', '==', hostUid),
      orderBy('playedAt', 'desc'),
      limit(count)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as GameResult));
  } catch {
    return [];
  }
}

/**
 * Fetches a single game result by its Firestore document ID.
 * Returns null if not found or if Firebase is not configured.
 */
export async function getGameResult(gameId: string): Promise<GameResult | null> {
  if (!db) return null;
  try {
    const ref = doc(db, 'gameResults', gameId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as GameResult;
  } catch {
    return null;
  }
}
