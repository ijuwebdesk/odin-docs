---
title: Permissions Setup
description: How to grant Odin the permissions it needs on macOS and Windows.
sidebar:
  order: 3
---

import { Tabs, TabItem, Aside, Steps } from '@astrojs/starlight/components'

Odin requires two system permissions to function. You can grant them during the initial onboarding screen, or at any time by clicking the **shield icon** in the panel header or choosing **Permissions…** from the tray menu.

## Required permissions

### Microphone

Used for push-to-talk voice input. Without this, you can't speak to Odin.

### Screen Recording (macOS only)

Used to capture your display so Odin can see what you're looking at when it answers. Without this, Odin answers without any screen context.

On Windows, screen capture uses a system API that doesn't require a separate permission grant.

---

## Granting permissions

<Tabs>
  <TabItem label="macOS">

<Steps>
1. Open **System Settings → Privacy & Security → Microphone**.
2. Find **Odin AI** in the list and toggle it on.
3. Go back to **Privacy & Security → Screen Recording**.
4. Find **Odin AI** and toggle it on.
5. Restart Odin if prompted.
</Steps>

<Aside type="caution">
macOS requires a restart of the app (not the system) after granting Screen Recording access. If Odin isn't capturing your screen after enabling the permission, quit and reopen it from the menu bar.
</Aside>

  </TabItem>
  <TabItem label="Windows">

<Steps>
1. Open **Settings → Privacy & security → Microphone**.
2. Make sure **Microphone access** is on, and that **Odin AI** appears in the app list with access enabled.
</Steps>

Screen Recording access on Windows is handled automatically.

  </TabItem>
</Tabs>

---

## Re-checking permissions

Click the **shield icon** in the top-right of the Odin panel at any time to see the current status of each permission and re-trigger the system prompt if needed.

## Resetting onboarding

If you want to go through the onboarding flow again (for example, after a clean reinstall), delete the onboarding flag file:

<Tabs>
  <TabItem label="macOS">
  ```bash
  rm ~/Library/Application\ Support/odin-ai/onboarding-complete
  ```
  </TabItem>
  <TabItem label="Windows">
  Delete `%APPDATA%\odin-ai\onboarding-complete`.
  </TabItem>
</Tabs>

Relaunch Odin and the onboarding screen will appear again.
