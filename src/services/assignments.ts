// ---------------------------------------------------------------------------
// Assignment Service
// Firestore CRUD for async assignments and student responses.
//
// Collections:
//   assignments/          — one doc per assignment
//   assignmentResponses/  — one doc per student submission
// ---------------------------------------------------------------------------

import {
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { getCol, getDocRef } from './db';
import type { Assignment, NewAssignment, AssignmentResponse, NewAssignmentResponse } from '../types/assignment';

const ASSIGNMENTS = 'assignments';
const RESPONSES = 'assignmentResponses';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function docToAssignment(snap: any): Assignment {
  const d = snap.data();
  return {
    id: snap.id,
    hostUid: d.hostUid ?? '',
    quizId: d.quizId ?? '',
    quizTitle: d.quizTitle ?? '',
    questions: d.questions ?? [],
    code: d.code ?? '',
    deadline: d.deadline instanceof Timestamp ? d.deadline.toMillis() : (d.deadline ?? 0),
    label: d.label ?? undefined,
    createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toMillis() : (d.createdAt ?? 0),
    closed: d.closed ?? false,
  };
}

function docToResponse(snap: any): AssignmentResponse {
  const d = snap.data();
  return {
    id: snap.id,
    assignmentId: d.assignmentId ?? '',
    assignmentCode: d.assignmentCode ?? '',
    playerName: d.playerName ?? '',
    answers: d.answers ?? [],
    score: d.score ?? 0,
    totalQuestions: d.totalQuestions ?? 0,
    submittedAt: d.submittedAt instanceof Timestamp ? d.submittedAt.toMillis() : (d.submittedAt ?? 0),
  };
}

/** Generates a random 6-char uppercase code */
export function generateAssignmentCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0/1/I ambiguity
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ---------------------------------------------------------------------------
// Assignment CRUD
// ---------------------------------------------------------------------------

/** Create a new assignment and return its Firestore id */
export async function createAssignment(data: NewAssignment): Promise<string | null> {
  if (!db) return null;
  try {
    const col = getCol(ASSIGNMENTS);
    const ref = await addDoc(col, { ...data, createdAt: Date.now() });
    return ref.id;
  } catch (err) {
    console.error('[Ladle] createAssignment failed', err);
    return null;
  }
}

/** Fetch all assignments for a host, ordered by createdAt desc */
export async function getHostAssignments(hostUid: string): Promise<Assignment[]> {
  if (!db) return [];
  try {
    const col = getCol(ASSIGNMENTS);
    const q = query(col, where('hostUid', '==', hostUid), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(docToAssignment);
  } catch (err) {
    console.error('[Ladle] getHostAssignments failed', err);
    return [];
  }
}

/** Look up an assignment by its 6-char student code */
export async function getAssignmentByCode(code: string): Promise<Assignment | null> {
  if (!db) return null;
  try {
    const col = getCol(ASSIGNMENTS);
    const q = query(col, where('code', '==', code.toUpperCase().trim()));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return docToAssignment(snap.docs[0]);
  } catch (err) {
    console.error('[Ladle] getAssignmentByCode failed', err);
    return null;
  }
}

/** Fetch a single assignment by Firestore id */
export async function getAssignment(id: string): Promise<Assignment | null> {
  if (!db) return null;
  try {
    const ref = getDocRef(ASSIGNMENTS, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return docToAssignment(snap);
  } catch (err) {
    console.error('[Ladle] getAssignment failed', err);
    return null;
  }
}

/** Close / archive an assignment */
export async function closeAssignment(id: string): Promise<void> {
  if (!db) return;
  try {
    await updateDoc(getDocRef(ASSIGNMENTS, id), { closed: true });
  } catch (err) {
    console.error('[Ladle] closeAssignment failed', err);
  }
}

/** Delete an assignment and (optionally) its responses */
export async function deleteAssignment(id: string): Promise<void> {
  if (!db) return;
  try {
    await deleteDoc(getDocRef(ASSIGNMENTS, id));
  } catch (err) {
    console.error('[Ladle] deleteAssignment failed', err);
  }
}

// ---------------------------------------------------------------------------
// Response CRUD
// ---------------------------------------------------------------------------

/** Save a student's completed responses */
export async function submitAssignmentResponse(data: NewAssignmentResponse): Promise<string | null> {
  if (!db) return null;
  try {
    const col = getCol(RESPONSES);
    const ref = await addDoc(col, { ...data, submittedAt: Date.now() });
    return ref.id;
  } catch (err) {
    console.error('[Ladle] submitAssignmentResponse failed', err);
    return null;
  }
}

/** Fetch all responses for a given assignment */
export async function getAssignmentResponses(assignmentId: string): Promise<AssignmentResponse[]> {
  if (!db) return [];
  try {
    const col = getCol(RESPONSES);
    const q = query(col, where('assignmentId', '==', assignmentId), orderBy('submittedAt', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(docToResponse);
  } catch (err) {
    console.error('[Ladle] getAssignmentResponses failed', err);
    return [];
  }
}

/** Check if a student has already submitted (by name, to prevent duplicates) */
export async function hasStudentSubmitted(assignmentId: string, playerName: string): Promise<boolean> {
  if (!db) return false;
  try {
    const col = getCol(RESPONSES);
    const q = query(col,
      where('assignmentId', '==', assignmentId),
      where('playerName', '==', playerName.trim())
    );
    const snap = await getDocs(q);
    return !snap.empty;
  } catch {
    return false;
  }
}
