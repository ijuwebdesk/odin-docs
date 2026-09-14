import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'

export default defineConfig({
  // Kept from the Odin naming so existing links and bookmarks survive the rebrand.
  redirects: {
    '/getting-started/what-is-odin/': '/getting-started/what-is-silk/',
    '/getting-started/using-odin-effectively/': '/getting-started/using-silk-effectively/',
  },
  integrations: [
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
        {
          label: 'Getting Started',
          items: [
            { label: 'What is Silk?', slug: 'getting-started/what-is-silk' },
            { label: 'Installation', slug: 'getting-started/installation' },
            { label: 'Permissions Setup', slug: 'getting-started/permissions' },
            { label: 'First Setup', slug: 'getting-started/first-setup' },
            { label: 'Quick Start', slug: 'getting-started/quick-start' },
            { label: 'Using Silk Effectively', slug: 'getting-started/using-silk-effectively' },
          ],
        },
        {
          label: 'Core Features',
          items: [
            { label: 'Push-to-Talk', slug: 'features/push-to-talk' },
            { label: 'Screen Capture & Analysis', slug: 'features/screen-capture' },
            { label: 'Cursor Overlay', slug: 'features/cursor-overlay' },
            { label: 'Background Agents', slug: 'features/background-agents' },
          ],
        },
        {
          label: 'Advanced Features',
          items: [
            { label: 'Act Mode', slug: 'features/act-mode' },
            { label: 'Memory', slug: 'features/memory' },
            { label: 'Skills', slug: 'features/skills' },
            { label: 'MCP Servers', slug: 'features/mcp-servers' },
            { label: 'Telegram Bridge', slug: 'features/telegram' },
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
            { label: 'Settings', slug: 'reference/settings' },
            { label: 'Keyboard Shortcuts', slug: 'reference/shortcuts' },
            { label: 'Troubleshooting', slug: 'reference/troubleshooting' },
          ],
        },
      ],
      customCss: ['./src/styles/custom.css'],
    }),
  ],
})
