/**
 * POST /api/chat — streams an AI answer grounded in the Silk docs.
 *
 * Body: { conversationId?, messages: [{ role, content }], page?, turnstileToken? }
 * The browser keeps the history and sends it each turn; the server logs only
 * the newest question and the answer. A new conversation needs a Turnstile
 * token; follow-ups ride on the conversation id, capped by MAX_TURNS.
 * Responds with a text/plain stream and the id in X-Conversation-Id.
 */
import { error, readJson, text } from '../../server/http.js'
import { allow, ipHash, verifyTurnstile } from '../../server/limits.js'
import { DEFAULT_CHAT_MODEL, stream } from '../../server/openrouter.js'
import { chatMessages, NO_ANSWER_MARKER } from '../../server/prompts.js'

const MAX_TURNS = 20
const MAX_QUESTION = 2000
const MAX_HISTORY_MESSAGE = 6000

export async function onRequestPost({ request, env, waitUntil }) {
  const body = await readJson(request)
  if (!body || !Array.isArray(body.messages)) return error(400, 'Invalid request')

  const history = body.messages
    .slice(-MAX_TURNS * 2)
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
    .map((m) => ({ role: m.role, content: text(m.content, MAX_HISTORY_MESSAGE) }))
    .filter((m) => m.content)
  const question = history.at(-1)
  if (!question || question.role !== 'user') return error(400, 'Ask a question first')
  if (question.content.length > MAX_QUESTION) {
    return error(400, `Please keep questions under ${MAX_QUESTION} characters`)
  }

  const db = env.DB
  const ip = await ipHash(request, env)
  const withinLimits =
    (await allow(db, `chat:h:${ip}`, 40, 3600)) && (await allow(db, `chat:d:${ip}`, 150, 86400))
  if (!withinLimits) {
    return error(429, "You've asked a lot of questions in a short time. Please wait a bit, or contact the team.")
  }

  const now = Date.now()
  let conversation = null
  if (typeof body.conversationId === 'string') {
    conversation = await db
      .prepare('SELECT id, turns FROM conversations WHERE id = ? AND created_at > ?')
      .bind(body.conversationId, now - 24 * 3600_000)
      .first()
  }
  if (!conversation) {
    if (!(await verifyTurnstile(body.turnstileToken, request, env))) {
      return error(403, 'Please complete the verification check and try again.')
    }
    conversation = { id: crypto.randomUUID(), turns: 0 }
    await db
      .prepare('INSERT INTO conversations (id, created_at, updated_at, ip_hash, page) VALUES (?, ?, ?, ?, ?)')
      .bind(conversation.id, now, now, ip, text(body.page, 300) || null)
      .run()
  }
  if (conversation.turns >= MAX_TURNS) {
    return error(429, 'This conversation has reached its length limit. Start a new chat to keep going.')
  }

  await db
    .prepare("INSERT INTO chat_messages (conversation_id, role, content, created_at) VALUES (?, 'user', ?, ?)")
    .bind(conversation.id, question.content, now)
    .run()

  let answer
  try {
    answer = await stream(env, {
      model: env.CHAT_MODEL ?? DEFAULT_CHAT_MODEL,
      messages: chatMessages(history),
      // Headroom for models that reason before answering; reasoning counts toward the cap.
      maxTokens: 2500,
    })
  } catch (err) {
    console.error('chat failed', err)
    return error(502, 'The assistant is unavailable right now. You can still reach a person with "Talk to a human".')
  }

  waitUntil(
    answer.done.then((result) =>
      db.batch([
        db
          .prepare(
            `INSERT INTO chat_messages (conversation_id, role, content, model, tokens_in, tokens_out, created_at)
             VALUES (?, 'assistant', ?, ?, ?, ?, ?)`,
          )
          .bind(
            conversation.id,
            result.text || `(no answer${result.error ? `: ${result.error}` : ''})`,
            result.model,
            result.tokensIn,
            result.tokensOut,
            Date.now(),
          ),
        db
          .prepare(
            `UPDATE conversations SET turns = turns + 1, updated_at = ?,
             unanswered = MAX(unanswered, ?) WHERE id = ?`,
          )
          .bind(Date.now(), result.text.includes(NO_ANSWER_MARKER) ? 1 : 0, conversation.id),
      ]),
    ),
  )

  return new Response(answer.body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Conversation-Id': conversation.id,
    },
  })
}
