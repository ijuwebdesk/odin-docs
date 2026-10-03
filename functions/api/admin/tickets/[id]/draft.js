/** POST /api/admin/tickets/:id/draft — { note? }. Regenerates the AI draft, optionally steered by the note. */
import { error, json, readJson, text } from '../../../../../server/http.js'
import { generateDraft, loadTicket } from '../../../../../server/tickets.js'

export async function onRequestPost({ request, env, params }) {
  const id = Number(params.id)
  if (!(await loadTicket(env.DB, id))) return error(404, 'No such ticket')
  const body = (await readJson(request)) ?? {}

  // Synchronous on purpose: the admin is waiting on this screen for the result.
  await generateDraft(env, id, text(body.note, 1000))
  return json({ ticket: await loadTicket(env.DB, id) })
}
