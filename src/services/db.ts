// ---------------------------------------------------------------------------
// Firestore Helper — db.ts
// Thin typed wrappers around Firestore primitives.
//
// Why this exists:
//   Every service file was duplicating a "if (!db) throw" guard and calling
//   collection() / doc() directly. This module centralises that boilerplate
//   so individual services stay focused on business logic.
//
// Usage:
//   import { getCol, getDocRef, safeFetchDoc, safeFetchDocs } from './db';
// ---------------------------------------------------------------------------

import {
  collection,
  doc,
  getDoc,
  getDocs,
  CollectionReference,
  DocumentReference,
  DocumentSnapshot,
  QuerySnapshot,
  Query,
  DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

/** Throws a clear error when Firestore hasn't been initialised. */
function requireDb() {
  if (!db) {
    throw new Error(
      '[Ladle] Firestore is not initialised. Check your Firebase environment variables.'
    );
  }
  return db;
}

// ---------------------------------------------------------------------------
// Collection / Document References
// ---------------------------------------------------------------------------

/**
 * Returns a typed CollectionReference for the given collection path.
 * Throws if Firestore is not initialised.
 */
export function getCol<T = DocumentData>(path: string): CollectionReference<T> {
  return collection(requireDb(), path) as CollectionReference<T>;
}

/**
 * Returns a typed DocumentReference for a document inside a collection.
 * Throws if Firestore is not initialised.
 */
export function getDocRef<T = DocumentData>(
  collectionPath: string,
  docId: string
): DocumentReference<T> {
  return doc(requireDb(), collectionPath, docId) as DocumentReference<T>;
}

// ---------------------------------------------------------------------------
// Read Helpers
// ---------------------------------------------------------------------------

/**
 * Fetches a single document and returns its snapshot.
 * Throws if the document does not exist.
 */
export async function safeFetchDoc<T = DocumentData>(
  collectionPath: string,
  docId: string
): Promise<DocumentSnapshot<T>> {
  const ref = getDocRef<T>(collectionPath, docId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error(`[Ladle] Document not found: ${collectionPath}/${docId}`);
  }
  return snap;
}

/**
 * Runs a query and returns its snapshot.
 * Use getCol() + query() to build the query, then pass it here.
 */
export async function safeFetchDocs<T = DocumentData>(
  q: Query<T>
): Promise<QuerySnapshot<T>> {
  return getDocs(q);
}
