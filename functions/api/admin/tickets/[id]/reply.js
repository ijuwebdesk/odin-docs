/**
 * POST /api/admin/tickets/:id/reply — { body, close? }. Emails the reply to
 * the customer, records it on the thread, and marks the ticket answered (or
 * closed). This is the "Approve & send" button: nothing reaches a customer
 * without passing through here.
 *
 * It also records how much of the AI draft survived, and when the reply
 * strayed from the draft, asks the AI what new facts it taught us.
 */
import { error, json, readJson, text } from '../../../../../server/http.js'
import { draftMatch, suggestFacts, USED_AS_IS } from '../../../../../server/learning.js'
import { replyToCustomer } from '../../../../../server/mail.js'
import { loadThread, loadTicket } from '../../../../../server/tickets.js'

export async function onRequestPost({ request, env, params, data, waitUntil }) {
  const id = Number(params.id)
  const body = await readJson(request)
  const reply = text(body?.body, 20000)
  if (!reply) return error(400, 'The reply is empty')

  const ticket = await loadTicket(env.DB, id)
  if (!ticket) return error(404, 'No such ticket')
  // The customer message this reply answers, read before the reply joins the thread.
  const asked = (await loadThread(env.DB, id)).findLast((m) => m.direction === 'in')?.body ?? ticket.question

  try {
    await replyToCustomer(env, ticket, reply)
  } catch (err) {
    console.error('reply failed', id, err)
    return error(502, `The email could not be sent: ${String(err?.message ?? err).slice(0, 200)}`)
  }

  const aiDraft = ticket.draft_original || null
  const match = aiDraft ? draftMatch(aiDraft, reply) : null
  const now = Date.now()
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO ticket_messages (ticket_id, direction, body, author, created_at, ai_draft, draft_match)
       VALUES (?, 'out', ?, ?, ?, ?, ?)`,
    ).bind(id, reply, data.admin, now, aiDraft, match),
    // The sent draft is spent; the next one is generated on demand.
    env.DB.prepare(
      `UPDATE tickets SET status = ?, draft = NULL, draft_original = NULL, draft_notes = NULL, draft_status = 'ready',
       updated_at = ? WHERE id = ?`,
    ).bind(body.close ? 'closed' : 'answered', now, id),
  ])

  // A draft sent as is taught us nothing new.
  if (match === null || match < USED_AS_IS) waitUntil(suggestFacts(env, ticket, { asked, sent: reply, aiDraft }))

  return json({ ticket: await loadTicket(env.DB, id), thread: await loadThread(env.DB, id) })
}
