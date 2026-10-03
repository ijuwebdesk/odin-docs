/** OpenRouter chat completions, streamed for the chat and buffered for drafts. */

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'

export const DEFAULT_CHAT_MODEL = 'anthropic/claude-haiku-4.5'
export const DEFAULT_DRAFT_MODEL = 'anthropic/claude-sonnet-5.5'

function request(env, body) {
  if (!env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is not set')
  // OPENROUTER_URL points local tests at a stand-in; production never sets it.
  return fetch(env.OPENROUTER_URL ?? ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      // Shown on the OpenRouter activity page, so usage is attributable.
      'HTTP-Referer': 'https://support.heysilkai.com',
      'X-Title': 'Silk Support',
    },
    body: JSON.stringify({ ...body, usage: { include: true } }),
  })
}

/** A full completion: `{ text, model, tokensIn, tokensOut }`. */
export async function complete(env, { model, messages, maxTokens }) {
  const res = await request(env, { model, messages, max_tokens: maxTokens })
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const data = await res.json()
  return {
    text: data.choices?.[0]?.message?.content ?? '',
    model: data.model ?? model,
    tokensIn: data.usage?.prompt_tokens ?? null,
    tokensOut: data.usage?.completion_tokens ?? null,
  }
}

/** Parses OpenRouter's SSE stream into text deltas, recording model and usage on `result`. */
function sseToText(result) {
  let buffer = ''
  return new TransformStream({
    transform(chunk, controller) {
      buffer += chunk
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) {
        // SSE comments (": OPENROUTER PROCESSING") keep the connection alive; skip them.
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6).trim()
        if (payload === '[DONE]') continue
        const event = JSON.parse(payload)
        if (event.error) throw new Error(event.error.message ?? 'stream error')
        if (event.model) result.model = event.model
        if (event.usage) {
          result.tokensIn = event.usage.prompt_tokens ?? null
          result.tokensOut = event.usage.completion_tokens ?? null
        }
        const delta = event.choices?.[0]?.delta?.content
        if (delta) {
          result.text += delta
          controller.enqueue(delta)
        }
      }
    },
  })
}

/**
 * Streams a completion as UTF-8 text. Returns the body for the visitor plus
 * a promise of the finished result for logging. The stream is teed, so the
 * logging branch drains to the end even if the visitor closes the tab.
 * Throws before streaming starts if OpenRouter rejects the request.
 */
export async function stream(env, { model, messages, maxTokens }) {
  const res = await request(env, { model, messages, max_tokens: maxTokens, stream: true })
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 300)}`)

  const result = { text: '', model, tokensIn: null, tokensOut: null, error: null }
  const [toVisitor, toLog] = res.body.pipeThrough(new TextDecoderStream()).pipeThrough(sseToText(result)).tee()

  const done = (async () => {
    const reader = toLog.getReader()
    try {
      while (!(await reader.read()).done) {}
    } catch (err) {
      result.error = String(err?.message ?? err)
    }
    return result
  })()

  return { body: toVisitor.pipeThrough(new TextEncoderStream()), done }
}
