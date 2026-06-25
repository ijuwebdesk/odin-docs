---
title: What is Odin?
description: An overview of Odin AI — the always-on screen companion.
sidebar:
  order: 1
---

Odin is an AI companion that lives in your menu bar. It watches your screen, listens when you speak, and responds with a voice — all in real time.

Unlike a chat window you switch to, Odin stays in the background until you need it. Hold your push-to-talk key, say something, and Odin hears you, sees your screen, and replies through your speakers. No typing. No alt-tabbing.

## What Odin can do

### Answer questions about your screen

Odin captures your display before it responds, so it knows what you're looking at. Ask "what does this error mean?" or "where's that setting?" and it can point directly at the relevant element on screen.

### Talk back

Responses are spoken aloud via text-to-speech. Odin is tuned to sound conversational — short, direct sentences, no bullet points, no markdown. You can keep talking while it answers.

### Run background agents

For tasks that take more than a few seconds — writing code, doing research, creating files — Odin can spin up a background agent that works headlessly while you continue with other things. When it's done, you'll hear the result.

### Control your computer

In Act Mode, Odin takes control of your mouse and keyboard to complete tasks on your behalf. Ask it to "create a new GitHub issue" or "fill in this form" and it will do it for you in your actual browser, using your existing sessions and logins.

### Remember things

You can tell Odin facts about yourself and your work — your name, your project paths, your preferences — and it will carry those memories into every future conversation.

### Connect to tools (MCP)

Odin supports the Model Context Protocol. Connect it to your local tools, databases, APIs, or services and it can read and write data through them as part of any conversation.

## Platform support

| Platform | Status |
|---|---|
| macOS (Apple Silicon + Intel) | Supported |
| Windows (x64) | Supported |
| Linux | Not supported |

## How it works

Odin runs as an Electron app. The main process manages the tray icon, windows, and IPC. The AI inference is done remotely via a Cloudflare Worker that proxies requests to language model APIs. Audio (speech-to-text and text-to-speech) is handled by a dedicated audio server.

Your screen captures and voice audio are sent to the AI and audio servers to generate responses — they are not stored permanently.
