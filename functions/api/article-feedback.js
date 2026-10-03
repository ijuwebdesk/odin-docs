/**
 * POST /api/article-feedback — "Was this page helpful?" at the end of each article.
 *
 * Vote:    { page, helpful }       -> { id }
 * Comment: { id, comment }         -> adds "what was missing" to that vote
 * Change:  { id, helpful }         -> the visitor changed their mind
 *
 * Only real docs pages are accepted, and a vote can only be edited from the
 * same visitor (salted IP hash) within a day, so ids can't be used to rewrite
 * other people's feedback. No Turnstile: a vote is cheap and harmless, and the
 * per-visitor rate limit keeps the counts honest enough.
 */
import { error, json, readJson, text } from '../../server/http.js'
import { PAGES } from '../../server/kb.generated.js'
import { allow, ipHash } from '../../server/limits.js'

const DOCS_PAGES = new Set(PAGES.map((p) => p.url))
const EDIT_WINDOW_MS = 24 * 3600_000

export async function onRequestPost({ request, env }) {
  const body = await readJson(request)
  if (!body) return error(400, 'Invalid request')

  const db = env.DB
  const ip = await ipHash(request, env)
  if (!(await allow(db, `article:${ip}`, 60, 3600))) return error(429, 'Too many requests')
  const now = Date.now()

  if (typeof body.id === 'number') {
    const row = await db
      .prepare('SELECT id FROM article_feedback WHERE id = ? AND ip_hash = ? AND created_at > ?')
      .bind(body.id, ip, now - EDIT_WINDOW_MS)
      .first()
    if (!row) return error(404, 'Feedback not found')

    if (typeof body.helpful === 'boolean') {
      await db
        .prepare('UPDATE article_feedback SET helpful = ?, updated_at = ? WHERE id = ?')
        .bind(body.helpful ? 1 : 0, now, row.id)
        .run()
    }
    const comment = text(body.comment, 2000)
    if (comment) {
      await db
        .prepare('UPDATE article_feedback SET comment = ?, updated_at = ? WHERE id = ?')
        .bind(comment, now, row.id)
        .run()
    }
    return json({ id: row.id })
  }

  const page = text(body.page, 300)
  if (!DOCS_PAGES.has(page) || typeof body.helpful !== 'boolean') return error(400, 'Invalid request')
  const { id } = await db
    .prepare(
      `INSERT INTO article_feedback (page, helpful, ip_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?) RETURNING id`,
    )
    .bind(page, body.helpful ? 1 : 0, ip, now, now)
    .first()
  return json({ id }, { status: 201 })
}
