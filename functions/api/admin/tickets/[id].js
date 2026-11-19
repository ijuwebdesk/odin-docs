/**
 * GET   /api/admin/tickets/:id — the ticket, its AI chat transcript, email thread and attachments.
 * PATCH /api/admin/tickets/:id — { status } to reopen, close, or move to or from Outreach,
 *       or { draft } to save an edit.
 */
import { loadAttachments } from '../../../../server/attachments.js'
import { error, json, readJson, text } from '../../../../server/http.js'
import { fileAsOutreach, generateDraft, loadThread, loadTicket, loadTranscript } from '../../../../server/tickets.js'

export async function onRequestGet({ env, params }) {
  const ticket = await loadTicket(env.DB, Number(params.id))
  if (!ticket) return error(404, 'No such ticket')
  const [transcript, thread, stored] = await Promise.all([
    loadTranscript(env.DB, ticket.conversation_id),
    loadThread(env.DB, ticket.id),
    loadAttachments(env.DB, ticket.id),
  ])
  const attachments = stored.map(({ r2_key, ...a }) => a)
  return json({ ticket, transcript, thread, attachments })
}

export async function onRequestPatch({ request, env, params, waitUntil }) {
  const id = Number(params.id)
  const body = await readJson(request)
  if (!body) return error(400, 'Invalid request')
  const before = await loadTicket(env.DB, id)
  if (!before) return error(404, 'No such ticket')

  if (body.status === 'outreach') {
    // Later mail from this sender goes straight to Outreach too (server/triage.js).
    await fileAsOutreach(env.DB, id, 'marked by hand')
  } else if (before.status === 'outreach' && ['open', 'answered', 'closed'].includes(body.status)) {
    // A real customer after all: back to the inbox, and drafted if it needs an answer.
    const now = Date.now()
    // 'pending' up front, so the screen that reloads next shows the draft on its way.
    await env.DB.prepare(
      'UPDATE tickets SET status = ?, draft_status = ?, draft_notes = NULL, draft_updated_at = ?, updated_at = ? WHERE id = ?',
    )
      .bind(body.status, body.status === 'open' ? 'pending' : 'ready', now, now, id)
      .run()
    if (body.status === 'open') waitUntil(generateDraft(env, id))
  } else if (['open', 'answered', 'closed'].includes(body.status)) {
    await env.DB.prepare('UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?')
      .bind(body.status, Date.now(), id)
      .run()
  }
  if (typeof body.draft === 'string') {
    await env.DB.prepare('UPDATE tickets SET draft = ? WHERE id = ?').bind(text(body.draft, 20000), id).run()
  }
  return json({ ticket: await loadTicket(env.DB, id) })
}
