/**
 * PATCH /api/admin/knowledge/:id — { status?, fact?, audience? }. Approve,
 * dismiss or edit a fact. Approved facts reach the drafter immediately, and
 * the help-site chat too when the audience is public.
 */
import { error, json, readJson, text } from '../../../../server/http.js'

export async function onRequestPatch({ request, env, params }) {
  const id = Number(params.id)
  const body = await readJson(request)
  if (!body) return error(400, 'Invalid request')

  const row = await env.DB.prepare('SELECT * FROM knowledge WHERE id = ?').bind(id).first()
  if (!row) return error(404, 'No such fact')

  const status = ['suggested', 'approved', 'dismissed'].includes(body.status) ? body.status : row.status
  const fact = typeof body.fact === 'string' ? text(body.fact, 1000) : row.fact
  if (!fact) return error(400, 'The fact is empty')
  const audience = ['internal', 'public'].includes(body.audience) ? body.audience : row.audience

  await env.DB.prepare('UPDATE knowledge SET status = ?, fact = ?, audience = ?, updated_at = ? WHERE id = ?')
    .bind(status, fact, audience, Date.now(), id)
    .run()
  return json({ ok: true })
}
