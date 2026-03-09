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

// ─── Logger ─────────────────────────────────────────────────────────────────

let _reqCounter = 0;

function createLogger(prefix?: string) {
  const reqId = `req-${++_reqCounter}-${Date.now().toString(36)}`;
  const tag = prefix ? `[${reqId}][${prefix}]` : `[${reqId}]`;
  return {
    id: reqId,
    info: (...args: any[]) => console.log(tag, ...args),
    warn: (...args: any[]) => console.warn(tag, "⚠", ...args),
    error: (...args: any[]) => console.error(tag, "✗", ...args),
    debug: (...args: any[]) => console.log(tag, "·", ...args),
  };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const A0_LLM_URL = "https://api.a0.dev/ai/llm";
const A0_IMAGE_URL = "https://api.a0.dev/assets/image";
const JINA_READER_URL = "https://r.jina.ai";
const DUCKDUCKGO_HTML = "https://html.duckduckgo.com/html";

const DEFAULT_MAX_TOKENS = 16384;
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
  args: Record<string, any>,
  log?: ReturnType<typeof createLogger>
): Promise<string> {
  log?.info(`⚙ Executing tool: ${name}(${JSON.stringify(args)})`);
  const start = Date.now();
  let result: string;
  switch (name) {
    case "web_search":
      result = await executeWebSearch(args.query);
      break;
    case "web_extract":
      result = await executeWebExtract(args.url);
      break;
    case "image_generation":
      result = executeImageGeneration(args.prompt, args.aspect, args.seed);
      break;
    default:
      result = `Unknown tool: ${name}`;
  }
  log?.info(`⚙ Tool ${name} done (${Date.now() - start}ms): ${result.length}ch, preview: ${JSON.stringify(result.slice(0, 150))}`);
  return result;
}

// ─── A0 LLM Caller ──────────────────────────────────────────────────────────

interface A0Message {
  role: string;
  content: string;
}

async function callA0(
  messages: A0Message[],
  temperature: number,
  maxTokens: number,
  log?: ReturnType<typeof createLogger>
): Promise<string> {
  const msgSummary = messages.map(m => `${m.role}(${m.content.length}ch)`).join(", ");
  log?.info(`→ A0 LLM call: ${messages.length} msgs [${msgSummary}], temp=${temperature}, max_tokens=${maxTokens}`);

  const MAX_RETRIES = 2;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const start = Date.now();

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
      const errText = await res.text();
      log?.error(`← A0 error ${res.status} (${Date.now() - start}ms): ${errText.slice(0, 500)}`);
      throw new Error(`A0 API error: ${res.status} ${errText}`);
    }
    const data: A0Response = await res.json();
    const completion = data.completion;
    log?.info(`← A0 response (${Date.now() - start}ms, attempt ${attempt + 1}): ${completion.length}ch, preview: ${JSON.stringify(completion.slice(0, 200))}`);

    if (completion.length > 0) {
      return completion;
    }

    // Empty completion — retry with lower max_tokens and nudge
    if (attempt < MAX_RETRIES) {
      log?.warn(`Empty completion from A0 (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying with reduced max_tokens and clarification`);
      // Add a nudge to the last user message to help the LLM respond
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === "user" && !lastMsg.content.includes("[Please respond")) {
        messages = [
          ...messages.slice(0, -1),
          {
            role: "user",
            content: lastMsg.content + "\n\n[Please respond with your full answer. Do not leave your response empty.]",
          },
        ];
      }
      // Reduce max_tokens to avoid timeout
      maxTokens = Math.min(maxTokens, 8192);
    }
  }

  // All retries exhausted — return empty (will show as empty response)
  log?.error(`A0 returned empty completion after ${MAX_RETRIES + 1} attempts`);
  return "";
}

// ─── Tool Call Parser ────────────────────────────────────────────────────────

interface ParsedToolCall {
  name: string;
  arguments: Record<string, any>;
}

