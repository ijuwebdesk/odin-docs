import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import sitemap from '@astrojs/sitemap'
import supportKnowledgeBundle from './integrations/support-kb.mjs'

export default defineConfig({
  // Needed for absolute canonical/og:url tags and the sitemap. Without it every
  // page shipped an empty <link rel="canonical"/> and Search Console flagged
  // pages as "Duplicate without user-selected canonical" (Nov 2026).
  site: 'https://support.heysilkai.com',
  // Kept from the Odin naming so existing links and bookmarks survive the rebrand.
  redirects: {
    '/getting-started/what-is-odin/': '/getting-started/what-is-silk/',
    '/getting-started/using-odin-effectively/': '/getting-started/using-silk-effectively/',
  },
  integrations: [
    // Added here (not left to Starlight) so the admin inbox stays out of it.
    sitemap({ filter: (page) => !page.includes('/admin') }),
    supportKnowledgeBundle(),
    starlight({
      title: 'Silk Docs',
      description: 'Documentation for Silk — your always-on screen companion.',
      logo: {
        light: './src/assets/silk-lockup-primary-ink.svg',
        dark: './src/assets/silk-lockup-primary.svg',
        replacesTitle: true,
      },
      favicon: '/favicon.png',
      head: [
        // Crisp at every size; the PNG in `favicon` stays as the fallback.
        {
          tag: 'link',
          attrs: { rel: 'icon', href: '/silk-icon.svg', type: 'image/svg+xml' },
        },
        {
          tag: 'link',
          attrs: { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        },
        // The wordmark is Fraunces ROMAN, slanted synthetically. Never request the
        // ital axis: Fraunces Italic has a swashed k and is a different word.
        {
          tag: 'link',
          attrs: { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        },
        {
          tag: 'link',
          attrs: { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'stylesheet',
            href: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,500;9..144,700&display=swap',
          },
        },
      ],
      social: {},
      sidebar: [
        { label: 'Ask Silk', link: '/support/', badge: { text: 'AI', variant: 'tip' } },
        {
          label: 'Getting Started',
          items: [
            { label: 'What is Silk?', slug: 'getting-started/what-is-silk' },
            { label: 'Installation', slug: 'getting-started/installation' },
            { label: 'Activation & License', slug: 'getting-started/activation' },
            { label: 'Permissions Setup', slug: 'getting-started/permissions' },
            { label: 'First Setup', slug: 'getting-started/first-setup' },
            { label: 'Use Your Claude Subscription', slug: 'getting-started/claude-subscription' },
            { label: 'Use Your ChatGPT Subscription', slug: 'getting-started/chatgpt-subscription' },
            { label: 'Quick Start', slug: 'getting-started/quick-start' },
            { label: 'Using Silk Effectively', slug: 'getting-started/using-silk-effectively' },
          ],
        },
        {
          label: 'Core Features',
          items: [
            { label: 'The Silk App Window', slug: 'features/app-window', badge: { text: 'New', variant: 'success' } },
            { label: 'Push-to-Talk', slug: 'features/push-to-talk' },
            { label: 'Typing to Silk', slug: 'features/typing', badge: { text: 'New', variant: 'success' } },
            { label: 'Screen Capture & Analysis', slug: 'features/screen-capture' },
            { label: 'Drawing on Your Screen', slug: 'features/drawing', badge: { text: 'New', variant: 'success' } },
            { label: 'Cursor Overlay', slug: 'features/cursor-overlay' },
            { label: 'Background Agents', slug: 'features/background-agents' },
            { label: 'History & Projects', slug: 'features/history-projects', badge: { text: 'New', variant: 'success' } },
            { label: 'Scheduled Tasks', slug: 'features/scheduled-tasks' },
            { label: 'Suggestion Cards', slug: 'features/suggestions', badge: { text: 'New', variant: 'success' } },
          ],
        },
        {
          label: 'Advanced Features',
          items: [
            { label: 'Act Mode', slug: 'features/act-mode' },
            { label: 'The Silk Browser', slug: 'features/silk-browser', badge: { text: 'New', variant: 'success' } },
            { label: 'Memory', slug: 'features/memory' },
            { label: 'Skills', slug: 'features/skills' },
            { label: 'MCP Servers', slug: 'features/mcp-servers' },
            { label: 'Telegram Bridge', slug: 'features/telegram' },
            { label: 'Silk Community Perks', slug: 'features/community', badge: { text: 'New', variant: 'success' } },
            { label: 'Agency Dashboard', slug: 'features/agency' },
          ],
        },
        {
          label: 'Live Training Replays',
          items: [
            { label: 'Live Training Replays', slug: 'training/live-training-replays' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: "What's New", slug: 'reference/whats-new' },
            { label: 'Settings', slug: 'reference/settings' },
            { label: 'Keyboard Shortcuts', slug: 'reference/shortcuts' },
            { label: 'Troubleshooting', slug: 'reference/troubleshooting' },
            { label: 'Choosing an AI Model', slug: 'reference/ai-models' },
            { label: 'FAQ', slug: 'reference/faq' },
          ],
        },
      ],
      components: {
        Banner: './src/components/Banner.astro',
        Footer: './src/components/Footer.astro',
      },
      customCss: ['./src/styles/custom.css'],
    }),
  ],
})
