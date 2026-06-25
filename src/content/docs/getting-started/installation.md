---
title: Installation
description: How to install Odin AI on macOS and Windows.
sidebar:
  order: 2
---

import { Tabs, TabItem, Aside } from '@astrojs/starlight/components'

## Download

Download the latest version of Odin from [download.heyodinai.com](https://download.heyodinai.com).

<Tabs>
  <TabItem label="macOS">

**Requirements:** macOS 12 or later, Apple Silicon or Intel.

1. Download the `.dmg` file for your architecture:
   - `Odin-AI-arm64.dmg` — Apple Silicon (M1, M2, M3, M4)
   - `Odin-AI-x64.dmg` — Intel
2. Open the `.dmg` and drag **Odin AI** into your Applications folder.
3. Launch Odin AI from Applications.

<Aside type="tip">
If macOS shows "Odin AI cannot be opened because the developer cannot be verified", right-click the app and choose **Open** instead of double-clicking. This only needs to happen once.
</Aside>

  </TabItem>
  <TabItem label="Windows">

**Requirements:** Windows 10 or later (64-bit).

1. Download `Odin-AI-Setup.exe`.
2. Run the installer. You may see a Windows SmartScreen warning — click **More info → Run anyway**. This is expected for new releases.
3. Follow the installer steps. Odin AI can be installed per-user (no admin required).
4. Launch Odin AI from the Start menu or desktop shortcut.

  </TabItem>
</Tabs>

## First launch

When you first open Odin, it walks you through a short onboarding flow to grant the permissions it needs:

1. **Microphone** — required for push-to-talk voice input.
2. **Screen Recording** — required on macOS for screen capture and AI analysis.

You must grant both permissions before Odin can function fully. See [Permissions Setup](/getting-started/permissions/) for details.

After permissions are granted, Odin's icon appears in your **menu bar** (macOS) or **system tray** (Windows). Click it to open the companion panel.

## Updating

Odin updates itself automatically in the background. When a new version is available, it downloads silently and applies on the next launch. You can check your current version in the panel settings.
