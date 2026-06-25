---
title: Screen Capture & Analysis
description: How Odin sees your screen and uses it to give better answers.
sidebar:
  order: 2
---

import { Aside } from '@astrojs/starlight/components'

Odin captures your screen every time you ask a question via push-to-talk. This screenshot is sent to the AI alongside your voice transcription, giving Odin full visual context before it responds.

## What gets captured

When you release the push-to-talk key, Odin takes a screenshot of **all connected displays**. If you have multiple monitors, each is captured separately.

The AI receives every screenshot and identifies which display has the active cursor (labeled "primary focus"). It prioritizes that one but can reference content on other screens if relevant.

## How Odin uses the screenshot

Odin uses the screenshot to:

- **Answer context-specific questions** — "what does this error mean?" is answered with the actual error on your screen.
- **Point at UI elements** — see [Cursor Overlay](/features/cursor-overlay/) for how Odin highlights things with the blue triangle.
- **Read code** — Odin can read your editor and explain, refactor, or debug what's visible.
- **Navigate you through UIs** — "where's the export option?" gets a visual pointer to the right menu item.

<Aside>
Odin also receives a list of actionable UI elements (buttons, menus, text fields) extracted from the active app's accessibility tree. This gives it precise positions of real controls — more reliable than pixel estimation.
</Aside>

## Privacy

Screenshots are sent to the AI inference server to generate a response. They are not stored permanently on Odin's servers.

To stop Odin from seeing your screen for a particular question, open the panel and type your question as text instead of speaking it. Text-only queries do not trigger a screenshot.

## Multiple displays

On a multi-monitor setup:

- All screens are captured.
- The display where your cursor is active is marked as the primary focus.
- Odin can reference elements on secondary displays when relevant, with coordinates scoped to the correct screen.

## macOS vs Windows

On macOS, screen capture requires the **Screen Recording** permission (see [Permissions](/getting-started/permissions/)). If this permission is not granted, Odin will respond without any visual context.

On Windows, screen capture works via a system API and does not require a separate permission grant.
