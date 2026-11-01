/**
 * Files customers attach to support email. The mailer Worker stores the bytes
 * in R2 and passes their keys along; this records them against the ticket,
 * serves them to the admin, and turns them into something the drafting AI
 * can read: screenshots as images, PDFs through OpenRouter's PDF parser, and
 * text files (logs, CSVs) inline.
 *
 * Images and PDFs reach OpenRouter as short-lived signed links rather than
 * base64, so a large screenshot costs the Function no CPU to encode.
 */

const PUBLIC_ORIGIN = 'https://support.heysilkai.com'
const LINK_TTL_MS = 60 * 60_000

/** Shown in the browser; everything else downloads. Never SVG or HTML: they can run script. */
const INLINE_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf'])
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp'])
const TEXT_EXTENSIONS = /\.(txt|log|json|csv|tsv|md|xml|ya?ml|ini|conf|cfg)$/i

/** What the AI gets per draft. Newest attachments win when there are more. */
const AI_LIMITS = { images: 6, pdfs: 3, texts: 4 }
const MAX_IMAGE = 5 * 1024 * 1024
const MAX_PDF = 10 * 1024 * 1024
const MAX_TEXT_FILE = 200 * 1024
const MAX_TEXT_CHARS = 20_000
/** Inline images this small are signature logos and social icons, not screenshots. */
const LOGO_SIZE = 20 * 1024

/** The mailer's attachment list, checked: only keys it could have written are accepted. */
export function validAttachments(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((a) => typeof a?.key === 'string' && /^inbound\/[0-9a-f-]{36}\/[^/]+$/.test(a.key))
    .slice(0, 50)
    .map((a) => ({
      key: a.key,
      filename: String(a.filename ?? 'attachment').slice(0, 200),
      contentType: String(a.contentType ?? 'application/octet-stream').toLowerCase().slice(0, 100),
      size: Number(a.size) || 0,
      inline: a.inline ? 1 : 0,
    }))
}

/** Statements recording attachments; `messageId` null means the ticket's first message. */
export function attachmentInserts(db, ticketId, messageId, attachments) {
  const now = Date.now()
  return attachments.map((a) =>
    db
      .prepare(
        `INSERT INTO attachments (ticket_id, message_id, r2_key, filename, content_type, size, inline, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(ticketId, messageId, a.key, a.filename, a.contentType, a.size, a.inline, now),
  )
}

export async function loadAttachments(db, ticketId) {
  const { results } = await db
    .prepare(
      `SELECT id, message_id, r2_key, filename, content_type, size, inline, created_at
       FROM attachments WHERE ticket_id = ? ORDER BY id`,
    )
    .bind(ticketId)
    .all()
  return results
}

/**
 * Streams a stored file with headers that keep it from running as part of the
 * site. Name and type default to what the mailer stored with it in R2.
 */
export async function serveAttachment(env, key, filename = key.split('/').pop(), contentType = null) {
  const object = await env.ATTACHMENTS.get(key)
  if (!object) return new Response('Not found', { status: 404 })
  contentType ??= object.httpMetadata?.contentType ?? 'application/octet-stream'
  const inline = INLINE_TYPES.has(contentType)
  return new Response(object.body, {
    headers: {
      'Content-Type': inline ? contentType : 'application/octet-stream',
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
      'Cache-Control': 'private, max-age=3600',
    },
  })
}

// ── Signed links, for the AI provider to fetch ───────────────────────────────

async function signature(env, key, exp) {
  if (!env.INBOUND_SECRET) throw new Error('INBOUND_SECRET is not set')
  const hmacKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.INBOUND_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  // The prefix keeps these signatures from meaning anything anywhere else the secret is used.
  const mac = await crypto.subtle.sign('HMAC', hmacKey, new TextEncoder().encode(`attachment-link:${key}:${exp}`))
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function signedLink(env, a) {
  const exp = Date.now() + LINK_TTL_MS
  const params = new URLSearchParams({ key: a.r2_key, exp: String(exp), sig: await signature(env, a.r2_key, exp) })
  return `${PUBLIC_ORIGIN}/api/attachment?${params}`
}

/** True when the link's signature is ours and it hasn't expired. */
export async function verifyLink(env, key, exp, sig) {
  if (!key || !/^\d+$/.test(exp ?? '') || Number(exp) < Date.now() || typeof sig !== 'string') return false
  const expected = new TextEncoder().encode(await signature(env, key, exp))
  const given = new TextEncoder().encode(sig)
  return expected.byteLength === given.byteLength && crypto.subtle.timingSafeEqual(expected, given)
}

// ── For the drafting AI ──────────────────────────────────────────────────────

/**
 * The ticket's attachments as chat content parts, plus a one-line-each
 * inventory so the AI knows what it can and can't see. `hasPdf` tells the
 * caller to switch on OpenRouter's PDF parser.
 */
export async function attachmentParts(env, attachments) {
  const parts = []
  const inventory = []
  const used = { images: 0, pdfs: 0, texts: 0 }
  let hasPdf = false

  for (const a of [...attachments].reverse()) {
    const isText = a.content_type.startsWith('text/') || TEXT_EXTENSIONS.test(a.filename)
    if (IMAGE_TYPES.has(a.content_type)) {
      if (a.inline && a.size < LOGO_SIZE) continue // a logo; not worth listing either
      if (a.size <= MAX_IMAGE && used.images < AI_LIMITS.images) {
        used.images++
        parts.push({ type: 'image_url', image_url: { url: await signedLink(env, a) } })
        inventory.push(`${a.filename} (image, attached below)`)
        continue
      }
    } else if (a.content_type === 'application/pdf') {
      if (a.size <= MAX_PDF && used.pdfs < AI_LIMITS.pdfs) {
        used.pdfs++
        hasPdf = true
        parts.push({ type: 'file', file: { filename: a.filename, file_data: await signedLink(env, a) } })
        inventory.push(`${a.filename} (PDF, attached below)`)
        continue
      }
    } else if (isText && a.size <= MAX_TEXT_FILE && used.texts < AI_LIMITS.texts) {
      const object = await env.ATTACHMENTS.get(a.r2_key)
      if (object) {
        used.texts++
        let body = await object.text()
        if (body.length > MAX_TEXT_CHARS) body = `${body.slice(0, MAX_TEXT_CHARS / 2)}\n[…]\n${body.slice(-MAX_TEXT_CHARS / 2)}`
        parts.push({ type: 'text', text: `<attachment name="${a.filename.replace(/"/g, "'")}">\n${body}\n</attachment>` })
        inventory.push(`${a.filename} (text, attached below)`)
        continue
      }
    }
    inventory.push(`${a.filename} (${a.content_type}, ${Math.round(a.size / 1024)} KB, not readable by you; the agent can open it)`)
  }
  return { parts: parts.reverse(), inventory: inventory.reverse(), hasPdf }
}
