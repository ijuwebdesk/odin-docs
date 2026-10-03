/**
 * The /support page: a streamed chat with the docs AI, thumbs up/down, and
 * the "Talk to a human" ticket form. The conversation survives navigating
 * around the docs for the rest of the browser session.
 */
import { escapeHtml, NO_ANSWER_MARKER, renderMarkdown, visibleAnswer } from './render'
import { turnstileToken } from './turnstile'

type Message = { role: 'user' | 'assistant'; content: string }
type State = { conversationId: string | null; messages: Message[]; votes: Record<number, boolean> }

const STORAGE_KEY = 'silk-support-chat'

function load(): State {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null')
    if (saved && Array.isArray(saved.messages)) return { votes: {}, ...saved }
  } catch {}
  return { conversationId: null, messages: [], votes: {} }
}

function save(state: State) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {}
}

export function initSupportChat(root: HTMLElement) {
  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!
  const log = $('[data-log]')
  const empty = $('[data-empty]')
  const form = $<HTMLFormElement>('[data-form]')
  const input = $<HTMLTextAreaElement>('[data-input]')
  const sendButton = $<HTMLButtonElement>('[data-send]')
  const turnstileBox = $('[data-turnstile]')
  const newChat = $<HTMLButtonElement>('[data-new-chat]')
  const ticket = $('[data-ticket]')
  const ticketForm = $<HTMLFormElement>('[data-ticket-form]')
  const ticketError = $('[data-ticket-error]')
  const ticketSubmit = $<HTMLButtonElement>('[data-ticket-submit]')
  const ticketDone = $('[data-ticket-done]')
  const includeChat = $('[data-include-chat]')

  let state = load()
  let busy = false

  // ── Rendering ────────────────────────────────────────────────────────────
  function scrollToEnd() {
    log.scrollTop = log.scrollHeight
  }

  function userBubble(text: string) {
    const el = document.createElement('div')
    el.className = 'msg msg-user'
    el.textContent = text
    return el
  }

  function assistantBubble(index: number, content: string, finished: boolean) {
    const el = document.createElement('div')
    el.className = 'msg msg-assistant'
    el.innerHTML = `<div class="body sl-markdown-content"></div>`
    fillAssistant(el, index, content, finished)
    return el
  }

  function fillAssistant(el: HTMLElement, index: number, content: string, finished: boolean) {
    const body = el.querySelector('.body')!
    const shown = visibleAnswer(content)
    body.innerHTML = shown ? renderMarkdown(shown) : '<span class="typing"><i></i><i></i><i></i></span>'
    el.querySelector('.msg-meta')?.remove()
    el.querySelector('.escalate')?.remove()
    if (!finished) return

    const vote = state.votes[index]
    const meta = document.createElement('div')
    meta.className = 'msg-meta'
    meta.innerHTML = `<span>Did this help?</span>
      <button type="button" class="vote" data-vote="yes" aria-pressed="${vote === true}">Yes</button>
      <button type="button" class="vote" data-vote="no" aria-pressed="${vote === false}">No</button>`
    meta.addEventListener('click', (e) => {
      const button = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-vote]')
      if (button) castVote(index, button.dataset.vote === 'yes', el)
    })
    el.append(meta)

    if (content.includes(NO_ANSWER_MARKER) || vote === false) {
      const card = document.createElement('div')
      card.className = 'escalate'
      card.innerHTML = `Want a person to look at this? <button type="button" class="link strong">Talk to a human</button>`
      card.querySelector('button')!.addEventListener('click', openTicket)
      el.append(card)
    }
  }

  function renderAll() {
    log.querySelectorAll('.msg').forEach((m) => m.remove())
    empty.hidden = state.messages.length > 0
    newChat.hidden = state.messages.length === 0
    state.messages.forEach((m, i) => {
      log.append(m.role === 'user' ? userBubble(m.content) : assistantBubble(i, m.content, true))
    })
    scrollToEnd()
  }

  function showError(message: string) {
    const el = document.createElement('div')
    el.className = 'msg msg-assistant msg-error'
    el.textContent = message
    log.append(el)
    scrollToEnd()
  }

  // ── Asking ───────────────────────────────────────────────────────────────
  async function ask(question: string) {
    question = question.trim()
    if (!question || busy) return
    busy = true
    sendButton.disabled = true
    log.querySelectorAll('.msg-error').forEach((m) => m.remove())

    state.messages.push({ role: 'user', content: question })
    empty.hidden = true
    newChat.hidden = false
    log.append(userBubble(question))
    const index = state.messages.length
    const bubble = assistantBubble(index, '', false)
    log.append(bubble)
    scrollToEnd()

    try {
      const turnstile = state.conversationId ? undefined : await turnstileToken(turnstileBox)
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: state.conversationId,
          messages: state.messages,
          page: document.referrer.startsWith(location.origin) ? new URL(document.referrer).pathname : null,
          turnstileToken: turnstile,
        }),
      })
      if (!res.ok || !res.body) {
        const { error } = await res.json().catch(() => ({ error: null }))
        throw new Error(error ?? 'Something went wrong. Please try again.')
      }
      state.conversationId = res.headers.get('X-Conversation-Id') ?? state.conversationId

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
      let answer = ''
      let frame = 0
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        answer += value
        // Re-render at most once a frame; markdown is re-parsed whole each time.
        cancelAnimationFrame(frame)
        frame = requestAnimationFrame(() => {
          const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 80
          fillAssistant(bubble, index, answer, false)
          if (nearBottom) scrollToEnd()
        })
      }
      cancelAnimationFrame(frame)
      if (!answer.trim()) throw new Error('No answer came back. Please try again.')

      state.messages.push({ role: 'assistant', content: answer })
      fillAssistant(bubble, index, answer, true)
      save(state)
    } catch (err) {
      bubble.remove()
      // Keep the question in the box so it can be retried, not in the history.
      state.messages.pop()
      log.lastElementChild?.remove()
      input.value = question
      autosize()
      if (state.messages.length === 0) empty.hidden = false
      showError((err as Error).message)
    } finally {
      busy = false
      sendButton.disabled = false
      scrollToEnd()
    }
  }

  async function castVote(index: number, helpful: boolean, el: HTMLElement) {
    state.votes[index] = helpful
    save(state)
    fillAssistant(el, index, state.messages[index].content, true)
    if (!state.conversationId) return
    fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: state.conversationId, helpful }),
    }).catch(() => {})
  }

  function autosize() {
    input.style.height = 'auto'
    input.style.height = `${Math.min(input.scrollHeight, 160)}px`
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const question = input.value
    input.value = ''
    autosize()
    ask(question)
  })
  input.addEventListener('input', autosize)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault()
      form.requestSubmit()
    }
  })
  root.querySelectorAll<HTMLButtonElement>('[data-suggestion]').forEach((chip) =>
    chip.addEventListener('click', () => ask(chip.textContent ?? '')),
  )
  newChat.addEventListener('click', () => {
    state = { conversationId: null, messages: [], votes: {} }
    save(state)
    renderAll()
    input.focus()
  })

  // ── Talk to a human ──────────────────────────────────────────────────────
  function openTicket() {
    const lastQuestion = [...state.messages].reverse().find((m) => m.role === 'user')?.content ?? ''
    const fields = ticketForm.elements as unknown as Record<string, HTMLInputElement>
    if (!fields.question.value) fields.question.value = lastQuestion
    if (!fields.subject.value) fields.subject.value = lastQuestion.split('\n')[0].slice(0, 80)
    includeChat.hidden = !state.conversationId
    ticket.hidden = false
    ticketForm.hidden = false
    ticketDone.hidden = true
    ticket.scrollIntoView({ behavior: 'smooth', block: 'start' })
    ;(fields.name.value ? fields.question : fields.name).focus({ preventScroll: true })
  }

  root.querySelector('[data-open-ticket]')!.addEventListener('click', openTicket)
  root.querySelector('[data-close-ticket]')!.addEventListener('click', () => (ticket.hidden = true))

  ticketForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const data = new FormData(ticketForm)
    const email = String(data.get('email') ?? '').trim()
    ticketError.hidden = true

    if (!String(data.get('name') ?? '').trim()) return fail('Please enter your name.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Please enter a valid email address.')
    if (String(data.get('question') ?? '').trim().length < 10) return fail('Please describe what you need help with.')

    ticketSubmit.disabled = true
    ticketSubmit.textContent = 'Sending…'
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.get('name'),
          email,
          subject: data.get('subject'),
          question: data.get('question'),
          conversationId: data.get('includeChat') && state.conversationId ? state.conversationId : null,
          turnstileToken: await turnstileToken(turnstileBox),
        }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(result.error ?? 'Something went wrong. Please try again.')

      ticketForm.hidden = true
      ticketForm.reset()
      ticketDone.hidden = false
      ticketDone.innerHTML = `<p><strong>Sent. Your ticket number is ${escapeHtml(result.ref)}.</strong></p>
        <p>We’ve emailed a confirmation to ${escapeHtml(email)}. The team usually replies within one business day.
        If the email doesn’t arrive, check your spam folder.</p>`
      ticketDone.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } catch (err) {
      fail((err as Error).message)
    } finally {
      ticketSubmit.disabled = false
      ticketSubmit.textContent = 'Send to the Silk team'
    }

    function fail(message: string) {
      ticketError.textContent = message
      ticketError.hidden = false
    }
  })

  // ── Start ────────────────────────────────────────────────────────────────
  renderAll()
  const prefill = new URLSearchParams(location.search).get('q')
  if (prefill) {
    input.value = prefill.slice(0, 2000)
    autosize()
  }
  if (location.hash === '#human') openTicket()
}
