// Shared security utilities for all API routes

// In-memory rate limiter (resets on cold start, good enough for Vercel serverless)
const ipHits = new Map();

/**
 * Returns true if the request should be blocked.
 * maxHits per windowMs per IP.
 */
export function isRateLimited(ip, { maxHits = 5, windowMs = 3600_000 } = {}) {
  const now = Date.now();
  const entry = ipHits.get(ip) || { hits: 0, resetAt: now + windowMs };

  if (now > entry.resetAt) {
    entry.hits = 0;
    entry.resetAt = now + windowMs;
  }

  entry.hits++;
  ipHits.set(ip, entry);

  return entry.hits > maxHits;
}

/** Strip HTML tags and trim to maxLen to prevent XSS in email output */
export function sanitize(value, maxLen = 500) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .slice(0, maxLen)
    .trim();
}

/** Allowed origin for CORS - only rickysachs.com */
export const ALLOWED_ORIGIN = 'https://rickysachs.com';

export function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/** Extract real IP from Vercel headers */
export function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}
