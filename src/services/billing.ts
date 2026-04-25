// ---------------------------------------------------------------------------
// Billing Service
// Wraps the server billing endpoints for Stripe Checkout.
// ---------------------------------------------------------------------------

const API_BASE = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

/**
 * Creates a Stripe Checkout session and redirects the user to it.
 * @param uid  Firebase user UID
 * @param email  User email
 */
export async function startProCheckout(uid: string, email: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/billing/create-checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, email }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as any).error || 'Could not start checkout.');
  }

  const { url } = await res.json();
  if (url) {
    window.location.href = url;
  } else {
    throw new Error('No checkout URL returned.');
  }
}
