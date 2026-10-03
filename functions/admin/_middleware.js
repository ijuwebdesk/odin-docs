/**
 * The admin page itself is static, but it is still kept behind the same
 * Access check as its API, so nothing about it is served to the public.
 */
import { adminEmail } from '../../server/access.js'

export async function onRequest(context) {
  const email = await adminEmail(context.request, context.env)
  if (!email) return new Response('Not found', { status: 404 })
  const response = await context.next()
  const headers = new Headers(response.headers)
  headers.set('X-Robots-Tag', 'noindex')
  headers.set('Cache-Control', 'no-store')
  return new Response(response.body, { status: response.status, headers })
}
