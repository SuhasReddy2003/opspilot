// Simple in-memory rate limiter.
// Note: this resets if the server restarts, and doesn't share state across
// multiple server instances. For a multi-instance production deployment,
// this would need to be backed by Redis (e.g. Upstash) instead.

const requestLog = new Map<string, number[]>()

const WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS = 10 // per user, per minute

export function checkRateLimit(identifier: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now()
  const timestamps = requestLog.get(identifier) || []

  // Keep only requests within the current window
  const recent = timestamps.filter((t) => now - t < WINDOW_MS)

  if (recent.length >= MAX_REQUESTS) {
    const oldestInWindow = recent[0]
    const retryAfterSeconds = Math.ceil((WINDOW_MS - (now - oldestInWindow)) / 1000)
    return { allowed: false, retryAfterSeconds }
  }

  recent.push(now)
  requestLog.set(identifier, recent)
  return { allowed: true }
}