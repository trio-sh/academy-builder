# Messages API (Anthropic-Compatible)

Anthropic-compatible Messages endpoint powered by Kilo Gateway. Drop-in compatible with the [Anthropic Messages API](https://docs.anthropic.com/en/api/messages).

**Endpoint:** `POST /api/messages`

---

## Quick Start

### Basic Chat

```bash
curl -X POST /api/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-key" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "praxis-1",
    "max_tokens": 1024,
    "messages": [
      { "role": "user", "content": "Hello, how are you?" }
    ]
  }'
```

### Streaming

```bash
curl -X POST /api/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-key" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "praxis-1",
    "max_tokens": 1024,
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
| `x-api-key` | Optional | API key (accepted for compatibility) |
| `anthropic-version` | Optional | API version string (accepted for compatibility) |
| `Content-Type` | Required | Must be `application/json` |

---

## Request Body

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `model` | `string` | No | `"praxis-1"` | Model identifier |
| `messages` | `Message[]` | **Yes** | — | Conversation history |
| `max_tokens` | `integer` | **Yes** | — | Maximum tokens to generate |
| `system` | `string \| TextBlock[]` | No | — | System prompt |
| `temperature` | `number` | No | — | Sampling temperature (0-1) |
| `top_p` | `number` | No | — | Nucleus sampling |
| `top_k` | `integer` | No | — | Top-K sampling |
| `stop_sequences` | `string[]` | No | — | Stop sequences |
| `stream` | `boolean` | No | `false` | Enable SSE streaming |
| `metadata` | `object` | No | — | Request metadata |
| `tools` | `Tool[]` | No | — | Tool definitions |
| `tool_choice` | `ToolChoice` | No | — | Tool selection strategy |

### Message Format

```ts
interface Message {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}
```

Content blocks can be:

```ts
// Text
{ "type": "text", "text": "Hello" }

// Tool use (in assistant messages)
{ "type": "tool_use", "id": "toolu_xxx", "name": "search", "input": { "query": "test" } }

// Tool result (in user messages)
{ "type": "tool_result", "tool_use_id": "toolu_xxx", "content": "result text" }

// Image
{ "type": "image", "source": { "type": "base64", "media_type": "image/png", "data": "..." } }
```

### System Prompt

The system prompt is a top-level field, not a message:

```json
{
  "model": "praxis-1",
  "max_tokens": 1024,
  "system": "You are a helpful coding assistant.",
  "messages": [
    { "role": "user", "content": "Explain async/await" }
  ]
}
```

Or as an array of blocks:

```json
{
  "system": [
    { "type": "text", "text": "You are a helpful coding assistant." },
    { "type": "text", "text": "Always include code examples." }
  ]
}
```

### Tool Definition Format

```json
{
  "name": "lookup_order",
  "description": "Look up an order by its ID",
  "input_schema": {
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
```

### Tool Choice

```json
{ "type": "auto" }          // Model decides (default)
{ "type": "any" }           // Must use a tool
{ "type": "tool", "name": "lookup_order" }  // Must use specific tool
```

---

## Built-in Tools

These tools execute automatically on the server. You do not need to define them in `tools`.

| Tool | Description | Triggered By |
|------|-------------|-------------|
| `web_search` | Search the web via DuckDuckGo | Model decides to search |
| `web_extract` | Extract text content from a URL | Model decides to read a page |
| `image_generation` | Generate an image from a prompt | Model decides to create an image |

---

## Non-Streaming Response

### Standard Response (`stop_reason: "end_turn"`)

```json
{
  "id": "msg_abc123def456",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "Hello! I'm doing well. How can I help you?"
    }
  ],
  "model": "praxis-1",
  "stop_reason": "end_turn",
  "stop_sequence": null,
  "usage": {
    "input_tokens": 12,
    "output_tokens": 15
  }
}
```

### Tool Use Response (`stop_reason: "tool_use"`)

```json
{
  "id": "msg_abc123def456",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "Let me look that up for you."
    },
    {
      "type": "tool_use",
      "id": "toolu_abc123",
      "name": "lookup_order",
      "input": { "order_id": "ORD-456" }
    }
  ],
  "model": "praxis-1",
  "stop_reason": "tool_use",
  "stop_sequence": null,
  "usage": {
    "input_tokens": 40,
    "output_tokens": 30
  }
}
```

---

## Streaming (SSE)

Set `"stream": true` to receive Server-Sent Events. Each event has an `event:` type line and a `data:` JSON line.

### Event Types

| Event | Description |
|-------|-------------|
| `message_start` | Initial message object with metadata and input token count |
| `content_block_start` | Start of a new content block (text or tool_use) |
| `content_block_delta` | Incremental content update |
| `content_block_stop` | End of a content block |
| `message_delta` | Final metadata (stop_reason, output token count) |
| `message_stop` | End of message |
| `ping` | Keep-alive |

### Example Stream (Text)

```
event: message_start
data: {"type":"message_start","message":{"id":"msg_abc","type":"message","role":"assistant","content":[],"model":"praxis-1","stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":12,"output_tokens":0}}}

