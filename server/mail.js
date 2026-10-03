/**
 * Outbound support email. Pages Functions can't hold a `send_email` binding,
 * so mail goes through the `silk-support-mailer` Worker (workers/mailer) over
 * a service binding. Without the binding (local dev) messages are logged.
 */
import { ticketRef } from './http.js'

const SITE = 'https://support.heysilkai.com'

function supportAddress(env) {
  return env.SUPPORT_EMAIL ?? 'support@heysilkai.com'
}

async function send(env, message) {
  if (!env.MAILER) {
    console.log('[mail:dev] would send', JSON.stringify(message, null, 2))
    return { messageId: `<dev-${crypto.randomUUID()}@localhost>` }
  }
  const res = await env.MAILER.fetch('https://mailer/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: { email: supportAddress(env), name: 'Silk Support' }, ...message }),
  })
  if (!res.ok) throw new Error(`mailer ${res.status}: ${await res.text()}`)
  return res.json()
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

/** Plain text to simple email HTML: paragraphs, line breaks, clickable links. */
function toHtml(body) {
  const paragraphs = escapeHtml(body)
    .split(/\n{2,}/)
    .map((p) => p.replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)]/g, (url) => `<a href="${url}">${url}</a>`))
    .map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, '<br>')}</p>`)
    .join('')
  return `<div style="font:15px/1.55 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#171523;max-width:600px">${paragraphs}</div>`
}

function subjectFor(ticket) {
  return `[${ticketRef(ticket.id)}] ${ticket.subject}`
}

/**
 * Where "a ticket needs you" alerts go. Not support@ itself: mail to support@
 * now becomes tickets, so an alert sent there would open a ticket of its own.
 */
function alert(env, ticket, label, heading, message) {
  if (!env.NOTIFY_EMAIL) {
    console.warn('NOTIFY_EMAIL is not set; skipping team alert for ticket', ticket.id)
    return null
  }
  const body = [
    `${heading}`,
    `Subject: ${ticket.subject}`,
    message,
    `An AI draft reply is being prepared. Review and send it in the portal, not by replying here:\n${SITE}/admin/#/t/${ticket.id}`,
  ].join('\n\n')
  return send(env, {
    to: env.NOTIFY_EMAIL,
    subject: `${label}: ${subjectFor(ticket)}`,
    text: body,
    html: toHtml(body),
  })
}

/** Alerts the team that a ticket arrived. */
export function notifyNewTicket(env, ticket) {
  return alert(env, ticket, 'New ticket', `New ticket from ${ticket.name} <${ticket.email}>.`, ticket.question)
}

/** Alerts the team that a customer wrote back on an existing ticket. */
export function notifyCustomerReply(env, ticket, reply) {
  return alert(env, ticket, 'Customer replied', `Customer reply from ${ticket.name} <${ticket.email}>.`, reply)
}

/** Confirms receipt to the customer. Its Message-ID anchors the email thread. */
export function confirmToCustomer(env, ticket) {
  const first = ticket.name.split(/\s+/)[0]
  const body = [
    `Hi ${first},`,
    `Thanks for getting in touch. We've received your request and a member of the Silk team will reply to this email address, usually within one business day.`,
    `Your ticket number is ${ticketRef(ticket.id)}. If you have anything to add, just reply to this email.`,
    `What you sent us:\n${ticket.question}`,
    `The Silk team`,
  ].join('\n\n')
  return send(env, {
    to: ticket.email,
    replyTo: supportAddress(env),
    subject: subjectFor(ticket),
    text: body,
    html: toHtml(body),
  })
}

/** An agent's reply to the customer, threaded under the confirmation email. */
export function replyToCustomer(env, ticket, body) {
  const footer = `\n\n—\nTicket ${ticketRef(ticket.id)} · Reply to this email if you need anything else.`
  const anchor = ticket.thread_message_id?.replace(/^<?(.*?)>?$/, '<$1>')
  const headers = anchor ? { 'In-Reply-To': anchor, References: anchor } : undefined
  return send(env, {
    to: ticket.email,
    replyTo: supportAddress(env),
    subject: `Re: ${subjectFor(ticket)}`,
    text: body + footer,
    html: toHtml(body + footer),
    headers,
  })
}
