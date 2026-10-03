/**
 * GET /api/admin/insights — chat volume and the "doc gaps": recent questions
 * the AI couldn't answer, that got a thumbs down, or that ended in a ticket.
 * These are the pages the docs are missing.
 */
import { json } from '../../../server/http.js'

export async function onRequestGet({ env }) {
  const since = Date.now() - 30 * 86400_000
  const [{ results: totals }, { results: gaps }] = await env.DB.batch([
    env.DB.prepare(
      `SELECT COUNT(*) AS conversations,
              SUM(unanswered) AS unanswered,
              SUM(feedback = 'up') AS helpful,
              SUM(feedback = 'down') AS not_helpful,
              SUM(ticket_id IS NOT NULL) AS escalated
       FROM conversations WHERE created_at > ?`,
    ).bind(since),
    env.DB.prepare(
      `SELECT c.id, c.created_at, c.unanswered, c.feedback, c.ticket_id, c.page,
              (SELECT content FROM chat_messages m
                 WHERE m.conversation_id = c.id AND m.role = 'user' ORDER BY m.id LIMIT 1) AS question
       FROM conversations c
       WHERE c.created_at > ? AND (c.unanswered = 1 OR c.feedback = 'down' OR c.ticket_id IS NOT NULL)
       ORDER BY c.created_at DESC LIMIT 100`,
    ).bind(since),
  ])
  return json({ totals: totals[0], gaps })
}
