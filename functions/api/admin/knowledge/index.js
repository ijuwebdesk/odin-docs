/**
 * GET  /api/admin/knowledge — how the AI drafts are doing (how much of each
 *      survived into the sent reply), the facts waiting for review, and the
 *      approved ones the drafter reads.
 * POST /api/admin/knowledge — { fact, audience } adds an approved fact by hand.
 */
import { error, json, readJson, text } from '../../../../server/http.js'
import { REWRITTEN, USED_AS_IS } from '../../../../server/learning.js'

const DAYS = 30

export async function onRequestGet({ env }) {
  const since = Date.now() - DAYS * 86400_000
  const [{ results: totals }, { results: weeks }, { results: facts }, playbook] = await env.DB.batch([
    env.DB.prepare(
      `SELECT COUNT(*) AS sent,
              SUM(draft_match >= ?1) AS used,
              SUM(draft_match >= ?2 AND draft_match < ?1) AS edited,
              SUM(draft_match < ?2) AS rewritten,
              SUM(draft_match IS NULL) AS no_draft
       FROM ticket_messages WHERE direction = 'out' AND created_at > ?3`,
    ).bind(USED_AS_IS, REWRITTEN, since),
    // Weekly average, measured replies only, to see whether drafts are improving.
    env.DB.prepare(
      `SELECT CAST(created_at / 604800000 AS INTEGER) * 604800000 AS week,
              COUNT(*) AS sent, AVG(draft_match) AS match
       FROM ticket_messages WHERE direction = 'out' AND draft_match IS NOT NULL
       GROUP BY week ORDER BY week DESC LIMIT 8`,
    ),
    env.DB.prepare(
      `SELECT k.id, k.fact, k.audience, k.status, k.ticket_id, k.created_at, t.subject
       FROM knowledge k LEFT JOIN tickets t ON t.id = k.ticket_id
       WHERE k.status IN ('suggested', 'approved') ORDER BY k.created_at DESC`,
    ),
    env.DB.prepare("SELECT updated_at, length(value) AS chars FROM settings WHERE key = 'playbook'"),
  ])

  return json({
    days: DAYS,
    totals: totals[0],
    weeks: weeks.reverse(),
    suggested: facts.filter((f) => f.status === 'suggested'),
    approved: facts.filter((f) => f.status === 'approved'),
    playbook: playbook.results[0] ?? null,
  })
}

export async function onRequestPost({ request, env }) {
  const body = await readJson(request)
  const fact = text(body?.fact, 1000)
  if (!fact) return error(400, 'Write the fact first')
  const audience = body.audience === 'public' ? 'public' : 'internal'
  const now = Date.now()
  await env.DB.prepare(
    "INSERT INTO knowledge (fact, audience, status, created_at, updated_at) VALUES (?, ?, 'approved', ?, ?)",
  )
    .bind(fact, audience, now, now)
    .run()
  return json({ ok: true })
}
