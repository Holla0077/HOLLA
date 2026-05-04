const ipHits = new Map<string, number[]>();

/**
 * Simple in‑memory rate limiter.
 * @param ip - requester's IP address
 * @param maxRequests - max allowed requests
 * @param windowMs - time window in milliseconds
 * @returns true if the request is allowed
 */
export function rateLimit(ip: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Get or create hit list for this IP
  const hits = ipHits.get(ip) || [];
  // Filter out hits older than the window
  const recentHits = hits.filter(timestamp => timestamp > windowStart);
  recentHits.push(now);
  ipHits.set(ip, recentHits);

  return recentHits.length <= maxRequests;
}