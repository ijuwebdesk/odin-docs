/**
 * Sends the retired Odin hostnames to their Silk equivalents.
 *
 * This lives in code rather than in Cloudflare config for two reasons. The
 * _redirects file cannot do it — the Pages docs list "Domain-level redirects"
 * as explicitly unsupported, because a source there is always a path. A
 * zone-level Redirect Rule is the lighter tool and the right layer, but it
 * needs Rulesets access on the heyodinai.com zone, which this project's
 * credentials do not carry. So the rename lives next to the site it renames,
 * and moves to a Redirect Rule the day someone with zone access wants it there.
 *
 * Only the registrable domain is swapped, so the subdomain is preserved:
 * support.heyodinai.com lands on support.heysilkai.com, and a bare
 * heyodinai.com would land on heysilkai.com. Path and query ride along on the
 * URL object; the fragment never leaves the browser, so it survives on its own.
 */
const LEGACY_APEX = 'heyodinai.com'
const CURRENT_APEX = 'heysilkai.com'

/**
 * The Silk host for a legacy one, or null if this host is not a legacy host.
 * Matching on the apex and on a "." + apex suffix rather than endsWith(apex)
 * alone: the bare suffix would also claim something like notheyodinai.com.
 */
function silkHost(hostname) {
  if (hostname === LEGACY_APEX) return CURRENT_APEX
  if (hostname.endsWith(`.${LEGACY_APEX}`)) {
    return hostname.slice(0, -LEGACY_APEX.length) + CURRENT_APEX
  }
  return null
}

export async function onRequest(context) {
  const url = new URL(context.request.url)
  const target = silkHost(url.hostname)

  if (target === null) return context.next()

  url.hostname = target
  url.protocol = 'https:'
  url.port = ''

  return new Response(null, {
    status: 301,
    headers: {
      Location: url.toString(),
      // A 301 with no Cache-Control is cached by browsers indefinitely, which
      // makes it effectively irreversible. An hour is long enough to spare the
      // round trip and short enough that this stays a decision, not a fact.
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
