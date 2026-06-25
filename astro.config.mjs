import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'

export default defineConfig({
  integrations: [
    starlight({
      title: 'Odin Docs',
      description: 'Documentation for Odin AI — your always-on screen companion.',
      logo: {
        light: './src/assets/odin-logo-light.png',
        dark: './src/assets/odin-logo-dark.png',
        replacesTitle: true,
      },
      favicon: '/favicon.png',
      social: {},
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'What is Odin?', slug: 'getting-started/what-is-odin' },
            { label: 'Installation', slug: 'getting-started/installation' },
            { label: 'Permissions Setup', slug: 'getting-started/permissions' },
            { label: 'First Setup', slug: 'getting-started/first-setup' },
            { label: 'Quick Start', slug: 'getting-started/quick-start' },
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
