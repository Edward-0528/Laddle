// ---------------------------------------------------------------------------
// Billing Service
// Wraps the server billing endpoints for Stripe Checkout.
// ---------------------------------------------------------------------------

import { authHeaders } from './authHeaders';

const API_BASE = import.meta.env.VITE_SERVER_URL || import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

/**
 * Creates a Stripe Checkout session and redirects the user to it.
 * The server reads who you are from your Firebase ID token, not from the body.
 */
export async function startProCheckout(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/billing/create-checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: '{}',
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
