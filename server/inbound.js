/** Parsing helpers for inbound support email (see functions/api/inbound.js). */

/** The new part of an email reply: quoted history and "On … wrote:" blocks removed. */
export function stripQuoted(body) {
  const normalized = body.replace(/\r\n/g, '\n')
  const cut = normalized.search(
    /\n[^\n]*\bOn [^\n]{0,300}(\n[^\n]{0,300})?wrote:\s*\n|\n-{2,}\s*Original Message\s*-{2,}|\n_{5,}\nFrom: |\nFrom: [^\n]+\n(Sent|Date): /i,
  )
  const kept = (cut === -1 ? normalized : normalized.slice(0, cut))
    .split('\n')
    .filter((line) => !line.startsWith('>'))
    .join('\n')
    .trim()
  return kept || normalized.trim()
}

export function messageIds(...headers) {
  return headers
    .filter(Boolean)
    .join(' ')
    .match(/<[^<>\s]+>/g) ?? []
}
