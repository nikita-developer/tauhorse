import {ApiError} from './api-error.js'

const buckets = globalThis.__horse_feed_rate_limit_buckets__ || new Map()
if (!globalThis.__horse_feed_rate_limit_buckets__) {
  globalThis.__horse_feed_rate_limit_buckets__ = buckets
}

let cleanup_counter = 0
const security_stats = globalThis.__horse_feed_security_stats__ || {blocked: 0, blocked_by_key: {}}
if (!globalThis.__horse_feed_security_stats__) globalThis.__horse_feed_security_stats__ = security_stats

const cleanupExpiredBuckets = now => {
  cleanup_counter += 1
  if (cleanup_counter % 100 !== 0) return

  for (const [bucket_key, bucket] of buckets.entries()) {
    if (bucket.reset_at <= now) buckets.delete(bucket_key)
  }
}

export const enforceRateLimit = (event, {key, limit, window_ms}) => {
  const ip = getRequestIP(event, {xForwardedFor: true}) || 'unknown'
  const bucket_key = `${key}:${ip}`
  const now = Date.now()
  cleanupExpiredBuckets(now)

  const existing = buckets.get(bucket_key)

  if (!existing || existing.reset_at <= now) {
    buckets.set(bucket_key, {count: 1, reset_at: now + window_ms})
    return
  }

  existing.count += 1

  if (existing.count > limit) {
    setResponseHeader(event, 'Retry-After', String(Math.max(1, Math.ceil((existing.reset_at - now) / 1000))))
    security_stats.blocked += 1
    security_stats.blocked_by_key[key] = (security_stats.blocked_by_key[key] || 0) + 1
    throw new ApiError(429, 'Слишком много попыток. Повторите позже')
  }
}

export const getRateLimitSecurityStats = () => ({blocked: security_stats.blocked, blocked_by_key: {...security_stats.blocked_by_key}})