event: ping
data: {"type":"ping"}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"! How can I help?"}}

event: content_block_stop
data: {"type":"content_block_stop","index":0}

event: message_delta
data: {"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null},"usage":{"output_tokens":8}}

event: message_stop
data: {"type":"message_stop"}
```

### Example Stream (Tool Use)

```
event: content_block_start
data: {"type":"content_block_start","index":1,"content_block":{"type":"tool_use","id":"toolu_abc","name":"lookup_order","input":{}}}

event: content_block_delta
data: {"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":"{\"order_id\":\"ORD-456\"}"}}

event: content_block_stop
data: {"type":"content_block_stop","index":1}

event: message_delta
data: {"type":"message_delta","delta":{"stop_reason":"tool_use","stop_sequence":null},"usage":{"output_tokens":30}}

event: message_stop
data: {"type":"message_stop"}
```

---

## Custom Tool Calling Loop

### Step 1: Initial Request

```ts
const response = await fetch("/api/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "your-key",
    "anthropic-version": "2023-06-01",
  },
  body: JSON.stringify({
    model: "praxis-1",
    max_tokens: 1024,
    messages: [
      { role: "user", content: "What's the status of order ORD-456?" }
    ],
    tools: [{
      name: "lookup_order",
      description: "Look up an order by ID",
      input_schema: {
        type: "object",
        properties: {
          order_id: { type: "string", description: "The order ID" }
        },
        required: ["order_id"]
      }
    }]
  })
});
const data = await response.json();
```

### Step 2: Check for Tool Use

```ts
if (data.stop_reason === "tool_use") {
  const toolUseBlocks = data.content.filter(b => b.type === "tool_use");

  const toolResults = [];
  for (const block of toolUseBlocks) {
    // Execute your tool
    const result = await myOrderDatabase.lookup(block.input.order_id);

    toolResults.push({
      type: "tool_result",
      tool_use_id: block.id,
      content: JSON.stringify(result)
    });
  }

  // Step 3: Send results back
  const finalResponse = await fetch("/api/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": "your-key",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "praxis-1",
      max_tokens: 1024,
      messages: [
        { role: "user", content: "What's the status of order ORD-456?" },
        { role: "assistant", content: data.content },  // Include the full content array
        { role: "user", content: toolResults }          // Tool results as content blocks
      ],
      tools: [/* same tools */]
    })
  });

  const final = await finalResponse.json();
  console.log(final.content[0].text);
  // "Order ORD-456 is currently being shipped and should arrive by Thursday."
}
```

---

## Comparison with OpenAI Endpoint

| Feature | `/api/chat/completions` (OpenAI) | `/api/messages` (Anthropic) |
|---------|------|------|
| Format | OpenAI Chat Completions | Anthropic Messages |
| System prompt | First message with `role: "system"` | Top-level `system` field |
| Tool format | `{ type: "function", function: { name, parameters } }` | `{ name, input_schema }` |
| Tool results | `role: "tool"` messages | `tool_result` content blocks |
| Response | `choices[0].message.content` (string) | `content` (array of blocks) |
| Streaming | `data: {json}` chunks | `event: type` + `data: {json}` events |
| Stop reason | `"stop"`, `"tool_calls"`, `"length"` | `"end_turn"`, `"tool_use"`, `"max_tokens"` |
| Backend | A0 LLM + Kilo Gateway | Kilo Gateway |

---

## Error Responses

```json
{
  "type": "error",
  "error": {
    "type": "invalid_request_error",
    "message": "messages is required and must be a non-empty array"
  }
}
```

| Status | Type | When |
|--------|------|------|
| 400 | `invalid_request_error` | Missing or invalid required fields |
| 405 | `invalid_request_error` | Non-POST method |
| 500 | `api_error` | Internal/upstream failure |

---

## SDK Compatibility

This endpoint is compatible with the official Anthropic SDK:

```ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: "your-key",
  baseURL: "https://your-domain.com/api",
});

const message = await client.messages.create({
  model: "praxis-1",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Hello!" }],
});

console.log(message.content[0].text);
```

```python
import anthropic

client = anthropic.Anthropic(
    api_key="your-key",
    base_url="https://your-domain.com/api",
)

message = client.messages.create(
    model="praxis-1",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello!"}],
)

print(message.content[0].text)
```
