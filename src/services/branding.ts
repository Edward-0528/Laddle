// ---------------------------------------------------------------------------
// Branding Service
// Stores and retrieves per-user branding (logo URL + primary colour).
// Logo is uploaded to Firebase Storage; the download URL is saved in Firestore
// under users/{uid}/branding.
// ---------------------------------------------------------------------------

import { updateDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './firebase';
import { getDocRef } from './db';

export interface BrandingSettings {
  logoUrl?: string;
  primaryColor?: string;
}

const USERS = 'users';

/** Fetch branding for a user (returns {} if none set) */
export async function getBranding(uid: string): Promise<BrandingSettings> {
  if (!db) return {};
  try {
    const snap = await getDoc(getDocRef(USERS, uid));
    if (!snap.exists()) return {};
    const data = snap.data();
    return data?.branding ?? {};
  } catch {
    return {};
  }
}

/** Save primary colour (no upload needed) */
export async function savePrimaryColor(uid: string, color: string): Promise<void> {
  if (!db) return;
  try {
    await updateDoc(getDocRef(USERS, uid), { 'branding.primaryColor': color });
  } catch (err) {
    console.error('[Ladle] savePrimaryColor failed', err);
  }
}

/** Upload a logo file and save the URL to Firestore. Returns the download URL. */
export async function uploadLogo(uid: string, file: File): Promise<string | null> {
  if (!storage || !db) return null;
  try {
    const ext = file.name.split('.').pop() ?? 'png';
    const storageRef = ref(storage, `logos/${uid}/logo.${ext}`);
    await uploadBytes(storageRef, file, { contentType: file.type });
    const url = await getDownloadURL(storageRef);
    await updateDoc(getDocRef(USERS, uid), { 'branding.logoUrl': url });
    return url;
  } catch (err) {
    console.error('[Ladle] uploadLogo failed', err);
    return null;
  }
}

/** Remove the logo from Storage and clear it from Firestore */
export async function removeLogo(uid: string): Promise<void> {
  if (!storage || !db) return;
  try {
    // Try to delete common extensions — ignore errors if file doesn't exist
    for (const ext of ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp']) {
      const r = ref(storage, `logos/${uid}/logo.${ext}`);
      await deleteObject(r).catch(() => {});
    }
    await updateDoc(getDocRef(USERS, uid), { 'branding.logoUrl': null });
  } catch (err) {
    console.error('[Ladle] removeLogo failed', err);
  }
}
