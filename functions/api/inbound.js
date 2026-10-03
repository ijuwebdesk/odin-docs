/**
 * POST /api/inbound — an email to support@, handed over by the mailer Worker
 * (workers/mailer) after Email Routing delivers it there.
 *
 * A reply from a ticket's customer is added to that ticket, matched by the
 * [SILK-1234] subject tag or by the email thread. Anything else opens a new
 * ticket. Only the Worker can call this: it must present INBOUND_SECRET.
 *
 * Body: { fromName, fromEmail, subject, text, inReplyTo, references, attachments }
 */
import { error, isEmail, json, readJson, text } from '../../server/http.js'
import { messageIds, stripQuoted } from '../../server/inbound.js'
import { allow } from '../../server/limits.js'
import { addCustomerReply, createTicket, loadTicket } from '../../server/tickets.js'

async function authorized(request, env) {
  if (!env.INBOUND_SECRET) return false
  const given = (request.headers.get('Authorization') ?? '').replace(/^Bearer /, '')
  // Compare digests so the check takes the same time however much matches.
  const digest = (s) => crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  const [a, b] = await Promise.all([digest(given), digest(env.INBOUND_SECRET)])
  return crypto.subtle.timingSafeEqual(a, b)
}

async function findTicket(db, { subject, fromEmail, inReplyTo, references }) {
  const tagged = subject.match(/\[SILK-(\d+)\]/i)
  if (tagged) {
    const ticket = await loadTicket(db, Number(tagged[1]))
    // The tag is guessable, so only the ticket's own customer can add to it.
    if (ticket?.email === fromEmail) return ticket
  }
  const ids = messageIds(inReplyTo, references)
  if (!ids.length) return null
  return db
    .prepare(
      `SELECT * FROM tickets WHERE email = ? AND thread_message_id IN (${ids.map(() => '?').join(', ')})
       ORDER BY id DESC LIMIT 1`,
    )
    .bind(fromEmail, ...ids)
    .first()
}

export async function onRequestPost({ request, env, waitUntil }) {
  if (!(await authorized(request, env))) return error(401, 'Unauthorized')
  const body = await readJson(request)
  if (!body) return error(400, 'Invalid request')

  const fromEmail = text(body.fromEmail, 254).toLowerCase()
  if (!isEmail(fromEmail)) return error(400, 'No usable sender address')
  const subject = text(body.subject, 300)
  let message = stripQuoted(text(body.text, 20000))
  if (body.attachments > 0) {
    message += `\n\n[${body.attachments} attachment(s) were forwarded to the team's inbox; they aren't stored here.]`
  }
  if (!message) return json({ ok: true, ignored: 'empty message' })

  if (!(await allow(env.DB, `inbound:${fromEmail}`, 20, 86400))) {
    return json({ ok: true, ignored: 'rate limited' })
  }

  const existing = await findTicket(env.DB, {
    subject,
    fromEmail,
    inReplyTo: text(body.inReplyTo, 1000),
    references: text(body.references, 5000),
  })
  if (existing) {
    await addCustomerReply(env, waitUntil, existing, message)
    return json({ ok: true, ticket: existing.id, action: 'reply' })
  }

  const id = await createTicket(env, waitUntil, {
    name: text(body.fromName, 100) || fromEmail.split('@')[0],
    email: fromEmail,
    // Drop reply prefixes and any other ticket's tag, so the new ticket gets a clean [SILK-n] of its own.
    subject:
      subject
        .replace(/\[SILK-\d+\]\s*/gi, '')
        .replace(/^((re|fwd?|aw):\s*)+/i, '')
        .trim()
        .slice(0, 150) || message.split('\n')[0].slice(0, 80),
    question: message,
  })
  return json({ ok: true, ticket: id, action: 'new' })
}
