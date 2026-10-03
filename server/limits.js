/**
 * Abuse controls for the public endpoints: a salted IP hash, a fixed-window
 * rate limiter in D1, and Cloudflare Turnstile verification.
 *
 * Pages Functions can't use the Workers rate-limiting binding, so the limiter
 * lives in D1. It is approximate under bursts across colos, which is fine:
 * the real ceiling on spend is the credit limit set on the OpenRouter key.
 */

export function isLocal(request) {
  const { hostname } = new URL(request.url)
  return hostname === 'localhost' || hostname === '127.0.0.1'
}

export async function ipHash(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
  const data = new TextEncoder().encode(`${env.IP_HASH_SALT ?? 'silk-support'}:${ip}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest).slice(0, 12)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Counts one hit against `key` and reports whether it is still within `limit` per `windowSeconds`. */
export async function allow(db, key, limit, windowSeconds) {
  const now = Math.floor(Date.now() / 1000)
  // The window is stored as its start time, so windows of every size share one sweep.
  const windowStart = now - (now % windowSeconds)
  const row = await db
    .prepare(
      `INSERT INTO rate_limits (key, window, count) VALUES (?, ?, 1)
       ON CONFLICT (key, window) DO UPDATE SET count = count + 1
       RETURNING count`,
    )
    .bind(key, windowStart)
    .first()

  // Finished windows are dead weight; sweep anything over two days old now and then.
  if (Math.random() < 0.02) {
    await db.prepare('DELETE FROM rate_limits WHERE window < ?').bind(now - 2 * 86400).run()
  }
  return row.count <= limit
}

/**
 * True if the Turnstile token is valid. Fails closed: without a configured
 * secret every request is refused, except on localhost during development.
 */
export async function verifyTurnstile(token, request, env) {
  if (isLocal(request)) return true
  if (!env.TURNSTILE_SECRET || !token) return false
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: env.TURNSTILE_SECRET,
      response: token,
      remoteip: request.headers.get('CF-Connecting-IP') ?? undefined,
    }),
  })
  const outcome = await res.json()
  return outcome.success === true
}
