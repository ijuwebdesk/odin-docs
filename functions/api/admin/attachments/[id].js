/** GET /api/admin/attachments/:id — a customer's attachment: images and PDFs open in the browser, the rest download. */
import { error } from '../../../../server/http.js'
import { serveAttachment } from '../../../../server/attachments.js'

export async function onRequestGet({ env, params }) {
  const row = await env.DB.prepare('SELECT r2_key, filename, content_type FROM attachments WHERE id = ?')
    .bind(Number(params.id))
    .first()
  if (!row) return error(404, 'No such attachment')
  return serveAttachment(env, row.r2_key, row.filename, row.content_type)
}