function parseToolCalls(text: string): ParsedToolCall[] {
  const calls: ParsedToolCall[] = [];
  // Match both closed </tool_call> tags and unclosed <tool_call> at end of string
  const regex = /<tool_call>([\s\S]*?)(?:<\/tool_call>|$)/g;
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
  // Strip both closed and unclosed tool_call blocks
  return text.replace(/<tool_call>[\s\S]*?(?:<\/tool_call>|$)/g, "").trim();
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

  prompt += `\n\nTo call a tool, include EXACTLY this format in your response (you MUST include both the opening AND closing tags):
<tool_call>{"name": "tool_name", "arguments": {"param": "value"}}</tool_call>

IMPORTANT: Always close with </tool_call>. Never omit the closing tag.

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
  userTools?: any[],
  log?: ReturnType<typeof createLogger>
): Promise<AgentResult> {
  log?.info(`Agent loop start: maxSteps=${maxSteps}, userTools=[${(userTools || []).map((t: any) => (t.function || t).name).join(",")}]`);
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
    log?.info(`── Step ${step}/${maxSteps} ──`);

    const completion = await callA0(a0Messages, temperature, maxTokens, log);
    const toolCalls = parseToolCalls(completion);
    log?.info(`Parsed ${toolCalls.length} tool calls: [${toolCalls.map(t => t.name).join(", ")}]`);

    if (toolCalls.length === 0) {
      log?.info("No tool calls — final response");
      finalContent = completion;
      if (!finalContent && step === 1) {
        log?.warn("Empty completion on first step — the model may have timed out or failed to generate a response");
        finalContent = "I wasn't able to generate a response for that request. This can happen with very large code generation prompts. Try breaking it into smaller pieces, e.g.:\n\n- \"Create the HTML structure for a dark SaaS landing page\"\n- \"Add Tailwind CSS animations to this page\"\n- \"Write the hero section with a gradient background\"";
      }
      break;
    }

    // Separate built-in vs custom tool calls
    const builtinCalls = toolCalls.filter((tc) => isBuiltinTool(tc.name));
    const customCalls = toolCalls.filter((tc) => customToolNames.has(tc.name));
    const unknownCalls = toolCalls.filter(
      (tc) => !isBuiltinTool(tc.name) && !customToolNames.has(tc.name)
    );
    log?.info(`Builtin: ${builtinCalls.length}, Custom: ${customCalls.length}, Unknown: ${unknownCalls.length}`);

    // If there are custom tool calls, we must return them to the frontend
    if (customCalls.length > 0) {
      log?.info("Custom tool calls detected — returning to frontend");
      // First, execute any built-in calls that came in the same turn
      const builtinResults = await Promise.all(
        builtinCalls.map(async (tc) => {
          const result = await executeTool(tc.name, tc.arguments, log);
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
      log?.info(`Returning ${pendingToolCalls.length} pending tool calls: [${pendingToolCalls.map(t => t.function.name).join(", ")}]`);

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
        const result = await executeTool(tc.name, tc.arguments, log);
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
    log?.debug(`Fed ${results.length} tool results back into conversation (${resultsText.length}ch total)`);

    // If this was the last allowed step, force a final response
    if (step >= maxSteps) {
      log?.warn("Max steps reached — forcing final response");
      a0Messages.push({
        role: "user",
        content:
          "[System: You have reached the maximum number of tool steps. Please provide your final response now based on all the information gathered.]",
      });
      finalContent = await callA0(a0Messages, temperature, maxTokens, log);
      finalContent = stripToolCalls(finalContent);
      break;
    }
  }

  log?.info(`Agent loop done: ${allToolCalls.length} total tool calls, content=${finalContent.length}ch`);
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

// ─── SSE Helpers ─────────────────────────────────────────────────────────────

function sseChunk(id: string, model: string, delta: any, finishReason: string | null = null): string {
  return `data: ${JSON.stringify({
    id,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, delta, finish_reason: finishReason }],
  })}\n\n`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Simulate token-by-token streaming from a complete string.
 * Splits on word boundaries and punctuation, adds micro-delays.
 */
async function streamTextTokens(
  res: VercelResponse,
  id: string,
  model: string,
  text: string
) {
  // Tokenize: split into word-ish chunks that feel like real tokens
  // Match words, punctuation, whitespace runs, or individual chars
  const tokens = text.match(/\s+|[.,!?;:—–\-()[\]{}""'']+|\S+/g) || [text];

  for (const token of tokens) {
    res.write(sseChunk(id, model, { content: token }));

    // Variable delay based on token type for natural feel
    if (/^[.!?]/.test(token)) {
      // Sentence-end punctuation: longer pause
      await sleep(40 + Math.random() * 30);
    } else if (/^[,;:—–]/.test(token)) {
      // Mid-sentence punctuation: medium pause
      await sleep(20 + Math.random() * 20);
    } else if (/^\n/.test(token)) {
      // Newlines: brief pause
      await sleep(25 + Math.random() * 15);
    } else if (token.length > 8) {
      // Long words: slightly slower
      await sleep(18 + Math.random() * 12);
    } else {
      // Regular tokens: fast
      await sleep(8 + Math.random() * 14);
    }
  }
}

/**
 * Stream custom tool_calls in OpenAI delta format.
 * Fragments the arguments string to simulate incremental generation.
 */
function streamToolCallDeltas(
  res: VercelResponse,
  id: string,
  model: string,
  toolCalls: ParsedToolCall[],
  customToolNames: Set<string>
): ToolCall[] {
  const pending: ToolCall[] = [];

  toolCalls
    .filter((tc) => customToolNames.has(tc.name))
    .forEach((tc, index) => {
      const callId = generateToolCallId();
      const argsStr = JSON.stringify(tc.arguments);

      // First chunk: id, type, function name, start of arguments
      res.write(sseChunk(id, model, {
        tool_calls: [{
          index,
          id: callId,
          type: "function",
          function: { name: tc.name, arguments: "" },
        }],
      }));

      // Stream arguments in small fragments (4-12 chars)
      const fragSize = 8;
      for (let i = 0; i < argsStr.length; i += fragSize) {
        const frag = argsStr.slice(i, i + fragSize);
        res.write(sseChunk(id, model, {
          tool_calls: [{ index, function: { arguments: frag } }],
        }));
      }

      pending.push({
        id: callId,
        type: "function",
        function: { name: tc.name, arguments: argsStr },
      });
    });

  return pending;
}

/**
 * Emit a custom_status event for built-in tool execution visibility.
 */
function sseToolStatus(
  res: VercelResponse,
  id: string,
  model: string,
  type: "tool_start" | "tool_done",
  name: string,
  args?: Record<string, any>
) {
  const status: any = { type, name };
  if (args) status.arguments = args;
  res.write(sseChunk(id, model, { custom_status: status }));
}

/**
 * Parse a completion into text segments and tool call segments.
 * Returns them in order so we can stream text, then handle tool calls.
 */
function splitCompletionSegments(text: string): Array<
  { type: "text"; content: string } | { type: "tool_calls"; calls: ParsedToolCall[] }
> {
  const segments: Array<
    { type: "text"; content: string } | { type: "tool_calls"; calls: ParsedToolCall[] }
  > = [];

  // Find all tool_call blocks (closed or unclosed at end of string)
  const regex = /<tool_call>([\s\S]*?)(?:<\/tool_call>|$)/g;
  let lastIndex = 0;
  let match;
  const calls: ParsedToolCall[] = [];

  while ((match = regex.exec(text)) !== null) {
    // Text before this tool_call
    const before = text.slice(lastIndex, match.index).trim();
    if (before) {
      segments.push({ type: "text", content: before });
    }

    // Parse the tool call
    try {
      const parsed = JSON.parse(match[1].trim());
      if (parsed.name && parsed.arguments) {
        calls.push(parsed);
      }
    } catch {
      // skip malformed
    }

    lastIndex = match.index + match[0].length;
  }

  // Collect all tool calls into one segment
  if (calls.length > 0) {
    segments.push({ type: "tool_calls", calls });
  }

  // Text after all tool_calls
  const after = text.slice(lastIndex).trim();
  if (after) {
    segments.push({ type: "text", content: after });
  }

  return segments;
}

// ─── Streaming Agent Loop ────────────────────────────────────────────────────

async function streamAgentLoop(
  res: VercelResponse,
  messages: OpenAIMessage[],
  temperature: number,
  maxTokens: number,
  maxSteps: number,
  model: string,
  userTools?: any[],
  log?: ReturnType<typeof createLogger>
) {
  const id = generateId();
  log?.info(`Stream agent loop start: id=${id}, maxSteps=${maxSteps}, userTools=[${(userTools || []).map((t: any) => (t.function || t).name).join(",")}]`);
  const customToolNames = new Set(
    (userTools || []).map((t: any) => (t.function || t).name)
  );

  // Convert OpenAI messages to A0 format
  const a0Messages: A0Message[] = [];
  const toolSystemPrompt = buildToolSystemPrompt(userTools);

  const hasSystemMsg = messages.length > 0 && messages[0].role === "system";
  if (hasSystemMsg) {
    a0Messages.push({
      role: "system",
      content: messages[0].content + "\n\n" + toolSystemPrompt,
    });
  } else {
    a0Messages.push({ role: "system", content: toolSystemPrompt });
  }

  const startIdx = hasSystemMsg ? 1 : 0;
  for (let i = startIdx; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === "tool") {
      a0Messages.push({
        role: "user",
        content: `[Tool Result for ${msg.tool_call_id || msg.name}]: ${msg.content}`,
      });
    } else if (msg.role === "assistant" && msg.tool_calls) {
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

  // Send initial role chunk
  res.write(sseChunk(id, model, { role: "assistant", content: "" }));

  let step = 0;

  while (step < maxSteps) {
    step++;
    log?.info(`── Stream step ${step}/${maxSteps} ──`);

    const completion = await callA0(a0Messages, temperature, maxTokens, log);
    const segments = splitCompletionSegments(completion);
    log?.debug(`Segments: ${segments.map(s => s.type === "text" ? `text(${s.content.length}ch)` : `tool_calls(${s.calls.length})`).join(", ")}`);

    // Check if there are any tool calls at all
    const toolSegment = segments.find((s) => s.type === "tool_calls") as
      | { type: "tool_calls"; calls: ParsedToolCall[] }
      | undefined;

    if (!toolSegment) {
      // Pure text response — stream it and finish
      let textToStream = completion;
      if (!textToStream && step === 1) {
        log?.warn("Empty completion on first stream step — returning fallback message");
        textToStream = "I wasn't able to generate a response for that request. This can happen with very large code generation prompts. Try breaking it into smaller pieces, e.g.:\n\n- \"Create the HTML structure for a dark SaaS landing page\"\n- \"Add Tailwind CSS animations to this page\"\n- \"Write the hero section with a gradient background\"";
      }
      log?.info(`No tool calls — streaming final text (${textToStream.length}ch)`);
      await streamTextTokens(res, id, model, textToStream);
      res.write(sseChunk(id, model, {}, "stop"));
      res.write("data: [DONE]\n\n");
      res.end();
      log?.info("Stream ended (stop)");
      return;
    }

    // There are tool calls — stream any leading text first
    for (const seg of segments) {
      if (seg.type === "text") {
        log?.debug(`Streaming leading text (${seg.content.length}ch)`);
        await streamTextTokens(res, id, model, seg.content);
      }
      if (seg.type === "tool_calls") break; // handle tool calls below
    }

    const allCalls = toolSegment.calls;
    const builtinCalls = allCalls.filter((tc) => isBuiltinTool(tc.name));
    const customCalls = allCalls.filter((tc) => customToolNames.has(tc.name));
    const unknownCalls = allCalls.filter(
      (tc) => !isBuiltinTool(tc.name) && !customToolNames.has(tc.name)
    );
    log?.info(`Tool calls: builtin=[${builtinCalls.map(t => t.name).join(",")}], custom=[${customCalls.map(t => t.name).join(",")}], unknown=[${unknownCalls.map(t => t.name).join(",")}]`);

    // ── Custom tool calls → stream as OpenAI tool_calls, then STOP ──
    if (customCalls.length > 0) {
      log?.info("Custom tool calls — executing co-occurring builtins then returning to client");
      // Execute any co-occurring built-in calls silently first
      if (builtinCalls.length > 0) {
        for (const tc of builtinCalls) {
          sseToolStatus(res, id, model, "tool_start", tc.name, tc.arguments);
          await executeTool(tc.name, tc.arguments, log);
          sseToolStatus(res, id, model, "tool_done", tc.name);
        }
      }

      // Stream custom tool call deltas
      streamToolCallDeltas(res, id, model, allCalls, customToolNames);

      // Finish with tool_calls reason
      res.write(sseChunk(id, model, {}, "tool_calls"));
      res.write("data: [DONE]\n\n");
      res.end();
      log?.info("Stream ended (tool_calls)");
      return;
    }

    // ── Only built-in tool calls → execute server-side, show status, continue loop ──
    const results: { name: string; result: string }[] = [];

    for (const tc of [...builtinCalls, ...unknownCalls]) {
      sseToolStatus(res, id, model, "tool_start", tc.name, tc.arguments);
      const result = await executeTool(tc.name, tc.arguments, log);
      sseToolStatus(res, id, model, "tool_done", tc.name);
      results.push({ name: tc.name, result });
    }

    // Feed results back into conversation for next LLM turn
    const cleanedAssistant = stripToolCalls(completion);
    a0Messages.push({
      role: "assistant",
      content: cleanedAssistant || `[Calling tools: ${allCalls.map((t) => t.name).join(", ")}]`,
    });

    const resultsText = results
      .map((r) => `[Tool Result - ${r.name}]:\n${r.result.slice(0, 6000)}`)
      .join("\n\n");
    a0Messages.push({ role: "user", content: resultsText });
    log?.debug(`Fed ${results.length} tool results back (${resultsText.length}ch), continuing loop`);

    // If last step, force final response
    if (step >= maxSteps) {
      log?.warn("Max steps reached — forcing final response");
      a0Messages.push({
        role: "user",
        content:
          "[System: You have reached the maximum number of tool steps. Please provide your final response now based on all the information gathered.]",
      });
      const finalCompletion = await callA0(a0Messages, temperature, maxTokens, log);
      const finalText = stripToolCalls(finalCompletion);
      await streamTextTokens(res, id, model, finalText);
      res.write(sseChunk(id, model, {}, "stop"));
      res.write("data: [DONE]\n\n");
      res.end();
      log?.info("Stream ended (stop, max steps)");
      return;
    }

    // Otherwise, loop continues — next LLM turn will stream more text
  }

  // Fallback: end stream if loop exits without returning
  log?.warn("Stream loop exited without explicit return — fallback end");
  res.write(sseChunk(id, model, {}, "stop"));
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

  const log = createLogger("chat");

  try {
    const body: OpenAIRequest = req.body;
    const msgCount = body.messages?.length ?? 0;
    const lastUserMsg = body.messages?.filter(m => m.role === "user").pop()?.content?.slice(0, 200) || "";
    log.info(`Incoming request: ${msgCount} messages, stream=${body.stream}, multistep=${body.multistep}, max_tokens=${body.max_tokens}, tools=${body.tools?.length ?? 0}, max_steps=${body.max_steps}`);
    log.debug(`Last user message: ${JSON.stringify(lastUserMsg)}`);

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      log.warn("Bad request: empty messages");
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

    log.info(`Config: model=${model}, temp=${temperature}, maxTokens=${maxTokens}, stream=${stream}, maxSteps=${maxSteps}`);

    if (stream) {
      // Streaming: run the agent loop with live SSE output
      log.info("Starting streaming agent loop");
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      return streamAgentLoop(
        res,
        body.messages,
        temperature,
        maxTokens,
        maxSteps,
        model,
        body.tools,
        log
      );
    }

    // Non-streaming: run the agent loop and return complete response
    log.info("Starting non-streaming agent loop");
    const result = await runAgentLoop(
      body.messages,
      temperature,
      maxTokens,
      maxSteps,
      body.tools,
      log
    );

    log.info(`Done: finish_reason=${result.finish_reason}, content=${result.content?.length ?? 0}ch, tools_made=${result.tool_calls_made.length}, pending=${result.pending_tool_calls?.length ?? 0}`);
    return res.status(200).json(formatNonStreamingResponse(result, model));
  } catch (err: any) {
    log.error(`Unhandled error: ${err.message}`, err.stack?.slice(0, 500));
    return res.status(500).json({
      error: {
        message: err.message || "Internal server error",
        type: "server_error",
      },
    });
  }
}
