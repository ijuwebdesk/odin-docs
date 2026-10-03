/**
 * The support inbox at /admin. Hash routes:
 *   #/open  #/answered  #/closed  #/all   ticket lists
 *   #/t/1001                              one ticket, inside the last list
 *   #/insights                            chat stats and doc gaps
 *   #/articles                            "was this page helpful?" votes and comments
 */
import { escapeHtml, renderMarkdown, timeAgo, visibleAnswer } from './render'

type Ticket = {
  id: number
  name: string
  email: string
  subject: string
  question: string
  status: 'open' | 'answered' | 'closed'
  draft: string | null
  draft_notes: string | null
  draft_status: 'pending' | 'ready' | 'failed'
  draft_model: string | null
  draft_updated_at: number | null
  created_at: number
  updated_at: number
}
type ChatTurn = { role: 'user' | 'assistant'; content: string }
type ThreadMessage = { direction: 'in' | 'out'; body: string; author: string | null; created_at: number }

const ref = (id: number) => `SILK-${id}`
/** A draft still pending after this long has died with its request; offer to regenerate. */
const STALE_DRAFT_MS = 2 * 60_000

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/admin${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (res.status === 401) {
    // The Access session expired; a full load sends the browser back through login.
    location.reload()
    throw new Error('Signed out')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`)
  return data
}

export function initAdmin(root: HTMLElement) {
  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!
  const layout = $('[data-layout]')
  const list = $('[data-list]')
  const detail = $('[data-detail]')
  const insights = $('[data-insights]')
  const toastEl = $('[data-toast]')

  let tab = 'open'
  let openId: number | null = null
  let pollTimer = 0
  let saveTimer = 0
  let toastTimer = 0

  function toast(message: string) {
    toastEl.textContent = message
    toastEl.hidden = false
    clearTimeout(toastTimer)
    toastTimer = window.setTimeout(() => (toastEl.hidden = true), 3500)
  }

  function markTab(name: string) {
    root.querySelectorAll<HTMLAnchorElement>('[data-tab]').forEach((a) => {
      if (a.dataset.tab === name) a.setAttribute('aria-current', 'page')
      else a.removeAttribute('aria-current')
    })
  }

  // ── List ─────────────────────────────────────────────────────────────────
  async function loadList() {
    const data = await api<{
      admin: string
      tickets: Ticket[]
      counts: Record<string, number>
    }>(`/tickets?status=${tab}`)
    $('[data-who]').textContent = `Signed in as ${data.admin}`
    for (const [status, n] of Object.entries(data.counts)) {
      const el = root.querySelector(`[data-count="${status}"]`)
      if (el) el.textContent = n ? String(n) : ''
    }

    list.innerHTML = data.tickets.length
      ? data.tickets
          .map(
            (t) => `<a class="item" href="#/t/${t.id}" data-id="${t.id}" aria-current="${t.id === openId}">
              <div class="item-top"><span>${ref(t.id)} · ${timeAgo(t.created_at)}</span>${draftPill(t)}</div>
              <div class="item-subject">${escapeHtml(t.subject)}</div>
              <div class="item-from">${escapeHtml(t.name)}</div>
            </a>`,
          )
          .join('')
      : `<p class="empty">${tab === 'open' ? 'Inbox zero. Nothing waiting on you.' : 'No tickets here.'}</p>`
  }

  function draftPill(t: Pick<Ticket, 'status' | 'draft_status' | 'draft' | 'draft_updated_at'>) {
    if (t.status !== 'open') return `<span class="pill">${t.status}</span>`
    if (t.draft_status === 'pending' && !isStale(t)) return `<span class="pill pending">drafting</span>`
    if (t.draft_status === 'failed' || t.draft_status === 'pending') return `<span class="pill failed">no draft</span>`
    return t.draft ? `<span class="pill ready">draft ready</span>` : ''
  }

  function isStale(t: Pick<Ticket, 'draft_updated_at'>) {
    return !t.draft_updated_at || Date.now() - t.draft_updated_at > STALE_DRAFT_MS
  }

  // ── One ticket ───────────────────────────────────────────────────────────
  async function loadTicket(id: number) {
    clearTimeout(pollTimer)
    const { ticket, transcript, thread } = await api<{
      ticket: Ticket
      transcript: ChatTurn[]
      thread: ThreadMessage[]
    }>(`/tickets/${id}`)
    if (openId !== id) return // the admin moved on while this loaded
    renderTicket(ticket, transcript, thread)

    // A draft is being written in the background; check back until it lands.
    if (ticket.draft_status === 'pending' && !isStale(ticket)) {
      pollTimer = window.setTimeout(() => openId === id && loadTicket(id), 3000)
    }
  }

  function renderTicket(t: Ticket, transcript: ChatTurn[], thread: ThreadMessage[]) {
    const drafting = t.draft_status === 'pending' && !isStale(t)
    const closed = t.status === 'closed'

    detail.innerHTML = `
      <a class="back" href="#/${tab}">← All tickets</a>
      <div class="head">
        <div>
          <h2>${escapeHtml(t.subject)}</h2>
          <div class="sub">${ref(t.id)} · ${escapeHtml(t.name)}
            &lt;<a href="mailto:${escapeHtml(t.email)}">${escapeHtml(t.email)}</a>&gt;
            · ${new Date(t.created_at).toLocaleString()}</div>
        </div>
        <div class="actions" style="margin:0">
          <span class="pill">${t.status}</span>
          <button type="button" class="btn" data-status="${closed ? 'open' : 'closed'}">
            ${closed ? 'Reopen' : 'Close'}</button>
        </div>
      </div>

      <div class="message"><span class="message-label">${escapeHtml(t.name)} wrote</span><div class="text">${escapeHtml(t.question)}</div></div>

      ${
        transcript.length
          ? `<details>
              <summary>Their chat with the AI before asking for help (${transcript.length} messages)</summary>
              ${transcript
                .map(
                  (m) => `<div class="turn"><b>${m.role === 'user' ? escapeHtml(t.name) : 'AI assistant'}</b>
                    <div class="sl-markdown-content">${
                      m.role === 'user' ? escapeHtml(m.content) : renderMarkdown(visibleAnswer(m.content))
                    }</div></div>`,
                )
                .join('')}
            </details>`
          : ''
      }

      ${thread
        .map(
          (m) => `<div class="message ${m.direction}">
            <span class="message-label">${m.direction === 'out' ? `Sent by ${escapeHtml(m.author ?? 'Silk team')}` : escapeHtml(t.name)}
              · ${new Date(m.created_at).toLocaleString()}</span>
            <div class="text">${escapeHtml(m.body)}</div></div>`,
        )
        .join('')}

      <div class="composer">
        <div class="composer-head">
          ${drafting ? 'AI is drafting a reply…' : t.draft ? 'AI draft' : 'Reply'}
          ${t.status === 'open' ? draftPill(t) : ''}
          ${t.draft_model && t.draft ? `<span class="model">${escapeHtml(t.draft_model)}</span>` : ''}
        </div>
        ${
          t.draft_notes
            ? `<div class="notes"><b>${t.draft_status === 'failed' ? 'Problem' : 'Notes from the AI'}:</b>\n${escapeHtml(t.draft_notes)}</div>`
            : ''
        }
        <textarea data-draft aria-label="Reply to ${escapeHtml(t.name)}" ${drafting ? 'disabled' : ''}
          placeholder="${drafting ? 'The draft will appear here in a few seconds.' : 'Write a reply, or generate a draft below.'}"
        >${escapeHtml(t.draft ?? '')}</textarea>
        <div class="actions">
          <button type="button" class="btn primary" data-send ${drafting ? 'disabled' : ''}>Approve &amp; send</button>
          <label class="check"><input type="checkbox" data-close-after /> Close after sending</label>
          <span class="hint">⌘/Ctrl + Enter sends</span>
        </div>
        <div class="actions">
          <div class="regen">
            <input type="text" data-note maxlength="1000"
              placeholder="Steer the AI (optional): e.g. “mention the permissions reset”" />
            <button type="button" class="btn" data-regenerate ${drafting ? 'disabled' : ''}>
              ${t.draft ? 'Regenerate' : 'Generate draft'}</button>
          </div>
        </div>
      </div>`

    const draft = detail.querySelector<HTMLTextAreaElement>('[data-draft]')!
    const send = detail.querySelector<HTMLButtonElement>('[data-send]')!
    const regenerate = detail.querySelector<HTMLButtonElement>('[data-regenerate]')!
    const note = detail.querySelector<HTMLInputElement>('[data-note]')!

    // Edits are saved as you type, so a half-written reply survives a reload.
    draft.addEventListener('input', () => {
      clearTimeout(saveTimer)
      saveTimer = window.setTimeout(
        () => api(`/tickets/${t.id}`, { method: 'PATCH', body: JSON.stringify({ draft: draft.value }) }),
        800,
      )
    })
    draft.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send.click()
    })

    send.addEventListener('click', async () => {
      const body = draft.value.trim()
      if (!body) return toast('The reply is empty.')
      clearTimeout(saveTimer)
      send.disabled = true
      send.textContent = 'Sending…'
      try {
        const close = detail.querySelector<HTMLInputElement>('[data-close-after]')!.checked
        await api(`/tickets/${t.id}/reply`, { method: 'POST', body: JSON.stringify({ body, close }) })
        toast(`Reply sent to ${t.email}`)
        await Promise.all([loadList(), loadTicket(t.id)])
      } catch (err) {
        toast((err as Error).message)
        send.disabled = false
        send.textContent = 'Approve & send'
      }
    })

    regenerate.addEventListener('click', async () => {
      regenerate.disabled = true
      send.disabled = true
      draft.disabled = true
      regenerate.textContent = 'Drafting…'
      try {
        await api(`/tickets/${t.id}/draft`, { method: 'POST', body: JSON.stringify({ note: note.value }) })
        await Promise.all([loadList(), loadTicket(t.id)])
      } catch (err) {
        toast((err as Error).message)
        await loadTicket(t.id)
      }
    })

    detail.querySelector<HTMLButtonElement>('[data-status]')!.addEventListener('click', async (e) => {
      const status = (e.currentTarget as HTMLButtonElement).dataset.status
      await api(`/tickets/${t.id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
      toast(status === 'closed' ? 'Ticket closed' : 'Ticket reopened')
      await Promise.all([loadList(), loadTicket(t.id)])
    })
  }

  // ── New ticket, on a customer's behalf ───────────────────────────────────
  function renderNewTicket() {
    detail.innerHTML = `
      <a class="back" href="#/${tab}">← All tickets</a>
      <h2>New ticket</h2>
      <p class="sub">For a request that reached you another way: a call, a DM, a chat. The AI drafts a
        reply as usual, and replies go to the customer by email.</p>
      <form class="new-ticket" data-new-ticket novalidate>
        <div class="field-row">
          <label><span>Customer name</span><input type="text" name="name" maxlength="100" required /></label>
          <label><span>Customer email</span><input type="email" name="email" maxlength="254" required /></label>
        </div>
        <label><span>Subject</span><input type="text" name="subject" maxlength="150" required /></label>
        <label><span>What do they need?</span>
          <textarea name="question" required placeholder="Their question or problem, in their words if you have them."></textarea>
        </label>
        <label class="check"><input type="checkbox" name="confirm" checked />
          Email the customer a confirmation with their ticket number</label>
        <div class="actions">
          <button type="submit" class="btn primary" data-create>Create ticket</button>
          <a href="#/${tab}">Cancel</a>
        </div>
      </form>`

    const form = detail.querySelector<HTMLFormElement>('[data-new-ticket]')!
    const create = form.querySelector<HTMLButtonElement>('[data-create]')!
    form.querySelector<HTMLInputElement>('[name="name"]')!.focus()
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      const data = new FormData(form)
      create.disabled = true
      create.textContent = 'Creating…'
      try {
        const { id } = await api<{ id: number }>('/tickets', {
          method: 'POST',
          body: JSON.stringify({
            name: data.get('name'),
            email: data.get('email'),
            subject: data.get('subject'),
            question: data.get('question'),
            confirm: data.get('confirm') === 'on',
          }),
        })
        toast(`${ref(id)} created`)
        tab = 'open'
        location.hash = `#/t/${id}`
      } catch (err) {
        toast((err as Error).message)
        create.disabled = false
        create.textContent = 'Create ticket'
      }
    })
  }

  // ── Insights ─────────────────────────────────────────────────────────────
  async function loadInsights() {
    insights.innerHTML = '<p class="placeholder">Loading…</p>'
    const { totals, gaps } = await api<{
      totals: Record<string, number | null>
      gaps: {
        created_at: number
        question: string | null
        unanswered: number
        feedback: string | null
        ticket_id: number | null
        page: string | null
      }[]
    }>('/insights')
    const n = (k: string) => totals[k] ?? 0
    const conversations = n('conversations')
    const pct = (k: string) => (conversations ? `${Math.round((n(k) / conversations) * 100)}%` : '–')

    insights.innerHTML = `
      <div class="stats">
        <div class="stat"><b>${conversations}</b><span>chats, last 30 days</span></div>
        <div class="stat"><b>${pct('unanswered')}</b><span>the docs didn’t cover</span></div>
        <div class="stat"><b>${n('helpful')} / ${n('not_helpful')}</b><span>rated helpful / not</span></div>
        <div class="stat"><b>${pct('escalated')}</b><span>became a ticket</span></div>
      </div>
      <h2>Doc gaps</h2>
      <p class="hint">Questions the AI couldn’t answer, that were rated unhelpful, or that turned into tickets.
        Each one is a page or a paragraph the docs are missing.</p>
      ${
        gaps.length
          ? gaps
              .map(
                (g) => `<div class="gap">
                  <time>${timeAgo(g.created_at)}</time>
                  <div>${escapeHtml(g.question ?? '(no question)')}</div>
                  <div class="flags">
                    ${g.unanswered ? '<span class="pill failed">not in docs</span>' : ''}
                    ${g.feedback === 'down' ? '<span class="pill pending">unhelpful</span>' : ''}
                    ${g.ticket_id ? `<a class="pill" href="#/t/${g.ticket_id}">${ref(g.ticket_id)}</a>` : ''}
                  </div>
                </div>`,
              )
              .join('')
          : '<p class="placeholder">No gaps in the last 30 days.</p>'
      }`
  }

  // ── Article feedback ─────────────────────────────────────────────────────
  async function loadArticles() {
    insights.innerHTML = '<p class="placeholder">Loading…</p>'
    const { days, pages } = await api<{
      days: number
      pages: {
        page: string
        title: string
        yes: number
        no: number
        comments: { helpful: number; comment: string; created_at: number }[]
      }[]
    }>('/articles')

    const yes = pages.reduce((n, p) => n + p.yes, 0)
    const no = pages.reduce((n, p) => n + p.no, 0)
    const comments = pages.reduce((n, p) => n + p.comments.length, 0)
    const pct = (a: number, b: number) => (a + b ? `${Math.round((a / (a + b)) * 100)}%` : '–')

    insights.innerHTML = `
      <div class="stats">
        <div class="stat"><b>${yes + no}</b><span>votes, last ${days} days</span></div>
        <div class="stat"><b>${pct(yes, no)}</b><span>found the page helpful</span></div>
        <div class="stat"><b>${pages.filter((p) => p.no > 0).length}</b><span>pages with a thumbs down</span></div>
        <div class="stat"><b>${comments}</b><span>comments from readers</span></div>
      </div>
      <h2>Pages, least helpful first</h2>
      <p class="hint">Open a page to read what readers said was missing. Fix the page, and the Ask Silk AI
        learns the fix on the next deploy too.</p>
      ${
        pages.length
          ? pages
              .map(
                (p) => `<details class="article">
                  <summary>
                    <span class="article-title">${escapeHtml(p.title)}
                      <small><a href="${escapeHtml(p.page)}" target="_blank" rel="noopener">${escapeHtml(p.page)}</a></small></span>
                    <span class="votes">👍 ${p.yes} · 👎 ${p.no}${p.comments.length ? ` · 💬 ${p.comments.length}` : ''}</span>
                    <span class="meter" title="${pct(p.yes, p.no)} helpful"><span style="width:${p.yes + p.no ? (p.yes / (p.yes + p.no)) * 100 : 0}%"></span></span>
                  </summary>
                  ${
                    p.comments.length
                      ? `<ul class="comments">${p.comments
                          .map(
                            (c) => `<li><div class="meta">
                                <span class="pill ${c.helpful ? 'ready' : 'failed'}">${c.helpful ? 'helpful' : 'not helpful'}</span>
                                <span>${timeAgo(c.created_at)}</span></div>${escapeHtml(c.comment)}</li>`,
                          )
                          .join('')}</ul>`
                      : '<p class="hint">No comments yet, just votes.</p>'
                  }
                </details>`,
              )
              .join('')
          : '<p class="placeholder">No article feedback yet.</p>'
      }`
  }

  // ── Routing ──────────────────────────────────────────────────────────────
  async function route() {
    clearTimeout(pollTimer)
    const hash = location.hash.replace(/^#\/?/, '') || 'open'
    try {
      if (hash === 'insights' || hash === 'articles') {
        openId = null
        markTab(hash)
        layout.hidden = true
        insights.hidden = false
        await (hash === 'insights' ? loadInsights() : loadArticles())
        return
      }
      layout.hidden = false
      insights.hidden = true

      const ticketMatch = hash.match(/^t\/(\d+)$/)
      if (ticketMatch) {
        openId = Number(ticketMatch[1])
        layout.setAttribute('data-open', '')
      } else if (hash === 'new') {
        openId = null
        layout.setAttribute('data-open', '')
        renderNewTicket()
      } else {
        tab = ['open', 'answered', 'closed', 'all'].includes(hash) ? hash : 'open'
        openId = null
        layout.removeAttribute('data-open')
        detail.innerHTML = '<p class="placeholder">Select a ticket.</p>'
      }
      markTab(tab)
      await Promise.all([loadList(), openId ? loadTicket(openId) : null])
    } catch (err) {
      toast((err as Error).message)
    }
  }

  window.addEventListener('hashchange', route)
  route()
}
