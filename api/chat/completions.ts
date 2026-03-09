import type { VercelRequest, VercelResponse } from "@vercel/node";

// ─── Types ───────────────────────────────────────────────────────────────────

interface OpenAIMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface OpenAIRequest {
  model?: string;
  messages: OpenAIMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
  tools?: any[];
  tool_choice?: any;
  // Custom extensions
  multistep?: boolean;
  max_steps?: number;
}

interface A0Response {
  completion: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const A0_LLM_URL = "https://api.a0.dev/ai/llm";
const A0_IMAGE_URL = "https://api.a0.dev/assets/image";
const JINA_READER_URL = "https://r.jina.ai";
const DUCKDUCKGO_HTML = "https://html.duckduckgo.com/html";

const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_STEPS = 1;
const MAX_STEPS_LIMIT = 20;

// Built-in tool definitions (OpenAI function-calling format)
const BUILTIN_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "web_search",
      description:
        "Search the web for real-time information. Returns top search results with snippets. Use when the user asks about current events, facts, or any information that may need to be looked up.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query to look up on the web.",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "web_extract",
      description:
        "Extract and read the main content from a webpage URL. Returns the page text content. Use when you need to read an article, documentation, or any web page in detail.",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "The full URL of the webpage to extract content from.",
          },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "image_generation",
      description:
        "Generate an image based on a text description. Returns the image URL. Use when the user asks you to create, generate, or produce an image, illustration, icon, or visual.",
      parameters: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description:
              "A detailed text description of the image to generate. Be descriptive about style, colors, composition, subject, mood, lighting, etc.",
          },
          aspect: {
            type: "string",
            description:
              'Aspect ratio for the image. Examples: "1:1" (square), "16:9" (widescreen), "4:3", "9:16" (portrait), "21:9" (ultrawide). Default: "1:1".',
            default: "1:1",
          },
          seed: {
            type: "number",
            description:
              "A numeric seed for reproducibility. Use the same seed + prompt to get the same image. If not provided, a random seed is used.",
          },
        },
        required: ["prompt"],
      },
    },
  },
];

// ─── Tool Executors ──────────────────────────────────────────────────────────

async function executeWebSearch(query: string): Promise<string> {
  try {
    const searchUrl = `${JINA_READER_URL}/${DUCKDUCKGO_HTML}?q=${encodeURIComponent(query)}`;
    const res = await fetch(searchUrl, {
      headers: {
        Accept: "text/plain",
        "X-Return-Format": "text",
      },
    });
    if (!res.ok) throw new Error(`Search failed: ${res.status}`);
    const text = await res.text();
    return text.slice(0, 8000);
  } catch (err: any) {
    return `Error performing web search: ${err.message}`;
  }
}

async function executeWebExtract(url: string): Promise<string> {
  try {
    const extractUrl = `${JINA_READER_URL}/${url}`;
    const res = await fetch(extractUrl, {
      headers: {
        Accept: "text/plain",
        "X-Return-Format": "text",
      },
    });
    if (!res.ok) throw new Error(`Extract failed: ${res.status}`);
    const text = await res.text();
    return text.slice(0, 12000);
  } catch (err: any) {
    return `Error extracting web content: ${err.message}`;
  }
}

function executeImageGeneration(
  prompt: string,
  aspect: string = "1:1",
  seed?: number
): string {
  const actualSeed = seed ?? Math.floor(Math.random() * 100000);
  const imageUrl = `${A0_IMAGE_URL}?text=${encodeURIComponent(prompt)}&aspect=${encodeURIComponent(aspect)}&seed=${actualSeed}`;
  return JSON.stringify({
    url: imageUrl,
    prompt,
    aspect,
    seed: actualSeed,
    markdown: `![${prompt}](${imageUrl})`,
  });
}

async function executeTool(
  name: string,
  args: Record<string, any>
): Promise<string> {
  switch (name) {
    case "web_search":
      return executeWebSearch(args.query);
    case "web_extract":
      return executeWebExtract(args.url);
    case "image_generation":
      return executeImageGeneration(args.prompt, args.aspect, args.seed);
    default:
      return `Unknown tool: ${name}`;
  }
}

