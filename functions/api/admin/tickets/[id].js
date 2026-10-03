/**
 * GET   /api/admin/tickets/:id — the ticket, its AI chat transcript and email thread.
 * PATCH /api/admin/tickets/:id — { status } to reopen or close, or { draft } to save an edit.
 */
import { error, json, readJson, text } from '../../../../server/http.js'
import { loadThread, loadTicket, loadTranscript } from '../../../../server/tickets.js'

export async function onRequestGet({ env, params }) {
  const ticket = await loadTicket(env.DB, Number(params.id))
  if (!ticket) return error(404, 'No such ticket')
  const [transcript, thread] = await Promise.all([
    loadTranscript(env.DB, ticket.conversation_id),
    loadThread(env.DB, ticket.id),
  ])
  return json({ ticket, transcript, thread })
}

export async function onRequestPatch({ request, env, params }) {
  const id = Number(params.id)
  const body = await readJson(request)
  if (!body) return error(400, 'Invalid request')

  if (['open', 'answered', 'closed'].includes(body.status)) {
    await env.DB.prepare('UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?')
      .bind(body.status, Date.now(), id)
      .run()
  }
  if (typeof body.draft === 'string') {
    await env.DB.prepare('UPDATE tickets SET draft = ? WHERE id = ?').bind(text(body.draft, 20000), id).run()
  }
  return json({ ticket: await loadTicket(env.DB, id) })
}
