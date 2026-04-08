# Using The 3rd Academy API with Claude Agent SDK

Guide for integrating the Praxis API (Anthropic-compatible) with the Claude Agent SDK to build AI-powered coding agents.

**Base URL:** `https://the3rdacademy.com/api`

---

## Overview

The 3rd Academy exposes two API endpoints:

| Endpoint | Format | Backend |
|----------|--------|---------|
| `POST /api/chat/completions` | OpenAI-compatible | A0 + Kilo Gateway |
| `POST /api/messages` | Anthropic-compatible | Kilo Gateway |

The Claude Agent SDK uses the Anthropic Messages format, so it works directly with `/api/messages` via environment variables.

---

## Quick Start

### 1. Install the Agent SDK

```bash
pnpm add @anthropic-ai/claude-agent-sdk
```

### 2. Set Environment Variables

```bash
export ANTHROPIC_BASE_URL=https://the3rdacademy.com/api
export ANTHROPIC_API_KEY=sk-praxis-<your-key>
```

The Agent SDK reads these automatically — no code-level configuration needed.

### 3. Run Your First Agent

```ts
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Read package.json and explain what this project does",
  options: {
    permissionMode: "bypassPermissions",
    allowDangerouslySkipPermissions: true,
  },
})) {
  if (message.type === "stream_event") {
    const event = message.event;
    if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
      process.stdout.write(event.delta.text);
    }
  } else if (message.type === "result") {
    console.log("\n\nDone:", message.result);
  }
}
```

---

## Architecture for Vite + Node.js IDE

```
Browser (Vite React)              Node.js Backend (Express)
┌──────────────────────┐         ┌─────────────────────────────────┐
│  Monaco Editor        │ fetch   │  Express Server                 │
│  File Explorer        │ ------> │    POST /api/agent              │
│  Terminal Panel       │ <--SSE  │      └── Agent SDK query()      │
│  Chat / Agent Panel   │         │           ├── Read files        │
│                       │         │           ├── Edit files         │
│  (No SDK here -       │         │           ├── Run commands       │
│   just fetch calls)   │         │           ├── Search code        │
└──────────────────────┘         │           └── Web search          │
                                  │                                   │
                                  │  ANTHROPIC_BASE_URL =             │
                                  │    https://the3rdacademy.com/api  │
                                  │  ANTHROPIC_API_KEY =              │
                                  │    sk-praxis-<key>                │
                                  └─────────────────────────────────┘
                                            │
                                            ▼
                                  ┌─────────────────────┐
                                  │  the3rdacademy.com   │
                                  │  /api/messages       │
                                  │  (Kilo Gateway)      │
                                  └─────────────────────┘
```

---

## Full Backend Implementation

### Project Structure

```
your-ide/
├── src/                        # Vite React frontend
│   ├── components/
│   │   └── AgentPanel.tsx      # Chat UI for agent
│   ├── App.tsx
│   └── main.tsx
├── server/                     # Node.js backend
│   └── index.ts                # Express + Agent SDK
├── package.json
├── vite.config.ts              # Proxy /api to backend
└── .env                        # API keys (gitignored)
```

### `.env`

```env
ANTHROPIC_BASE_URL=https://the3rdacademy.com/api
ANTHROPIC_API_KEY=sk-praxis-<your-key>
```

### `server/index.ts`

