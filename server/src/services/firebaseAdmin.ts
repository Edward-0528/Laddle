// ---------------------------------------------------------------------------
// Firebase Admin (optional)
// Initialised lazily from FIREBASE_ADMIN_CREDENTIALS (a service-account JSON
// string). Used to verify users' ID tokens on HTTP routes and to write
// server-only data such as billing entitlements.
// ---------------------------------------------------------------------------

import type { Request } from 'express';
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from '../utils/logger';

let app: App | null | undefined;

function getAdminApp(): App | null {
  if (app !== undefined) return app;
  try {
    if (getApps().length) {
      app = getApps()[0];
    } else if (process.env.FIREBASE_ADMIN_CREDENTIALS) {
      app = initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS)) });
    } else {
      app = null;
    }
  } catch (err: any) {
    logger.error('Firebase Admin init failed', { message: err?.message });
    app = null;
  }
  return app;
}

export function adminConfigured(): boolean {
  return getAdminApp() !== null;
}

export function adminDb() {
  const a = getAdminApp();
  return a ? getFirestore(a) : null;
}

export interface VerifiedUser {
  uid: string;
  email?: string;
}

/**
 * Reads `Authorization: Bearer <Firebase ID token>` and verifies it.
 * Returns null when the header is missing, the token is invalid, or Admin is
 * not configured.
 */
export async function verifyRequestUser(req: Request): Promise<VerifiedUser | null> {
  const header = req.headers.authorization || '';
  const match = /^Bearer (.+)$/.exec(header);
  const a = getAdminApp();
  if (!match || !a) return null;
  try {
    const decoded = await getAuth(a).verifyIdToken(match[1]);
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    return null;
  }
}
