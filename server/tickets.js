/** Ticket reads and the AI draft, shared by the public and admin routes. */
import { complete, DEFAULT_DRAFT_MODEL } from './openrouter.js'
import { draftMessages, splitDraft } from './prompts.js'

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
      maxTokens: 1200,
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
