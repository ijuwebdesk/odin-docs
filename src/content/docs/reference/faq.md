---
title: FAQ
description: Answers to the questions people ask most about Silk, from AI costs and languages to privacy and what Silk can do.
sidebar:
  order: 5
---

## Costs and AI

### Do I have to pay for the AI separately?

Yes, and it's usually very little. Silk is **bring your own AI engine**: your purchase is the Silk software, and the AI runs on your own [OpenRouter](https://openrouter.ai) account, which bills you directly for what you use. With the default model, a typical task costs around a cent. Silk never charges you for AI usage. See [First Setup](/getting-started/first-setup/#what-does-the-ai-cost).

### Can I use my ChatGPT, Claude, Gemini or Copilot subscription?

**ChatGPT, yes.** From Silk 1.1.79, Settings has **Use my ChatGPT subscription**, which runs Silk on your ChatGPT plan with no OpenRouter account or extra AI bill. Plus or Pro is recommended. See [Use Your ChatGPT Subscription](/getting-started/chatgpt-subscription/).

Claude, Gemini and Copilot subscriptions can't power Silk. OpenRouter gives you models from all the major providers under one key.

### Can I run Silk for free?

OpenRouter has free models (IDs ending in `:free`), and Silk can use one that supports image input and tools. They're rate-limited and less accurate, though, so Silk will be slower and less reliable. A paid model with a credit limit on the key is usually the better way to keep costs down: you can never be charged more than the limit. See [Choosing an AI Model](/reference/ai-models/#free-models).

### Which AI model should I use?

The default, `deepseek/deepseek-v4.1-flash`, came top in our benchmark: it passed every test task, was the fastest of the accurate models, and costs about a cent per task. See [Choosing an AI Model](/reference/ai-models/) for alternatives.

### Will I get a surprise bill?

Not if you set a **credit limit** on your OpenRouter key: the key stops working when it reaches the limit. Silk's Settings also show how much your key has spent today.

## Computers and platforms

### Which computers does Silk run on?

**macOS 12 or later** (Apple Silicon or Intel) and **Windows 10 or later** (64-bit). Windows on ARM devices, such as the Surface Pro 11, run Silk through Windows' built-in emulation. Silk isn't available for Linux, iPhone or Android, but you can send it tasks from your phone with the [Telegram Bridge](/features/telegram/).

### Can I use Silk on more than one computer?

Yes, up to the number your plan includes. To move Silk to another computer, deactivate it on the old one first. See [Activation & License](/getting-started/activation/#using-silk-on-another-computer).

### Does Silk have to be running for Telegram and scheduled tasks to work?

Yes. Both run on your computer, so it needs to be on with Silk open. Turn on **Start Silk at login** in the Scheduled Tasks window (or send `/startup on` in Telegram) so it's always ready.

## Languages

### Does Silk work in my language?

You can **speak** to Silk in English, Spanish, French, Chinese, Japanese or Korean (set it in **Settings → Language**). You can **type** to Silk in almost any language, including through Telegram, and Silk can read screens and apps in any language. If your language isn't on the spoken list, type your requests. See [Languages](/features/push-to-talk/#languages).

## What Silk can do

### What is Silk best at?

- **Live, on-screen guidance** where generic tutorials don't match what you see, for example setting up Facebook or Instagram business tools. Silk looks at your actual screen and points you to the right place.
- **Doing hands-on work in any app or website:** navigating, filling in forms, multi-step tasks.
- **Research and deliverables** through [background agents](/features/background-agents/): reports, summaries, documents and PDFs.
- **Recurring work** with [scheduled tasks](/features/scheduled-tasks/).

### What are its limits?

- Silk works by **using your screen and apps** the way you would, and through background agents. It isn't a back-end automation platform that connects to your accounts' data directly.
- **Huge clean-ups** (say, 100,000 emails) are best done together: Silk helps you plan the approach and drives your email app's own bulk tools (filters, rules, bulk delete) rather than reading every email one by one.
- Silk is a capable assistant **for tasks you direct**. It won't independently run a business or build a whole platform on its own. Give it concrete tasks and outcomes and it does them well.

### Where's the button to create an agent?

There isn't one: you just ask. Say or type something like *"Start a background agent to research our top three competitors and write a summary."* The agent appears in the Agent Dock. See [Background Agents](/features/background-agents/).

## Privacy

### Does Silk record my screen all the time?

No. Silk looks at your screen when you ask it something, so it can see what you're asking about, and while it's carrying out a task you've given it, so it can see what it's doing. It doesn't record your screen in the background.

### Where do my requests go?

Your requests go from your computer to the AI model you chose, through your own OpenRouter account. Your API key is stored on your computer and only sent to OpenRouter. If you use your ChatGPT subscription instead, requests go to OpenAI through your ChatGPT account, and Silk never sees your ChatGPT password.

### Does Silk collect data about me?

Silk sends **anonymous usage data** (counts and timings, never your screen, recordings, prompts or files) to help us improve it. You can turn it off in **Settings → Privacy**.

## Help and training

### Where can I learn to use Silk?

Start with the [Quick Start](/getting-started/quick-start/) and [Using Silk Effectively](/getting-started/using-silk-effectively/), and watch the [Live Training Replays](/training/live-training-replays/).

### How do I contact support?

Start with [Ask Silk](/support/), also the **Ask Silk** button at the bottom-right of every page: it answers instantly from these docs. If that doesn't solve it, [talk to a human](/support/#human) and the Silk team replies by email, usually within one business day. As a last resort you can email [support@heysilkai.com](mailto:support@heysilkai.com).
