/**
 * Browser-side helpers shared by the support chat and the admin inbox.
 * AI output is untrusted: it is rendered as markdown and then sanitized.
 */
import DOMPurify from 'dompurify'
import { marked } from 'marked'

/** Ends an AI chat answer when the docs don't cover the question (see server/prompts.js). */
export const NO_ANSWER_MARKER = '[[NO_ANSWER]]'

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName !== 'A') return
  const href = node.getAttribute('href') ?? ''
  // Docs links stay in the tab; anything off-site opens a new one.
  if (/^https?:\/\//.test(href) && !href.startsWith(location.origin)) {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

/** The answer as it should be shown: marker removed, including a half-streamed one. */
export function visibleAnswer(raw: string): string {
  return raw.replaceAll(NO_ANSWER_MARKER, '').replace(/\[\[[A-Z_]*\]?$/, '').trimEnd()
}

export function renderMarkdown(source: string): string {
  return DOMPurify.sanitize(marked.parse(source, { async: false, breaks: true }) as string)
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

export function timeAgo(ms: number): string {
  const minutes = Math.round((Date.now() - ms) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(ms).toLocaleDateString()
}
