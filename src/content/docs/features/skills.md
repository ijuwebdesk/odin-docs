---
title: Skills
description: Reusable instructions that give Odin specialized capabilities.
sidebar:
  order: 7
---

import { Aside } from '@astrojs/starlight/components'

Skills are saved sets of instructions that Odin applies automatically during agent sessions. When skills are enabled, they are injected silently into every agent task — Odin reads them and applies them when relevant, without you needing to invoke them explicitly.

## What is a skill?

A skill is a named instruction set you write once and Odin uses forever. Each skill has:

- A **name** — used to identify it in the Skills editor
- A **description** — one line explaining when it applies
- **Content** — the instructions Odin follows

Examples of useful skills:

- A **code-review** skill that focuses Odin on correctness and performance over style
- A **writing-coach** skill that asks Odin to improve clarity and tone
- A **sql-tutor** skill that emphasizes query optimization and explains trade-offs
- A **commit-messages** skill that formats git commit messages your preferred way

## Creating and editing skills

Open the panel and click **Skills** to open the Skills editor window. The left pane lists all your skills. The right pane is a text editor.

To create a new skill:

1. Click **+** in the top-right of the skills list.
2. Write your skill content in the editor. The name comes from the `name:` field in the frontmatter.
3. Click **Save**.

**Skill format:**

```markdown
---
name: code-review
description: Focus on correctness and performance when reviewing code
---

## When to use

Apply this when the user shares code for review or asks you to look at an implementation.

## Workflow

1. Check for correctness bugs first — wrong logic, edge cases, null handling.
2. Flag performance issues — unnecessary loops, N+1 queries, large allocations.
3. Note style issues last — naming, formatting, verbosity.
4. Be direct and specific. Reference exact line numbers or function names.
5. Don't suggest rewrites unless there's a genuine problem.
```

## Enabling skills

Skills can be toggled on or off globally in Settings. When enabled, all saved skills are injected into agent sessions. When disabled, none are.

<Aside>
Skills are also built automatically by background agents. When an agent discovers a useful pattern or workflow, it can write it as a skill so Odin remembers it for the future.
</Aside>

## Deleting a skill

Select the skill in the Skills editor and click **Delete**, then confirm.
