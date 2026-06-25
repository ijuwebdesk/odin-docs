---
title: MCP Servers
description: How to connect Odin to external tools via the Model Context Protocol.
sidebar:
  order: 8
---

import { Aside } from '@astrojs/starlight/components'

Odin supports the [Model Context Protocol (MCP)](https://modelcontextprotocol.io) — an open standard for connecting AI assistants to external tools, databases, APIs, and services. Once connected, Odin can read from and write to those systems as part of any conversation.

## What MCP enables

With MCP servers, Odin can:

- Query your database ("how many active users do we have this month?")
- Read and write files via a filesystem server
- Fetch data from APIs
- Interact with services like GitHub, Notion, Slack, or Linear
- Use any custom tool you expose as an MCP server

## Adding an MCP server

1. Open the Odin panel and go to **Settings → MCP Servers**.
2. Click **Add Server**.
3. Enter the server name and the command to start it (or the URL for remote servers).
4. Click **Connect**.

Once connected, Odin sees the server's tools and can use them automatically.

<Aside type="tip">
The MCP ecosystem has hundreds of ready-made servers. Search [mcp.run](https://mcp.run) or the [MCP server registry](https://github.com/modelcontextprotocol/servers) for integrations with popular tools.
</Aside>

## Example: connecting a filesystem server

```json
{
  "name": "filesystem",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/you/projects"]
}
```

After connecting, you can ask Odin things like "list all TypeScript files in my projects folder" or "read the contents of my .env file".

## Example: connecting a GitHub server

```json
{
  "name": "github",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_..."
  }
}
```

## Authentication

Many MCP servers require API keys or tokens. Pass these as environment variables in the server configuration. They are stored locally and never sent to Odin's servers.

## Managing servers

Go to **Settings → MCP Servers** to view all connected servers, disconnect them, or check their status. Servers are started when Odin launches and stopped when it quits.

<Aside type="caution">
Only connect MCP servers from sources you trust. A malicious server could instruct Odin to read sensitive files or take unintended actions.
</Aside>
