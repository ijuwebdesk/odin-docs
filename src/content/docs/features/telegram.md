---
title: Telegram Bridge
description: How to use Odin through Telegram.
sidebar:
  order: 9
---

import { Aside } from '@astrojs/starlight/components'

The Telegram Bridge lets you interact with Odin through a Telegram bot — useful when you're away from your computer, on your phone, or want to send tasks to Odin asynchronously.

## What you can do via Telegram

- Send text messages and get AI responses
- Trigger background agents and get results delivered back to the chat
- Ask Odin to do things on your computer while you're on the go

<Aside>
The Telegram bridge connects to the Odin instance running on your desktop. Your computer needs to be on and Odin needs to be running for the bridge to work.
</Aside>

## Setting up the Telegram Bridge

1. Open the Odin panel and go to **Settings → Telegram**.
2. Click **Connect Telegram**.
3. Odin will give you a link to open in Telegram — this starts a chat with your personal Odin bot.
4. Send `/start` in Telegram to verify the connection.

Once connected, messages you send in the Telegram chat are handled by the same Odin instance running on your desktop.

## Security

The bridge is personal — it only responds to your Telegram account. Messages between your phone and the Odin desktop app are relayed through Telegram's servers (end-to-end encrypted on your device) and then handled locally by Odin.

## Disconnecting

Go to **Settings → Telegram** and click **Disconnect** to remove the integration. Your Telegram bot token is deleted from Odin's configuration.
