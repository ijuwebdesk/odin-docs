/**
 * Sends support email for the docs site (support.heysilkai.com).
 *
 * Cloudflare Pages Functions can't hold a `send_email` binding, so the site
 * calls this Worker over a service binding instead. It has no public route,
 * so the only caller is the site itself. The inbound half (support@ mail
 * becoming tickets) will live here too, as an `email()` handler.
 */
export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url)
    if (request.method !== 'POST' || pathname !== '/send') {
      return new Response('Not found', { status: 404 })
    }

    const { from, to, replyTo, subject, text, html, headers } = await request.json()
    try {
      const result = await env.EMAIL.send({ from, to, replyTo, subject, text, html, headers })
      return Response.json({ messageId: result.messageId })
    } catch (err) {
      console.error('send failed', { to, subject, error: String(err) })
      return new Response(String(err?.message ?? err), { status: 502 })
    }
  },
}
