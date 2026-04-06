// ---------------------------------------------------------------------------
// Rate Limiter for Socket Events
// Tracks event counts per socket within a sliding time window. When a socket
// exceeds the configured maximum number of events within the window, further
// events are rejected until the window resets.
//
// This prevents abuse such as:
//   - Rapid game creation to exhaust server memory
//   - Spamming join requests
//   - Flooding answer submissions
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

interface RateLimitConfig {
  /** Maximum number of allowed events within the window. */
  maxEvents: number;
  /** Duration of the sliding window in milliseconds. */
  windowMs: number;
}

/**
 * In-memory store keyed by a composite of socketId and event name.
 * Entries are automatically cleaned up when checked and found expired.
 */
const rateLimitStore: Map<string, RateLimitEntry> = new Map();

/**
 * Checks whether a given socket has exceeded the rate limit for a specific
 * event type. Returns true if the event should be allowed, false if it
 * should be rejected.
 */
export function checkRateLimit(
  socketId: string,
  eventName: string,
  config: RateLimitConfig
): boolean {
  const key = `${socketId}:${eventName}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now - entry.windowStart > config.windowMs) {
    // Window has expired or no previous record exists. Start a new window.
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= config.maxEvents) {
    return false;
  }

  entry.count += 1;
  return true;
}

/**
 * Removes all rate limit entries for a disconnected socket.
 * Called during the disconnect handler to prevent memory leaks.
 */
export function clearRateLimits(socketId: string): void {
  for (const key of rateLimitStore.keys()) {
    if (key.startsWith(`${socketId}:`)) {
      rateLimitStore.delete(key);
    }
  }
}

// ---------------------------------------------------------------------------
// Default rate limit configurations for each event type.
// These can be adjusted based on observed traffic patterns.
// ---------------------------------------------------------------------------

export const RATE_LIMITS = {
  /** Host can create at most 3 games per minute. */
  hostCreate: { maxEvents: 3, windowMs: 60_000 },
  /** A socket can attempt to join at most 10 games per minute. */
  playerJoin: { maxEvents: 10, windowMs: 60_000 },
  /** A socket can submit at most 2 answers per 5 seconds (covers edge cases). */
  playerAnswer: { maxEvents: 2, windowMs: 5_000 },
  /** Host can start at most 5 games per minute. */
  hostStart: { maxEvents: 5, windowMs: 60_000 },
};
