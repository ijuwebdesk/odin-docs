---
title: Push-to-Talk
description: How Odin's voice input works.
sidebar:
  order: 1
---

import { Aside } from '@astrojs/starlight/components'

Push-to-talk is the primary way you speak to Odin. Hold your configured key, speak your message, and release — Odin transcribes what you said, captures your screen, and responds.

## How it works

1. **Hold** your push-to-talk key.
2. **Speak** naturally. There's no time limit.
3. **Release** the key. Odin stops recording and immediately begins processing.
4. **Listen** — a voice response plays through your speakers within a few seconds.

Odin takes a screenshot of your screen at the moment you release the key, so it has context for your question.

## Hotkey

The push-to-talk hotkey is **`Ctrl+Space`** on both macOS and Windows.

<Aside type="tip">
The push-to-talk key is a global hotkey — it works even when Odin's panel isn't focused or visible. You don't need to click on anything first.
</Aside>

## Conversation continuity

Odin remembers the entire conversation within a session. You can ask follow-up questions naturally:

> "What does this function do?"
> *(Odin explains)*
> "How would I test it?"
> *(Odin builds on the previous answer)*

The conversation context is shown in the panel's history view.

## When Odin doesn't respond

- Make sure the microphone permission is granted (see [Permissions](/getting-started/permissions/)).
- Check that your system microphone is working (try another app).
- Ensure you're holding the key — a short tap without speaking won't trigger a response.

## Interrupting a response

If Odin is speaking and you hold the push-to-talk key again, the current response stops and your new recording begins immediately.