```ts
import "dotenv/config";
import express from "express";
import { query } from "@anthropic-ai/claude-agent-sdk";

const app = express();
app.use(express.json());

// Agent endpoint — streams events to the frontend via SSE
app.post("/api/agent", async (req, res) => {
  const { prompt, systemPrompt, workingDirectory } = req.body;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (payload: object) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  send({ type: "start", timestamp: Date.now() });

  try {
    for await (const message of query({
      prompt,
      options: {
        systemPrompt: systemPrompt || undefined,
        permissionMode: "bypassPermissions",
        allowDangerouslySkipPermissions: true,
        includePartialMessages: true,
      },
    })) {
      // Real-time text streaming
      if (message.type === "stream_event") {
        const event = message.event;
        if (
          event.type === "content_block_delta" &&
          event.delta?.type === "text_delta"
        ) {
          send({ type: "text", data: event.delta.text });
        } else if (
          event.type === "content_block_start" &&
          event.content_block?.type === "tool_use"
        ) {
          send({
            type: "tool_use",
            name: event.content_block.name,
            input: {},
          });
        }
      }

      // Tool results (file reads, command output, etc.)
      else if (message.type === "user") {
        const content = message.message?.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === "tool_result") {
              const resultText =
                typeof block.content === "string"
                  ? block.content
                  : Array.isArray(block.content)
                    ? block.content
                        .map((c: any) => (c.type === "text" ? c.text : `[${c.type}]`))
                        .join("\n")
                    : JSON.stringify(block.content);
              send({
                type: "tool_result",
                tool_use_id: block.tool_use_id,
                result: (resultText || "").substring(0, 2000),
              });
            }
          }
        }
      }

      // Final result
      else if (message.type === "result") {
        send({
          type: "result",
          subtype: message.subtype,
          result: message.result,
          cost: message.total_cost_usd,
        });
      }
    }

    send({ type: "complete" });
  } catch (err: any) {
    send({ type: "error", message: err.message });
  }

  res.end();
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Agent backend on :${PORT}`));
```

### `vite.config.ts`

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
```

### `package.json` scripts

```json
{
  "scripts": {
    "dev": "concurrently \"vite\" \"tsx watch server/index.ts\"",
    "dev:client": "vite",
    "dev:server": "tsx watch server/index.ts",
    "build": "vite build",
    "start": "tsx server/index.ts"
  }
}
```

---

## Frontend Integration

### `src/hooks/useAgent.ts`

```ts
import { useState, useCallback } from "react";

interface AgentEvent {
  type: "start" | "text" | "tool_use" | "tool_result" | "result" | "complete" | "error";
  data?: string;
  name?: string;
  input?: any;
  result?: string;
  message?: string;
}

export function useAgent() {
  const [isRunning, setIsRunning] = useState(false);
  const [messages, setMessages] = useState<AgentEvent[]>([]);
  const [text, setText] = useState("");

  const run = useCallback(async (prompt: string) => {
    setIsRunning(true);
    setMessages([]);
    setText("");

    const res = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ") || line === "data: [DONE]") continue;

        try {
          const event: AgentEvent = JSON.parse(line.slice(6));
          setMessages((prev) => [...prev, event]);

          if (event.type === "text" && event.data) {
            setText((prev) => prev + event.data);
          }
        } catch {
          // skip malformed
        }
      }
    }

    setIsRunning(false);
  }, []);

  return { run, isRunning, messages, text };
}
```

### `src/components/AgentPanel.tsx`

```tsx
import { useState } from "react";
import { useAgent } from "../hooks/useAgent";

export function AgentPanel() {
  const [input, setInput] = useState("");
  const { run, isRunning, messages, text } = useAgent();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isRunning) return;
    run(input.trim());
    setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Output */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-sm">
        {messages.map((msg, i) => {
          switch (msg.type) {
            case "text":
              return null; // Rendered as accumulated text below
            case "tool_use":
              return (
                <div key={i} className="text-yellow-400">
                  Using tool: {msg.name}
                </div>
              );
            case "tool_result":
              return (
                <div key={i} className="text-gray-400 text-xs max-h-20 overflow-hidden">
                  Result: {msg.result?.slice(0, 200)}
                </div>
              );
            case "error":
              return (
                <div key={i} className="text-red-400">
                  Error: {msg.message}
                </div>
              );
            case "complete":
              return (
                <div key={i} className="text-green-400">
                  Done.
                </div>
              );
            default:
              return null;
          }
        })}

        {/* Accumulated text output */}
        {text && (
          <div className="whitespace-pre-wrap">{text}</div>
        )}

        {isRunning && <div className="animate-pulse">Thinking...</div>}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the agent..."
          disabled={isRunning}
          className="w-full p-2 bg-gray-800 text-white rounded"
        />
      </form>
    </div>
  );
}
```

