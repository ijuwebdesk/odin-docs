/**
 * GET /api/attachment?key&exp&sig — one stored attachment, for the AI
 * provider to fetch while drafting. Only links signed by the drafter work,
 * and each expires within the hour; admins use /api/admin/attachments/:id.
 */
import { serveAttachment, verifyLink } from '../../server/attachments.js'

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url)
  const key = url.searchParams.get('key')
  if (!(await verifyLink(env, key, url.searchParams.get('exp'), url.searchParams.get('sig')))) {
    return new Response('Not found', { status: 404 })
  }
  // Not looked up in D1: a preview deployment's drafts sign links to this host too.
  return serveAttachment(env, key)
}
