/** GET /api/admin/tickets?status=open|answered|closed|all — the inbox, plus counts for the tabs. */
import { json } from '../../../../server/http.js'

const STATUSES = ['open', 'answered', 'closed']

export async function onRequestGet({ request, env, data }) {
  const status = new URL(request.url).searchParams.get('status') ?? 'open'
  const filter = STATUSES.includes(status) ? status : null

  const list = env.DB.prepare(
    `SELECT id, name, email, subject, status, draft_status, created_at, updated_at
     FROM tickets ${filter ? 'WHERE status = ?' : ''}
     ORDER BY ${filter === 'open' ? 'created_at ASC' : 'updated_at DESC'} LIMIT 200`,
  )
  const [{ results: tickets }, { results: counts }] = await env.DB.batch([
    filter ? list.bind(filter) : list,
    env.DB.prepare('SELECT status, COUNT(*) AS n FROM tickets GROUP BY status'),
  ])

  return json({
    admin: data.admin,
    tickets,
    counts: Object.fromEntries(STATUSES.map((s) => [s, counts.find((c) => c.status === s)?.n ?? 0])),
  })
}
