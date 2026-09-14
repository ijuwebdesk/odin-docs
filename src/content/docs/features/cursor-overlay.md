---
title: Cursor Overlay
description: How Silk's blue triangle pointer works.
sidebar:
  order: 3
---

The cursor overlay is a small blue triangle that floats over your screen and flies to elements Silk wants to point at. When Silk says "click the File menu" or "that button in the top right", the triangle moves there so you see exactly what it means.

## How pointing works

After generating a response, Silk determines whether there's a specific UI element worth highlighting. If there is, the overlay animates from its current position to that element and hovers over it while Silk speaks.

Silk chooses what to point at based on:

1. **The accessibility element list** — a numbered list of real UI controls (buttons, menus, text fields) extracted from the active app. Pointing at an element from this list is precise because it uses the actual control bounds.
2. **Pixel coordinates** — a fallback for content inside web pages or other areas not covered by the accessibility list. Silk estimates the position from the screenshot dimensions.

## When Silk points

Silk points whenever visual guidance adds value:

- You ask how to do something in an app ("how do I create a new branch?")
- You ask where a setting or button is
- You ask Silk to explain a specific part of the screen
- You ask Silk to navigate you through a workflow

Silk does **not** point when the answer has nothing to do with the screen, or the relevant element is obvious.

## Multiple monitors

The overlay appears on the correct display — Silk tracks which screen contains the relevant element and positions the triangle there.

## Dismissing the overlay

The overlay fades out automatically after Silk finishes speaking. You can also click anywhere to dismiss it immediately.

## Overlay visibility

If the overlay doesn't appear, check:

- **Screen Recording** permission is granted on macOS (required for the overlay window to appear above other apps).
- Silk is not hidden behind a full-screen app. The overlay is a system-level floating window, but some full-screen applications block it.