// ─── A0 LLM Caller ──────────────────────────────────────────────────────────

const TOOL_SYSTEM_PROMPT = `You have access to the following built-in tools. When you need to use a tool, respond with a JSON tool call block.

Available tools:
1. **web_search** - Search the web. Params: { "query": "search terms" }
2. **web_extract** - Extract content from a URL. Params: { "url": "https://..." }
3. **image_generation** - Generate an image. Params: { "prompt": "description", "aspect": "1:1", "seed": 123 }

To call a tool, include EXACTLY this format in your response (you may include multiple):
<tool_call>{"name": "tool_name", "arguments": {"param": "value"}}</tool_call>

After receiving tool results, synthesize them into a helpful response. Do NOT include tool_call blocks in your final answer to the user.`;

interface A0Message {
  role: string;
  content: string;
}

async function callA0(
  messages: A0Message[],
  temperature: number,
  maxTokens: number
): Promise<string> {
  const res = await fetch(A0_LLM_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) {
    throw new Error(`A0 API error: ${res.status} ${await res.text()}`);
  }
  const data: A0Response = await res.json();
  return data.completion;
}

// ─── Tool Call Parser ────────────────────────────────────────────────────────

interface ParsedToolCall {
  name: string;
  arguments: Record<string, any>;
}

function parseToolCalls(text: string): ParsedToolCall[] {
  const calls: ParsedToolCall[] = [];
  const regex = /<tool_call>([\s\S]*?)<\/tool_call>/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (parsed.name && parsed.arguments) {
        calls.push(parsed);
      }
    } catch {
      // skip malformed tool calls
    }
  }
  return calls;
}

function stripToolCalls(text: string): string {
  return text.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, "").trim();
}

// ─── Multi-step Agent Loop ───────────────────────────────────────────────────

async function runAgentLoop(
  messages: OpenAIMessage[],
  temperature: number,
  maxTokens: number,
  maxSteps: number,
  userTools?: any[]
): Promise<{
  content: string;
  tool_calls_made: { name: string; arguments: any; result: string }[];
  finish_reason: string;
}> {
  // Convert OpenAI messages to A0 format
  const a0Messages: A0Message[] = [];

  // Inject tool system prompt at the start
  const hasSystemMsg = messages.length > 0 && messages[0].role === "system";
  if (hasSystemMsg) {
    a0Messages.push({
      role: "system",
      content: messages[0].content + "\n\n" + TOOL_SYSTEM_PROMPT,
    });
  } else {
    a0Messages.push({ role: "system", content: TOOL_SYSTEM_PROMPT });
  }

  // Add remaining messages
  const startIdx = hasSystemMsg ? 1 : 0;
  for (let i = startIdx; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === "tool") {
      // Tool results from external callers - embed as assistant context
      a0Messages.push({
        role: "user",
        content: `[Tool Result for ${msg.tool_call_id || msg.name}]: ${msg.content}`,
      });
    } else {
      a0Messages.push({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content || "",
      });
    }
  }

  const allToolCalls: { name: string; arguments: any; result: string }[] = [];
  let step = 0;
  let finalContent = "";

  while (step < maxSteps) {
    step++;

    const completion = await callA0(a0Messages, temperature, maxTokens);
    const toolCalls = parseToolCalls(completion);

    if (toolCalls.length === 0) {
      // No tool calls - this is the final response
      finalContent = completion;
      break;
    }

    // Execute all tool calls in parallel
    const results = await Promise.all(
      toolCalls.map(async (tc) => {
        const result = await executeTool(tc.name, tc.arguments);
        allToolCalls.push({
          name: tc.name,
          arguments: tc.arguments,
          result,
        });
        return { name: tc.name, result };
      })
    );

    // Add assistant message (with tool calls stripped) and tool results
    const cleanedAssistant = stripToolCalls(completion);
    if (cleanedAssistant) {
      a0Messages.push({ role: "assistant", content: cleanedAssistant });
    } else {
      a0Messages.push({
        role: "assistant",
        content: `[Calling tools: ${toolCalls.map((t) => t.name).join(", ")}]`,
      });
    }

    // Add tool results as a user message (since a0 doesn't support tool role)
    const resultsText = results
      .map(
        (r) =>
          `[Tool Result - ${r.name}]:\n${r.result.slice(0, 6000)}`
      )
      .join("\n\n");
    a0Messages.push({ role: "user", content: resultsText });

    // If this was the last allowed step, force a final response
    if (step >= maxSteps) {
      a0Messages.push({
        role: "user",
        content:
          "[System: You have reached the maximum number of tool steps. Please provide your final response now based on all the information gathered.]",
      });
      finalContent = await callA0(a0Messages, temperature, maxTokens);
      finalContent = stripToolCalls(finalContent);
      break;
    }
  }

  return {
    content: finalContent,
    tool_calls_made: allToolCalls,
    finish_reason: "stop",
  };
}

