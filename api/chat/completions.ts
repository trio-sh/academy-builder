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

// ─── Tool Classification ─────────────────────────────────────────────────────

const BUILTIN_TOOL_NAMES = new Set(["web_search", "web_extract", "image_generation"]);

function isBuiltinTool(name: string): boolean {
  return BUILTIN_TOOL_NAMES.has(name);
}

function buildToolSystemPrompt(userTools?: any[]): string {
  let prompt = `You have access to tools. When you need to use a tool, respond with a JSON tool call block.

Built-in tools (executed automatically):
1. **web_search** - Search the web. Params: { "query": "search terms" }
2. **web_extract** - Extract content from a URL. Params: { "url": "https://..." }
3. **image_generation** - Generate an image. Params: { "prompt": "description", "aspect": "1:1", "seed": 123 }`;

  if (userTools && userTools.length > 0) {
    prompt += `\n\nCustom tools (provided by the caller):`;
    userTools.forEach((tool, i) => {
      const fn = tool.function || tool;
      const params = fn.parameters
        ? ` Params: ${JSON.stringify(fn.parameters.properties ? Object.fromEntries(Object.entries(fn.parameters.properties).map(([k, v]: [string, any]) => [k, v.type || "any"])) : {})}`
        : "";
      prompt += `\n${i + 4}. **${fn.name}** - ${fn.description || "No description"}.${params}`;
    });
  }

  prompt += `\n\nTo call a tool, include EXACTLY this format in your response (you may include multiple):
<tool_call>{"name": "tool_name", "arguments": {"param": "value"}}</tool_call>

After receiving tool results, synthesize them into a helpful response. Do NOT include tool_call blocks in your final answer to the user.`;

  return prompt;
}

function generateToolCallId(): string {
  return "call_" + Math.random().toString(36).substring(2, 14);
}

// ─── Multi-step Agent Loop ───────────────────────────────────────────────────

interface AgentResult {
  content: string | null;
  tool_calls_made: { name: string; arguments: any; result: string }[];
  // When custom tools are requested, we return them as pending OpenAI tool_calls
  pending_tool_calls: ToolCall[] | null;
  finish_reason: "stop" | "tool_calls";
}

