/**
 * POST /api/tickets — "Talk to a human". Creates a ticket, then in the
 * background drafts an AI reply and emails both the support inbox and the
 * customer.
 *
 * Body: { name, email, subject, question, conversationId?, turnstileToken }
 */
import { error, isEmail, json, readJson, text, ticketRef } from '../../server/http.js'
import { allow, ipHash, verifyTurnstile } from '../../server/limits.js'
import { confirmToCustomer, notifyNewTicket } from '../../server/mail.js'
import { generateDraft, loadTicket } from '../../server/tickets.js'

export async function onRequestPost({ request, env, waitUntil }) {
  const body = await readJson(request)
  if (!body) return error(400, 'Invalid request')

  const name = text(body.name, 100)
  const email = text(body.email, 254).toLowerCase()
  const question = text(body.question, 5000)
  const subject = text(body.subject, 150) || question.split('\n')[0].slice(0, 80)
  if (!name) return error(400, 'Please enter your name')
  if (!isEmail(email)) return error(400, 'Please enter a valid email address')
  if (question.length < 10) return error(400, 'Please describe what you need help with')

  if (!(await verifyTurnstile(body.turnstileToken, request, env))) {
    return error(403, 'Please complete the verification check and try again.')
  }
  const db = env.DB
  const ip = await ipHash(request, env)
  if (!(await allow(db, `ticket:${ip}`, 5, 3600)) || !(await allow(db, `ticket:${email}`, 10, 86400))) {
    return error(429, 'Too many requests. Please email support@heysilkai.com directly.')
  }

  // Only link a chat that exists; the id comes from the browser.
  let conversationId = null
  if (typeof body.conversationId === 'string') {
    const row = await db.prepare('SELECT id FROM conversations WHERE id = ?').bind(body.conversationId).first()
    conversationId = row?.id ?? null
  }

  const now = Date.now()
  const { id } = await db
    .prepare(
      `INSERT INTO tickets (name, email, subject, question, conversation_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    )
    .bind(name, email, subject, question, conversationId, now, now)
    .first()
  if (conversationId) {
    await db.prepare('UPDATE conversations SET ticket_id = ? WHERE id = ?').bind(id, conversationId).run()
  }

  waitUntil(
    (async () => {
      const ticket = await loadTicket(db, id)
      // Emails first: they matter more than the draft and finish quickly.
      const [confirmation] = await Promise.allSettled([
        confirmToCustomer(env, ticket),
        notifyNewTicket(env, ticket),
      ]).then((outcomes) => {
        for (const o of outcomes) if (o.status === 'rejected') console.error('ticket email failed', id, o.reason)
        return outcomes
      })
      if (confirmation.status === 'fulfilled' && confirmation.value?.messageId) {
        await db
          .prepare('UPDATE tickets SET thread_message_id = ? WHERE id = ?')
          .bind(confirmation.value.messageId, id)
          .run()
      }
      await generateDraft(env, id)
    })(),
  )

  return json({ ok: true, ref: ticketRef(id) }, { status: 201 })
}
