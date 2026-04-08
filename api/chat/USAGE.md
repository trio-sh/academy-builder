# Chat Completions API

OpenAI-compatible chat completions endpoint with built-in tools and custom tool support.

**Endpoint:** `POST /api/chat/completions`

---

## Quick Start

### Basic Chat

```bash
curl -X POST /api/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      { "role": "user", "content": "Hello, how are you?" }
    ]
  }'
```

### Streaming

```bash
curl -X POST /api/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      { "role": "user", "content": "Write a short poem" }
    ],
    "stream": true
  }'
```

---

## Authentication

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | **Yes** | `Bearer <your-api-key>` (set via `PRAXIS_API_KEY` env var) |
| `Content-Type` | Required | Must be `application/json` |

`x-api-key: <key>` is also accepted as an alternative to `Authorization: Bearer`.

> **Note:** Authentication is only enforced when the `PRAXIS_API_KEY` environment variable is set on the server. If unset, all requests are allowed.

---

## Request Body

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `messages` | `Message[]` | *required* | Conversation history |
| `model` | `string` | `"a0-default"` | Model identifier (passed through) |
| `max_tokens` | `number` | `4096` | Maximum tokens to generate |
| `temperature` | `number` | `0.7` | Sampling temperature (0-2) |
| `stream` | `boolean` | `false` | Enable SSE streaming |
| `tools` | `Tool[]` | `undefined` | Custom tool definitions |
| `tool_choice` | `any` | `undefined` | Tool selection preference |
| `multistep` | `boolean` | `false` | Enable multi-step agent loop |
| `max_steps` | `number` | `10` | Max tool-use turns (when `multistep: true`, cap: 60) |

### Message Format

```ts
interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];     // Present on assistant messages with tool calls
  tool_call_id?: string;       // Required on tool result messages
  name?: string;               // Optional tool name
}
```

### Tool Definition Format

Same as OpenAI's function calling format:

```json
{
  "type": "function",
  "function": {
    "name": "lookup_order",
    "description": "Look up an order by its ID",
    "parameters": {
      "type": "object",
      "properties": {
        "order_id": {
          "type": "string",
          "description": "The order ID to look up"
        }
      },
      "required": ["order_id"]
    }
  }
}
```

---

## Built-in Tools

These tools are always available and execute automatically on the server. You do not need to define them in `tools` or handle their execution.

| Tool | Description | Parameters |
|------|-------------|------------|
| `web_search` | Search the web via DuckDuckGo | `query: string` |
| `web_extract` | Extract text content from a URL | `url: string` |
| `image_generation` | Generate an image from a prompt | `prompt: string`, `aspect?: string`, `seed?: number` |

