/**
 * GET  /api/admin/tickets?status=open|answered|closed|all — the inbox, plus counts for the tabs.
 * POST /api/admin/tickets — { name, email, subject, question, confirm } opens a ticket on a
 *      customer's behalf, e.g. for a request that came in by phone or social media.
 */
import { error, isEmail, json, readJson, text } from '../../../../server/http.js'
import { createTicket } from '../../../../server/tickets.js'

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

export async function onRequestPost({ request, env, waitUntil }) {
  const body = await readJson(request)
  if (!body) return error(400, 'Invalid request')

  const name = text(body.name, 100)
  const email = text(body.email, 254).toLowerCase()
  const subject = text(body.subject, 150)
  const question = text(body.question, 20000)
  if (!name) return error(400, "Enter the customer's name")
  if (!isEmail(email)) return error(400, "Enter the customer's email address")
  if (!subject) return error(400, 'Enter a subject')
  if (!question) return error(400, 'Describe what the customer needs')

  const id = await createTicket(
    env,
    waitUntil,
    { name, email, subject, question },
    { confirm: body.confirm !== false, alert: false },
  )
  return json({ id }, { status: 201 })
}
