/**
 * Cloudflare Turnstile, run invisibly on demand: `turnstileToken()` resolves
 * with a fresh single-use token, and only shows a challenge to visitors
 * Cloudflare is unsure about. On localhost it returns '' and the server
 * skips verification.
 */

/** Public by design: the site key identifies the widget, the secret stays server-side. */
const SITE_KEY = '0x4AAAAAAFM0SKxp239n9R2w'

declare global {
  interface Window {
    turnstile?: {
      render(el: HTMLElement, options: Record<string, unknown>): string
      execute(id: string): void
      reset(id: string): void
    }
  }
}

let widgetId: string | null = null
let pending: { resolve: (t: string) => void; reject: (e: Error) => void } | null = null
let scriptLoaded: Promise<void> | null = null

function loadScript(): Promise<void> {
  scriptLoaded ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Could not load the verification check'))
    document.head.append(script)
  })
  return scriptLoaded
}

export async function turnstileToken(container: HTMLElement): Promise<string> {
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return ''
  await loadScript()
  const turnstile = window.turnstile!

  return new Promise((resolve, reject) => {
    pending = { resolve, reject }
    if (widgetId === null) {
      widgetId = turnstile.render(container, {
        sitekey: SITE_KEY,
        execution: 'execute',
        appearance: 'interaction-only',
        callback: (token: string) => pending?.resolve(token),
        'error-callback': () => pending?.reject(new Error('Verification failed. Please try again.')),
      })
    } else {
      turnstile.reset(widgetId)
    }
    turnstile.execute(widgetId)
  })
}
