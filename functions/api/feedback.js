/** POST /api/feedback — { conversationId, helpful: boolean }, the visitor's thumbs up or down. */
import { error, json, readJson } from '../../server/http.js'

export async function onRequestPost({ request, env }) {
  const body = await readJson(request)
  if (!body || typeof body.conversationId !== 'string' || typeof body.helpful !== 'boolean') {
    return error(400, 'Invalid request')
  }
  await env.DB.prepare('UPDATE conversations SET feedback = ?, updated_at = ? WHERE id = ?')
    .bind(body.helpful ? 'up' : 'down', Date.now(), body.conversationId)
    .run()
  return json({ ok: true })
}