async function runAgentLoop(
  messages: OpenAIMessage[],
  temperature: number,
  maxTokens: number,
  maxSteps: number,
  userTools?: any[]
): Promise<AgentResult> {
  const customToolNames = new Set(
    (userTools || []).map((t: any) => (t.function || t).name)
  );

  // Convert OpenAI messages to A0 format
  const a0Messages: A0Message[] = [];
  const toolSystemPrompt = buildToolSystemPrompt(userTools);

  // Inject tool system prompt at the start
  const hasSystemMsg = messages.length > 0 && messages[0].role === "system";
  if (hasSystemMsg) {
    a0Messages.push({
      role: "system",
      content: messages[0].content + "\n\n" + toolSystemPrompt,
    });
  } else {
    a0Messages.push({ role: "system", content: toolSystemPrompt });
  }

  // Add remaining messages
  const startIdx = hasSystemMsg ? 1 : 0;
  for (let i = startIdx; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === "tool") {
      // Tool results from external callers - embed as context
      a0Messages.push({
        role: "user",
        content: `[Tool Result for ${msg.tool_call_id || msg.name}]: ${msg.content}`,
      });
    } else if (msg.role === "assistant" && msg.tool_calls) {
      // Assistant message that had tool_calls - reconstruct context
      const toolInfo = msg.tool_calls
        .map((tc) => `[Called ${tc.function.name}(${tc.function.arguments})]`)
        .join("\n");
      a0Messages.push({
        role: "assistant",
        content: (msg.content || "") + "\n" + toolInfo,
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
      finalContent = completion;
      break;
    }

    // Separate built-in vs custom tool calls
    const builtinCalls = toolCalls.filter((tc) => isBuiltinTool(tc.name));
    const customCalls = toolCalls.filter((tc) => customToolNames.has(tc.name));
    const unknownCalls = toolCalls.filter(
      (tc) => !isBuiltinTool(tc.name) && !customToolNames.has(tc.name)
    );

    // If there are custom tool calls, we must return them to the frontend
    if (customCalls.length > 0) {
      // First, execute any built-in calls that came in the same turn
      const builtinResults = await Promise.all(
        builtinCalls.map(async (tc) => {
          const result = await executeTool(tc.name, tc.arguments);
          allToolCalls.push({ name: tc.name, arguments: tc.arguments, result });
          return { name: tc.name, result };
        })
      );

      // Format pending custom tool calls as OpenAI tool_calls
      const pendingToolCalls: ToolCall[] = customCalls.map((tc) => ({
        id: generateToolCallId(),
        type: "function" as const,
        function: {
          name: tc.name,
          arguments: JSON.stringify(tc.arguments),
        },
      }));

      // Build the assistant content (stripped of tool_call blocks)
      const cleanedContent = stripToolCalls(completion) || null;

      // If we also resolved built-in tools, append their results as context
      let assistantContent = cleanedContent;
      if (builtinResults.length > 0) {
        const builtinContext = builtinResults
          .map((r) => `[${r.name} result]: ${r.result.slice(0, 3000)}`)
          .join("\n");
        assistantContent = (assistantContent || "") + "\n\n" + builtinContext;
      }

      return {
        content: assistantContent,
        tool_calls_made: allToolCalls,
        pending_tool_calls: pendingToolCalls,
        finish_reason: "tool_calls",
      };
    }

    // All tool calls are built-in — execute them server-side
    const results = await Promise.all(
      [...builtinCalls, ...unknownCalls].map(async (tc) => {
        const result = await executeTool(tc.name, tc.arguments);
        allToolCalls.push({ name: tc.name, arguments: tc.arguments, result });
        return { name: tc.name, result };
      })
    );

    // Add assistant message and tool results to conversation
    const cleanedAssistant = stripToolCalls(completion);
    if (cleanedAssistant) {
      a0Messages.push({ role: "assistant", content: cleanedAssistant });
    } else {
      a0Messages.push({
        role: "assistant",
        content: `[Calling tools: ${toolCalls.map((t) => t.name).join(", ")}]`,
      });
    }

    const resultsText = results
      .map((r) => `[Tool Result - ${r.name}]:\n${r.result.slice(0, 6000)}`)
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
    pending_tool_calls: null,
    finish_reason: "stop",
  };
}

// ─── OpenAI-Compatible Response Formatters ───────────────────────────────────

function generateId(): string {
  return "chatcmpl-" + Math.random().toString(36).substring(2, 15);
}

function formatNonStreamingResponse(
  result: AgentResult,
  model: string
) {
  const content = result.content || "";
  const promptTokensEstimate = Math.ceil(content.length / 4);
  const completionTokensEstimate = Math.ceil(content.length / 4);

  // Build the message object
  const message: any = {
    role: "assistant",
    content: result.content,
  };

  // If there are pending custom tool calls, attach them (OpenAI format)
  if (result.pending_tool_calls && result.pending_tool_calls.length > 0) {
    message.tool_calls = result.pending_tool_calls;
  }

  return {
    id: generateId(),
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message,
        finish_reason: result.finish_reason === "tool_calls" ? "tool_calls" : "stop",
      },
    ],
    usage: {
      prompt_tokens: promptTokensEstimate,
      completion_tokens: completionTokensEstimate,
      total_tokens: promptTokensEstimate + completionTokensEstimate,
    },
    // Custom extension: expose internal tool usage metadata
    _meta: {
      internal_tool_calls: result.tool_calls_made.length,
      tools_used: result.tool_calls_made.map((tc) => ({
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

    // If custom tool calls are pending, always return non-streaming
    // so the caller can process tool_calls and send results back
    if (result.pending_tool_calls && result.pending_tool_calls.length > 0) {
      return res.status(200).json(formatNonStreamingResponse(result, model));
    }

    if (stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      return streamResponse(res, result.content || "", model);
    }

    return res.status(200).json(formatNonStreamingResponse(result, model));
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