---

## MCP Server Integration

Add tool servers for extended capabilities:

```ts
for await (const message of query({
  prompt,
  options: {
    permissionMode: "bypassPermissions",
    allowDangerouslySkipPermissions: true,
    mcpServers: {
      // Web search via Tavily
      tavily: {
        type: "http",
        url: "https://your-tavily-mcp-gateway.com",
      },
      // GitHub operations
      github: {
        type: "http",
        url: "https://api.githubcopilot.com/mcp",
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        },
      },
      // Browser automation
      playwright: {
        command: "npx",
        args: ["@playwright/mcp@latest"],
      },
    },
    allowedTools: ["mcp__tavily__*", "mcp__github__*", "mcp__playwright__*"],
  },
}));
```

---

## E2B Sandbox Deployment (Cloud IDE)

For a cloud-hosted IDE (like Pipilot), run the agent inside an E2B sandbox:

```ts
import { Sandbox } from "e2b";

// Create sandbox
const sandbox = await Sandbox.create({ timeoutMs: 30 * 60 * 1000 });

// Install SDK inside sandbox
await sandbox.commands.run(
  'echo \'{"type":"module"}\' > package.json && pnpm add @anthropic-ai/claude-agent-sdk'
);

// Upload and run agent script
await sandbox.files.write("/home/user/agent.mjs", agentScript);

const result = await sandbox.commands.run("node agent.mjs", {
  envs: {
    ANTHROPIC_BASE_URL: "https://the3rdacademy.com/api",
    ANTHROPIC_API_KEY: "sk-praxis-<your-key>",
  },
  onStdout: (data) => {
    // Parse JSON lines and stream to client
  },
});
```

---

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `ANTHROPIC_BASE_URL` | API endpoint. Set to `https://the3rdacademy.com/api` | Yes |
| `ANTHROPIC_API_KEY` | Your Praxis API key (`sk-praxis-...`) | Yes |
| `GITHUB_TOKEN` | GitHub PAT for repo operations via MCP | Optional |

---

## Message Types from Agent SDK

| Type | Description | Key Fields |
|------|-------------|------------|
| `stream_event` | Real-time streaming deltas | `event.delta.text` |
| `assistant` | Full assistant message blocks | `message.content[]` |
| `user` | Tool results fed back | `message.content[].tool_result` |
| `result` | Final completion | `result`, `total_cost_usd` |

### Stream Event Subtypes

| Event Type | Delta Type | Description |
|------------|-----------|-------------|
| `content_block_start` | — | New text or tool_use block starting |
| `content_block_delta` | `text_delta` | Incremental text chunk |
| `content_block_delta` | `input_json_delta` | Tool input being streamed |
| `content_block_stop` | — | Block complete |

---

## How It All Connects

```
User types in IDE
       │
       ▼
Frontend (fetch /api/agent)
       │
       ▼
Express Backend
       │  Sets env vars:
       │  ANTHROPIC_BASE_URL = https://the3rdacademy.com/api
       │  ANTHROPIC_API_KEY  = sk-praxis-<key>
       │
       ▼
Agent SDK query()
       │  Reads env vars automatically
       │  Sends requests to /api/messages
       │
       ▼
the3rdacademy.com/api/messages
       │  Converts Anthropic format → OpenAI format
       │  Forwards to Kilo Gateway
       │
       ▼
Kilo Gateway (LLM inference)
       │
       ▼
Response flows back:
  Kilo → /api/messages → Agent SDK → Express → SSE → Frontend
```
