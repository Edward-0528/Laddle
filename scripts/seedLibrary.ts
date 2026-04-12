

import * as admin from 'firebase-admin';
import { LIBRARY_QUIZZES } from '../src/data/libraryQuizzes';

// Initialize with application default credentials
// Set GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccount.json
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'ladle-a41d6',
  });
}

const db = admin.firestore();
const COLLECTION = 'quizzes';

async function seedLibrary() {
  const col = db.collection(COLLECTION);

  // Fetch existing template titles to skip duplicates
  const existing = await col
    .where('isTemplate', '==', true)
    .where('createdBy', '==', 'SYSTEM')
    .get();
  const existingTitles = new Set(existing.docs.map((d) => d.data().title as string));

  let seeded = 0;
  for (const template of LIBRARY_QUIZZES) {
    if (existingTitles.has(template.title)) {
      console.log(`[Seed] Skipping existing: "${template.title}"`);
      continue;
    }

    const questions = template.questions.map((q, i) => ({
      ...q,
      id: `q${String(i + 1).padStart(2, '0')}`,
    }));

    await col.add({
      ...template,
      questions,
      createdBy: 'SYSTEM',
      isTemplate: true,
      isPublic: false,
      stats: { timesPlayed: 0, totalPlayers: 0, averageScore: 0 },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`[Seed] ✅ Added: "${template.title}"`);
    seeded++;
  }

  console.log(`\n[Seed] Done — ${seeded} new templates added to Firestore.`);
  process.exit(0);
}

seedLibrary().catch((err) => {
  console.error('[Seed] Error:', err);
  process.exit(1);
});
