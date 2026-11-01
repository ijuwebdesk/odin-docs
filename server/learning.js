/**
 * What the drafter learns beyond the public docs: the internal playbook, the
 * facts the team has approved, and the replies the team actually sent. Also
 * measures how much of each draft survived, and suggests new facts from the
 * replies that didn't follow the draft.
 */
import { complete, DEFAULT_DRAFT_MODEL } from './openrouter.js'
import { factsMessages } from './prompts.js'

/** A sent reply keeping at least this much of the draft counts as "used". */
export const USED_AS_IS = 0.9
/** Below this, the draft was effectively rewritten. */
export const REWRITTEN = 0.5

const EXAMPLES = 12
const MAX_EXAMPLE = 1500

/**
 * How much of the draft made it into what was sent, 0..1: overlap of word
 * pairs (Dice). Linear time, since Pages Functions have little CPU to spare.
 */
export function draftMatch(draft, sent) {
  const pairs = (s) => {
    const words = s.toLowerCase().match(/[\p{L}\p{N}$.']+/gu) ?? []
    const bag = new Map()
    for (let i = 0; i < words.length - 1; i++) {
      const pair = `${words[i]} ${words[i + 1]}`
      bag.set(pair, (bag.get(pair) ?? 0) + 1)
    }
    return { bag, size: Math.max(words.length - 1, 0) }
  }
  const a = pairs(draft)
  const b = pairs(sent)
  if (!a.size || !b.size) return draft.trim() === sent.trim() ? 1 : 0
  let shared = 0
  for (const [pair, n] of a.bag) shared += Math.min(n, b.bag.get(pair) ?? 0)
  return (2 * shared) / (a.size + b.size)
}

export async function loadPlaybook(db) {
  const row = await db.prepare("SELECT value FROM settings WHERE key = 'playbook'").first()
  return row?.value ?? ''
}

/**
 * Approved facts. Drafts get those not yet folded into the playbook (folded
 * ones are in it). The help-site chat never reads the playbook, so with
 * `publicOnly` it gets every public fact, folded or not.
 */
export async function loadFacts(db, { publicOnly = false } = {}) {
  const { results } = await db
    .prepare(
      publicOnly
        ? "SELECT fact FROM knowledge WHERE status IN ('approved', 'folded') AND audience = 'public' ORDER BY id"
        : "SELECT fact FROM knowledge WHERE status = 'approved' ORDER BY id",
    )
    .all()
  return results.map((r) => r.fact)
}

/**
 * The team's most recent sent replies, each with the customer message it
 * answered, so drafts copy their tone, length and the facts they give out.
 */
export async function loadExamples(db, excludeTicketId) {
  const { results } = await db
    .prepare(
      `SELECT t.subject, m.body AS reply,
              COALESCE((SELECT i.body FROM ticket_messages i
                         WHERE i.ticket_id = m.ticket_id AND i.direction = 'in' AND i.id < m.id
                         ORDER BY i.id DESC LIMIT 1), t.question) AS asked
       FROM ticket_messages m JOIN tickets t ON t.id = m.ticket_id
       WHERE m.direction = 'out' AND m.ticket_id != ?
       ORDER BY m.id DESC LIMIT ?`,
    )
    .bind(excludeTicketId, EXAMPLES)
    .all()
  const clip = (s) => (s.length > MAX_EXAMPLE ? `${s.slice(0, MAX_EXAMPLE)} […]` : s)
  // Oldest first, so the newest replies sit closest to the ticket being drafted.
  return results.reverse().map((r) => ({ subject: r.subject, asked: clip(r.asked), reply: clip(r.reply) }))
}

/**
 * Asks the AI which facts in a sent reply the docs, playbook and known facts
 * don't already cover, and files them as suggestions for an admin to review.
 * Never throws; it runs after the reply has gone out.
 */
export async function suggestFacts(env, ticket, { asked, sent, aiDraft }) {
  const db = env.DB
  try {
    const [playbook, { results: known }] = await Promise.all([
      loadPlaybook(db),
      db
        .prepare(
          `SELECT fact, status FROM knowledge WHERE status != 'folded' ORDER BY id DESC LIMIT 200`,
        )
        .all(),
    ])
    const result = await complete(env, {
      model: env.DRAFT_MODEL ?? DEFAULT_DRAFT_MODEL,
      messages: factsMessages({ playbook, known, subject: ticket.subject, asked, sent, aiDraft }),
      maxTokens: 2000,
    })
    const facts = parseFacts(result.text)
    if (!facts.length) return

    const now = Date.now()
    await db.batch(
      facts.map((f) =>
        db
          .prepare(
            `INSERT INTO knowledge (fact, audience, status, ticket_id, created_at, updated_at)
             VALUES (?, ?, 'suggested', ?, ?, ?)`,
          )
          .bind(f.fact, f.audience, ticket.id, now, now),
      ),
    )
  } catch (err) {
    console.error('fact suggestion failed', ticket.id, err)
  }
}

function parseFacts(raw) {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end <= start) return []
  try {
    const { facts } = JSON.parse(raw.slice(start, end + 1))
    if (!Array.isArray(facts)) return []
    return facts
      .filter((f) => typeof f?.fact === 'string' && f.fact.trim())
      .slice(0, 3)
      .map((f) => ({ fact: f.fact.trim().slice(0, 1000), audience: f.audience === 'public' ? 'public' : 'internal' }))
  } catch {
    return []
  }
}
