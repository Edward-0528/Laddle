// ---------------------------------------------------------------------------
// Student Progress Types
// Stored in Firestore under studentProgress/{uid}/entries subcollection.
// ---------------------------------------------------------------------------

export interface StudentProgressEntry {
  id: string;
  uid: string;
  playerName: string;
  quizTitle: string;
  gameCode: string;
  score: number;
  rank: number;
  totalPlayers: number;
  playedAt: number;   // epoch ms
}

export type NewStudentProgressEntry = Omit<StudentProgressEntry, 'id'>;
