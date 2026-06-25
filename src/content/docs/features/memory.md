---
title: Memory
description: How Odin remembers things about you across conversations.
sidebar:
  order: 6
---

import { Aside } from '@astrojs/starlight/components'

Odin has a persistent memory store. When you share stable facts about yourself, your projects, or your preferences, Odin can remember them and apply them in future conversations — without you needing to repeat yourself. Memory is injected into every agent session at the start.

## What Odin remembers

Memory is designed for **stable, reusable facts**, not ephemeral conversation context. Good things to tell Odin:

- Your name and role ("call me Alex", "I'm a senior backend engineer")
- Project paths and context ("my main project is at `~/code/acme-api`", "we use PostgreSQL, not MySQL")
- Tool and language preferences ("I prefer TypeScript over JavaScript", "I use Neovim")
- Recurring workflows ("when I ask for code, always add JSDoc comments")

<Aside>
Odin does **not** save things like today's task, a one-off question, or context that only makes sense in the current session.
</Aside>

## How to save a memory

Just tell Odin naturally via push-to-talk:

> "Remember that my project is at ~/work/odin-backend."

> "I go by my first name, it's Jordan."

> "We deploy to Railway, not Heroku."

Odin will confirm it saved and write it to your memory file automatically.

## Viewing and editing memory

Open the panel and click **Memory** to open the Memory editor — a dedicated window with a text editor showing your full memory file. You can read, add, or remove anything directly.

- Hit **Save** (or `⌘S` / `Ctrl+S`) to write changes.
- Hit **Reset** to clear memory back to empty (the current content is archived automatically before clearing).

Memory is a plain markdown file, so you can write it in any style that makes sense to you. Odin reads it verbatim at the start of every session.

## How memory is used

At the start of every conversation and agent task, Odin reads your memory file and includes it in its context. Everything in memory is available to Odin even if you don't mention it.

Memory is archived automatically before every write, so you can never accidentally lose a previous version.
