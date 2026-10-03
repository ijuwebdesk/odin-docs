/** Every /api/admin route requires a verified Cloudflare Access login. */
import { adminEmail } from '../../../server/access.js'
import { error } from '../../../server/http.js'

export async function onRequest(context) {
  const email = await adminEmail(context.request, context.env)
  if (!email) return error(401, 'Not signed in')
  context.data.admin = email
  return context.next()
}
