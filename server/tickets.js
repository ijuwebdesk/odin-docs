/** Tickets: creation, customer replies, reads, and the AI draft. Shared by every route. */
import { confirmToCustomer, notifyCustomerReply, notifyNewTicket } from './mail.js'
import { complete, DEFAULT_DRAFT_MODEL } from './openrouter.js'
import { draftMessages, splitDraft } from './prompts.js'

/**
 * Opens a ticket from the web form, an email, or the admin, then in the
 * background confirms to the customer, alerts the team, and drafts a reply.
 * The admin skips the alert (they made the ticket) and may skip the confirmation.
 */
export async function createTicket(
  env,
  waitUntil,
  { name, email, subject, question, conversationId = null },
  { confirm = true, alert = true } = {},
) {
  const db = env.DB
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
      const outcomes = await Promise.allSettled([
        confirm ? confirmToCustomer(env, ticket) : null,
        alert ? notifyNewTicket(env, ticket) : null,
      ])
      for (const o of outcomes) if (o.status === 'rejected') console.error('ticket email failed', id, o.reason)
      const [confirmation] = outcomes
      if (confirmation.status === 'fulfilled' && confirmation.value?.messageId) {
        await db
          .prepare('UPDATE tickets SET thread_message_id = ? WHERE id = ?')
          .bind(confirmation.value.messageId, id)
          .run()
      }
      await generateDraft(env, id)
    })(),
  )
  return id
}

/** Records a customer's emailed reply, reopens the ticket, alerts the team, and redrafts. */
export async function addCustomerReply(env, waitUntil, ticket, body) {
  const now = Date.now()
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO ticket_messages (ticket_id, direction, body, author, created_at) VALUES (?, 'in', ?, ?, ?)",
    ).bind(ticket.id, body, ticket.email, now),
    env.DB.prepare("UPDATE tickets SET status = 'open', updated_at = ? WHERE id = ?").bind(now, ticket.id),
  ])
  waitUntil(
    Promise.allSettled([notifyCustomerReply(env, ticket, body), generateDraft(env, ticket.id)]).then((outcomes) => {
      for (const o of outcomes) if (o.status === 'rejected') console.error('reply handling failed', ticket.id, o.reason)
    }),
  )
}

export async function loadTicket(db, id) {
  return db.prepare('SELECT * FROM tickets WHERE id = ?').bind(id).first()
}

export async function loadTranscript(db, conversationId) {
  if (!conversationId) return []
  const { results } = await db
    .prepare('SELECT role, content, created_at FROM chat_messages WHERE conversation_id = ? ORDER BY id')
    .bind(conversationId)
    .all()
  return results
}

export async function loadThread(db, ticketId) {
  const { results } = await db
    .prepare('SELECT id, direction, body, author, created_at FROM ticket_messages WHERE ticket_id = ? ORDER BY id')
    .bind(ticketId)
    .all()
  return results
}

/**
 * Writes a fresh AI draft onto the ticket. Never throws: a failure is
 * recorded as draft_status 'failed' so the admin can see it and regenerate.
 */
export async function generateDraft(env, ticketId, note = '') {
  const db = env.DB
  const now = Date.now()
  await db
    .prepare("UPDATE tickets SET draft_status = 'pending', draft_updated_at = ? WHERE id = ?")
    .bind(now, ticketId)
    .run()

  try {
    const ticket = await loadTicket(db, ticketId)
    const [transcript, thread] = await Promise.all([
      loadTranscript(db, ticket.conversation_id),
      loadThread(db, ticketId),
    ])
    const result = await complete(env, {
      model: env.DRAFT_MODEL ?? DEFAULT_DRAFT_MODEL,
      messages: draftMessages({ ticket, transcript, thread, note }),
      maxTokens: 4000,
    })
    const { draft, notes } = splitDraft(result.text)
    if (!draft) throw new Error('The model returned an empty draft')

    await db
      .prepare(
        `UPDATE tickets SET draft = ?, draft_notes = ?, draft_status = 'ready', draft_model = ?, draft_updated_at = ?
         WHERE id = ?`,
      )
      .bind(draft, notes, result.model, Date.now(), ticketId)
      .run()
  } catch (err) {
    console.error('draft failed', ticketId, err)
    await db
      .prepare("UPDATE tickets SET draft_status = 'failed', draft_notes = ?, draft_updated_at = ? WHERE id = ?")
      .bind(`Draft failed: ${String(err?.message ?? err).slice(0, 300)}`, Date.now(), ticketId)
      .run()
  }
}
