// Adds the signed-in user's Firebase ID token so the server can verify who
// is calling. Returns no header when signed out or Firebase isn't configured.
import { auth } from './firebase';

export async function authHeaders(): Promise<Record<string, string>> {
  try {
    const token = await auth?.currentUser?.getIdToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}
