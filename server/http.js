/** Small response and validation helpers shared by the support API routes. */

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...init.headers },
  })
}

export function error(status, message) {
  return json({ error: message }, { status })
}

/** The request body as JSON, or null if it isn't valid JSON. */
export async function readJson(request) {
  try {
    return await request.json()
  } catch {
    return null
  }
}

/** A trimmed string no longer than `max`, or '' for anything that isn't a string. */
export function text(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export function isEmail(value) {
  return /^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]{2,}$/.test(value) && value.length <= 254
}

/** SILK-1001, the ticket number customers and admins see. */
export function ticketRef(id) {
  return `SILK-${id}`
}
