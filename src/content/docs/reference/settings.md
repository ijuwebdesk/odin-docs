---
title: Settings
description: Every setting in Silk and what it does.
sidebar:
  order: 1
---

Open the Silk panel and click the **gear icon** to open Settings.

## AI

| Setting | What it does |
|---|---|
| **OpenRouter API Key** | The key Silk uses to reach the AI. Paste it with the **Paste** button next to the field. See [First Setup](/getting-started/first-setup/). |
| **API spend** | How much this key has spent today, so you can keep an eye on costs. |
| **Model ID** | Which AI model Silk uses. The default is `deepseek/deepseek-v4.1-flash`; see [Choosing an AI Model](/reference/ai-models/) for alternatives. |
| **Background task folder** | Where [background agents](/features/background-agents/) save the files they create. |

## Window and appearance

| Setting | What it does |
|---|---|
| **Detached window** | Off: Silk lives under its icon in the menu bar or system tray. On: Silk gets its own movable window and a Dock or taskbar icon. Handy if your menu bar is full. |
| **Text size** | Makes the panel's text larger or smaller. |
| **Theme** | Dark or light. |

## Voice

| Setting | What it does |
|---|---|
| **Voice hotkey** | The push-to-talk shortcut, `Ctrl+Space` by default. Click it and press a new combination to change it; **Reset** restores the default. See [Push-to-Talk](/features/push-to-talk/#changing-the-hotkey). |
| **Language** | The language you speak to Silk in, and the voice it answers with: English, Spanish, French, Chinese, Japanese or Korean. [More about languages](/features/push-to-talk/#languages). |
| **Speaking** | Turn Silk's spoken replies on or off. Replies always appear as text in the panel too. |
| **Sound when tied off** | A short sound when a task finishes. Nothing else in Silk makes a sound. |
| **Microphone** | Choose which microphone Silk listens to, and test it: the level bars should move when you speak. |

## Pointing

| Setting | What it does |
|---|---|
| **High-accuracy pointing** | Off by default. Turn it on if you work in design or custom-drawn apps (Photoshop, Figma and similar) where the [cursor overlay](/features/cursor-overlay/) doesn't land exactly on the right element. It uses a more powerful model only when needed, so it costs a little more. |

## Privacy

| Setting | What it does |
|---|---|
| **Share anonymous usage** | On by default. Sends anonymous counts and timings (never your screen, recordings, prompts or files) to help us improve Silk. Turn it off any time. |

## Telegram

At the bottom of Settings: **Connect** pairs Silk with Telegram so you can send it tasks from your phone, and **Unpair** disconnects. See [Telegram Bridge](/features/telegram/).

## Panel menu

These open from the menu in the Silk panel rather than from Settings:

| Item | What it opens |
|---|---|
| **Skills** | Create, edit and turn on [skills](/features/skills/). |
| **Teach a skill** | Show Silk how to do something once, and it saves it as a reusable skill. |
| **Scheduled tasks** | Set up [recurring tasks](/features/scheduled-tasks/). |
| **Memory** | View and edit what Silk [remembers](/features/memory/) about you. |
| **Conversation history** | Your past conversations. |
| **MCP servers** | Connect [MCP servers](/features/mcp-servers/) for extra tools. |
| **License** | Your plan, **Refresh license**, and **Deactivate this PC**. See [Activation & License](/getting-started/activation/). |

## Permissions

Click the **shield icon** at the top of the panel, or choose **Permissions…** from the Silk menu-bar or tray menu, to check and re-grant **Microphone** and (on macOS) **Screen Recording**. See [Permissions Setup](/getting-started/permissions/).