// ─── OpenAI-Compatible Response Formatters ───────────────────────────────────

function generateId(): string {
  return "chatcmpl-" + Math.random().toString(36).substring(2, 15);
}

function formatNonStreamingResponse(
  content: string,
  model: string,
  toolCallsMade: { name: string; arguments: any; result: string }[]
) {
  const promptTokensEstimate = Math.ceil(content.length / 4);
  const completionTokensEstimate = Math.ceil(content.length / 4);

  return {
    id: generateId(),
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content,
        },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: promptTokensEstimate,
      completion_tokens: completionTokensEstimate,
      total_tokens: promptTokensEstimate + completionTokensEstimate,
    },
    // Custom extension: expose internal tool usage metadata
    _meta: {
      internal_tool_calls: toolCallsMade.length,
      tools_used: toolCallsMade.map((tc) => ({
        name: tc.name,
        arguments: tc.arguments,
      })),
    },
  };
}

function formatSSEChunk(
  id: string,
  model: string,
  content: string,
  finishReason: string | null = null
): string {
  const chunk: any = {
    id,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        delta: content ? { content } : {},
        finish_reason: finishReason,
      },
    ],
  };
  return `data: ${JSON.stringify(chunk)}\n\n`;
}

// ─── Streaming Helpers ───────────────────────────────────────────────────────

async function streamResponse(
  res: VercelResponse,
  content: string,
  model: string
) {
  const id = generateId();

  // Initial chunk with role
  const roleChunk = {
    id,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, delta: { role: "assistant", content: "" }, finish_reason: null }],
  };
  res.write(`data: ${JSON.stringify(roleChunk)}\n\n`);

  // Stream content in chunks of ~20 chars for smooth output
  const chunkSize = 20;
  for (let i = 0; i < content.length; i += chunkSize) {
    const slice = content.slice(i, i + chunkSize);
    res.write(formatSSEChunk(id, model, slice));
  }

  // Final chunk
  res.write(formatSSEChunk(id, model, "", "stop"));
  res.write("data: [DONE]\n\n");
  res.end();
}

// ─── Main Handler ────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ error: { message: "Method not allowed", type: "invalid_request_error" } });
  }

  try {
    const body: OpenAIRequest = req.body;

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return res.status(400).json({
        error: {
          message: "messages is required and must be a non-empty array",
          type: "invalid_request_error",
        },
      });
    }

    const model = body.model || "a0-default";
    const temperature = body.temperature ?? DEFAULT_TEMPERATURE;
    const maxTokens = body.max_tokens ?? DEFAULT_MAX_TOKENS;
    const stream = body.stream ?? false;
    const multistep = body.multistep ?? false;
    const maxSteps = multistep
      ? Math.min(body.max_steps ?? 10, MAX_STEPS_LIMIT)
      : DEFAULT_MAX_STEPS;

    // Run the agent loop (single-step or multi-step)
    const result = await runAgentLoop(
      body.messages,
      temperature,
      maxTokens,
      maxSteps,
      body.tools
    );

    if (stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      return streamResponse(res, result.content, model);
    }

    return res
      .status(200)
      .json(formatNonStreamingResponse(result.content, model, result.tool_calls_made));
  } catch (err: any) {
    console.error("API Error:", err);
    return res.status(500).json({
      error: {
        message: err.message || "Internal server error",
        type: "server_error",
      },
    });
  }
}
