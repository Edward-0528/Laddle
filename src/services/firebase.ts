// ---------------------------------------------------------------------------
// Firebase Configuration
// Initializes Firebase services used by the Ladle application.
// All configuration values are loaded from environment variables to ensure
// no API keys or secrets are committed to source control.
//
// Services initialized:
//   - Firebase App (core)
//   - Firestore (quiz storage, user profiles)
//   - Firebase Auth (user authentication)
// ---------------------------------------------------------------------------

import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Only initialize Firebase if a valid API key is provided.
// This allows the application to run in development without Firebase
// credentials by gracefully degrading to socket-only mode.
let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;
let storage: FirebaseStorage | undefined;

if (firebaseConfig.apiKey) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  storage = getStorage(app);
  console.log('[Ladle] Firebase initialized successfully');
} else {
  console.log('[Ladle] Firebase not configured - running in local-only mode');
}

export { app, db, auth, storage };
