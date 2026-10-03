/**
 * Admin authentication via Cloudflare Access.
 *
 * Access sits in front of /admin and /api/admin at the edge and handles the
 * login itself. This check is the second lock: it verifies the signed JWT
 * Access attaches to each request, so the admin API stays closed even if the
 * Access application is misconfigured, removed, or bypassed through a
 * *.pages.dev hostname it doesn't cover.
 *
 * Needs ACCESS_TEAM_DOMAIN (e.g. "silk.cloudflareaccess.com") and ACCESS_AUD
 * (the application's audience tag). Without them every request is refused,
 * except on localhost during development.
 */
import { isLocal } from './limits.js'

let certsCache = { domain: null, keys: null, fetchedAt: 0 }

async function signingKeys(teamDomain) {
  // Access rotates keys every six weeks with overlap, so an hour of caching is safe.
  const fresh = certsCache.domain === teamDomain && Date.now() - certsCache.fetchedAt < 3600_000
  if (!fresh) {
    const res = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`)
    if (!res.ok) throw new Error(`Access certs ${res.status}`)
    certsCache = { domain: teamDomain, keys: (await res.json()).keys, fetchedAt: Date.now() }
  }
  return certsCache.keys
}

function base64UrlDecode(segment) {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
}

function tokenFrom(request) {
  const header = request.headers.get('Cf-Access-Jwt-Assertion')
  if (header) return header
  const cookie = request.headers.get('Cookie') ?? ''
  return cookie.match(/(?:^|;\s*)CF_Authorization=([^;]+)/)?.[1] ?? null
}

/** The signed-in admin's email, or null if the request isn't authenticated. */
export async function adminEmail(request, env) {
  if (isLocal(request)) return 'dev@localhost'
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return null

  const token = tokenFrom(request)
  if (!token) return null
  const [headerB64, payloadB64, signatureB64] = token.split('.')
  if (!signatureB64) return null

  try {
    const decoder = new TextDecoder()
    const header = JSON.parse(decoder.decode(base64UrlDecode(headerB64)))
    const payload = JSON.parse(decoder.decode(base64UrlDecode(payloadB64)))
    if (header.alg !== 'RS256') return null

    const jwk = (await signingKeys(env.ACCESS_TEAM_DOMAIN)).find((k) => k.kid === header.kid)
    if (!jwk) return null
    const key = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    )
    const valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      base64UrlDecode(signatureB64),
      new TextEncoder().encode(`${headerB64}.${payloadB64}`),
    )
    if (!valid) return null

    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
    if (!audiences.includes(env.ACCESS_AUD)) return null
    if (payload.iss !== `https://${env.ACCESS_TEAM_DOMAIN}`) return null
    if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) return null
    if (!payload.email) return null

    // Optional extra allowlist, in case the Access policy is ever loosened.
    const allowed = (env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
    if (allowed.length && !allowed.includes(payload.email.toLowerCase())) return null

    return payload.email
  } catch {
    return null
  }
}
