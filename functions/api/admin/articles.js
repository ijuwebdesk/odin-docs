/**
 * GET /api/admin/articles — how helpful each docs page has been over the last
 * 30 days, worst first, with readers' comments. Pages that keep getting a
 * thumbs down, and what those readers say is missing, are the ones to rewrite.
 */
import { json } from '../../../server/http.js'
import { PAGES } from '../../../server/kb.generated.js'

const DAYS = 30

export async function onRequestGet({ env }) {
  const since = Date.now() - DAYS * 86400_000
  const [{ results: counts }, { results: comments }] = await env.DB.batch([
    env.DB.prepare(
      `SELECT page, SUM(helpful) AS yes, SUM(1 - helpful) AS no
       FROM article_feedback WHERE created_at > ? GROUP BY page`,
    ).bind(since),
    env.DB.prepare(
      `SELECT page, helpful, comment, created_at FROM article_feedback
       WHERE created_at > ? AND comment IS NOT NULL ORDER BY created_at DESC LIMIT 500`,
    ).bind(since),
  ])

  const titles = new Map(PAGES.map((p) => [p.url, p.title]))
  const pages = counts
    .map((c) => ({
      page: c.page,
      title: titles.get(c.page) ?? c.page,
      yes: c.yes,
      no: c.no,
      comments: comments.filter((m) => m.page === c.page),
    }))
    // Most thumbs-down first; a page with many "no"s matters more than a 0-for-1.
    .sort((a, b) => b.no - a.no || a.yes - b.yes)

  return json({ days: DAYS, pages })
}
