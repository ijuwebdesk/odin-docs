/**
 * Email for the support portal (support.heysilkai.com).
 *
 * Outbound: Pages Functions can't hold a `send_email` binding, so the site
 * calls `POST /send` here over a service binding. There is no public route,
 * so the site is the only caller.
 *
 * Inbound: Email Routing delivers mail for support@heysilkai.com to `email()`
 * below, which hands it to the site's /api/inbound to become a ticket or a
 * reply on one. If the site can't take it, the message is forwarded to the
 * team's inbox instead, so nothing sent to support@ is ever lost.
 */
import PostalMime from 'postal-mime'

/** Out-of-office replies, bounces and list mail must never open tickets, or confirmations would loop. */
function isAutomated(headers, from) {
  const autoSubmitted = (headers.get('Auto-Submitted') ?? 'no').toLowerCase()
  const precedence = (headers.get('Precedence') ?? '').toLowerCase()
  return (
    autoSubmitted !== 'no' ||
    ['bulk', 'junk', 'list', 'auto_reply'].includes(precedence) ||
    headers.has('X-Autoreply') ||
    headers.has('X-Autorespond') ||
    headers.has('List-Id') ||
    /^(mailer-daemon|postmaster|no-?reply)@/i.test(from)
  )
}

async function forwardToTeam(message, env, reason) {
  console.log('forwarding to team inbox', { from: message.from, reason })
  await message.forward(env.FALLBACK_FORWARD)
}

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

  async email(message, env) {
    // Our own mail (alerts, confirmations) coming back around is not a ticket.
    if (message.from.toLowerCase().endsWith('@heysilkai.com')) return
    if (isAutomated(message.headers, message.from)) {
      console.log('ignoring automated mail', { from: message.from })
      return
    }

    // The raw stream can be read once; buffer it for parsing.
    const raw = await new Response(message.raw).arrayBuffer()
    const parsed = await PostalMime.parse(raw)
    const attachments = parsed.attachments?.length ?? 0

    let handled = false
    try {
      const res = await fetch(`${env.SITE_URL}/api/inbound`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.INBOUND_SECRET}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromName: parsed.from?.name ?? '',
          fromEmail: parsed.from?.address ?? message.from,
          subject: parsed.subject ?? '',
          text: parsed.text ?? (parsed.html ?? '').replace(/<[^>]+>/g, ' '),
          inReplyTo: parsed.inReplyTo ?? '',
          references: parsed.references ?? '',
          attachments,
        }),
      })
      handled = res.ok
      console.log('inbound handed to site', { status: res.status, result: await res.text() })
    } catch (err) {
      console.error('inbound hand-off failed', String(err))
    }

    // The portal doesn't store attachments, so the team needs the original to see them.
    if (!handled) await forwardToTeam(message, env, 'site did not accept it')
    else if (attachments) await forwardToTeam(message, env, `${attachments} attachment(s)`)
  },
}