When streaming, built-in tool execution emits status events (see [Streaming: Status Events](#status-events-built-in-tools)).

---

## Non-Streaming Response

### Standard Response (`finish_reason: "stop"`)

```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1709900000,
  "model": "a0-default",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! I'm doing well. How can I help you?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 12,
    "completion_tokens": 12,
    "total_tokens": 24
  },
  "_meta": {
    "internal_tool_calls": 0,
    "tools_used": []
  }
}
```

### Tool Call Response (`finish_reason: "tool_calls"`)

Returned when the model wants to call one of your custom tools:

```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1709900000,
  "model": "a0-default",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Let me look that up for you.",
        "tool_calls": [
          {
            "id": "call_9xk2m4pq7n",
            "type": "function",
            "function": {
              "name": "lookup_order",
              "arguments": "{\"order_id\":\"ORD-456\"}"
            }
          }
        ]
      },
      "finish_reason": "tool_calls"
    }
  ],
  "usage": { "prompt_tokens": 40, "completion_tokens": 30, "total_tokens": 70 },
  "_meta": {
    "internal_tool_calls": 0,
    "tools_used": []
  }
}
```

The `_meta` field exposes which built-in tools were used internally (e.g., the model searched the web before deciding to call your custom tool).

---

## Streaming (SSE)

Set `"stream": true` to receive Server-Sent Events. The stream uses the same `chat.completion.chunk` format as OpenAI.

### Text Chunks

Tokens stream in with variable timing for a natural feel:

```
data: {"id":"chatcmpl-x","object":"chat.completion.chunk","created":1709900000,"model":"a0-default","choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":null}]}

data: {"id":"chatcmpl-x","object":"chat.completion.chunk","created":1709900000,"model":"a0-default","choices":[{"index":0,"delta":{"content":"Here's"},"finish_reason":null}]}

data: {"id":"chatcmpl-x","object":"chat.completion.chunk","created":1709900000,"model":"a0-default","choices":[{"index":0,"delta":{"content":" what"},"finish_reason":null}]}

data: {"id":"chatcmpl-x","object":"chat.completion.chunk","created":1709900000,"model":"a0-default","choices":[{"index":0,"delta":{"content":" I found:"},"finish_reason":null}]}
```

### Status Events (Built-in Tools)

When the model uses a built-in tool during streaming, status events are emitted so your UI can show indicators like "Searching the web..." These are a custom extension — ignore them if you don't need them.

```
data: {"id":"chatcmpl-x","object":"chat.completion.chunk","created":1709900000,"model":"a0-default","choices":[{"index":0,"delta":{"custom_status":{"type":"tool_start","name":"web_search","arguments":{"query":"latest news"}}},"finish_reason":null}]}

data: {"id":"chatcmpl-x","object":"chat.completion.chunk","created":1709900000,"model":"a0-default","choices":[{"index":0,"delta":{"custom_status":{"type":"tool_done","name":"web_search"}},"finish_reason":null}]}
```

**Status event fields:**

| Field | Values | Description |
|-------|--------|-------------|
| `type` | `"tool_start"` / `"tool_done"` | Marks the beginning/end of a built-in tool execution |
| `name` | `string` | The tool name (`web_search`, `web_extract`, `image_generation`) |
| `arguments` | `object` (tool_start only) | The arguments passed to the tool |

### Custom Tool Call Deltas (Streaming)

When the model calls a custom tool during streaming, tool call deltas are streamed in OpenAI format:

```
data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_abc","type":"function","function":{"name":"lookup_order","arguments":""}}]},"finish_reason":null}]}

data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\"order"}}]},"finish_reason":null}]}

data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"_id\":\"ORD-456\"}"}}]},"finish_reason":null}]}

data: {"choices":[{"delta":{},"finish_reason":"tool_calls"}]}

data: [DONE]
```

Reassemble the `arguments` string by concatenating all fragments for each tool call index.

### Stream Termination

| `finish_reason` | Meaning |
|-----------------|---------|
| `"stop"` | Model finished generating. Stream is complete. |
| `"tool_calls"` | Model wants you to execute custom tools. Execute them and make a new request with results. |

---

## Custom Tool Calling Loop

When you provide custom `tools`, the model may request you to execute them. Here's the full conversation loop:

### Step 1: Initial Request

```ts
const response = await fetch("/api/chat/completions", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "What's the status of order ORD-456?" }
    ],
    tools: [{
      type: "function",
      function: {
        name: "lookup_order",
        description: "Look up an order by ID",
        parameters: {
          type: "object",
          properties: {
            order_id: { type: "string", description: "The order ID" }
          },
          required: ["order_id"]
        }
      }
    }]
  })
});
const data = await response.json();
```

### Step 2: Check for Tool Calls

```ts
const choice = data.choices[0];

if (choice.finish_reason === "tool_calls") {
  // Model wants us to execute custom tools
  const assistantMsg = choice.message;
  const toolResults = [];

  for (const toolCall of assistantMsg.tool_calls) {
    const args = JSON.parse(toolCall.function.arguments);

    // Execute your tool
    let result;
    if (toolCall.function.name === "lookup_order") {
      result = await myOrderDatabase.lookup(args.order_id);
    }

    toolResults.push({
      role: "tool",
      tool_call_id: toolCall.id,
      content: JSON.stringify(result)
    });
  }

  // Step 3: Send results back
  const finalResponse = await fetch("/api/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "What's the status of order ORD-456?" },
        assistantMsg,        // The assistant message with tool_calls
        ...toolResults       // Your tool results
      ],
      tools: [/* same tools as before */]
    })
  });

  const finalData = await finalResponse.json();
  console.log(finalData.choices[0].message.content);
  // "Order ORD-456 is currently being shipped and should arrive by Thursday."
}
```

### Full Streaming Loop with Custom Tools

```ts
async function chat(messages, tools) {
  while (true) {
    const res = await fetch("/api/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, tools, stream: true })
    });

    const { content, toolCalls, finishReason } = await consumeStream(res.body);

    if (finishReason === "stop") {
      // Done — display content to user
      return content;
    }

    if (finishReason === "tool_calls") {
      // Add the assistant message to history
      messages.push({
        role: "assistant",
        content: content || null,
        tool_calls: toolCalls
      });

      // Execute each tool and add results
      for (const tc of toolCalls) {
        const args = JSON.parse(tc.function.arguments);
        const result = await executeMyTool(tc.function.name, args);
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result)
        });
      }

      // Loop continues — will make another streaming request
    }
  }
}
```

### Stream Consumer Helper

```ts
async function consumeStream(body) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let content = "";
  let toolCalls = [];      // Accumulated tool calls
  let finishReason = null;
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();  // Keep incomplete line in buffer

    for (const line of lines) {
      if (!line.startsWith("data: ") || line === "data: [DONE]") continue;

      const chunk = JSON.parse(line.slice(6));
      const delta = chunk.choices[0].delta;
      const reason = chunk.choices[0].finish_reason;

      if (reason) finishReason = reason;

      // Text content
      if (delta.content) {
        content += delta.content;
        renderToken(delta.content);  // Update UI
      }

      // Built-in tool status (optional UI indicator)
      if (delta.custom_status) {
        if (delta.custom_status.type === "tool_start") {
          showSpinner(`Using ${delta.custom_status.name}...`);
        } else if (delta.custom_status.type === "tool_done") {
          hideSpinner();
        }
      }

      // Custom tool call deltas
      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (!toolCalls[tc.index]) {
            toolCalls[tc.index] = {
              id: tc.id,
              type: tc.type,
              function: { name: tc.function?.name || "", arguments: "" }
            };
          }
          if (tc.function?.name) toolCalls[tc.index].function.name = tc.function.name;
          if (tc.function?.arguments) toolCalls[tc.index].function.arguments += tc.function.arguments;
        }
      }
    }
  }

  return { content, toolCalls: toolCalls.filter(Boolean), finishReason };
}
```

---

## Multi-step Agent Mode

Enable `multistep: true` to let the model use built-in tools across multiple turns automatically. The server handles the loop internally.

```json
{
  "messages": [{ "role": "user", "content": "Research the latest AI news and summarize" }],
  "multistep": true,
  "max_steps": 5,
  "stream": true
}
```

During streaming, you'll see interleaved text and status events as the model searches, reads pages, and synthesizes:

```
text tokens...
  → tool_start (web_search)
  → tool_done  (web_search)
text tokens...
  → tool_start (web_extract)
  → tool_done  (web_extract)
text tokens (final answer)...
  → finish_reason: "stop"
```

Without streaming, the server runs all steps internally and returns the final response.

---

## Error Responses

```json
{
  "error": {
    "message": "messages is required and must be a non-empty array",
    "type": "invalid_request_error"
  }
}
```

| Status | Type | When |
|--------|------|------|
| 400 | `invalid_request_error` | Missing or invalid `messages` |
| 405 | `invalid_request_error` | Non-POST method |
| 500 | `server_error` | Internal/upstream failure |
