import type { VercelRequest, VercelResponse } from "@vercel/node";
import { buildPdfContent, buildKiloPrompt, type TemplateData } from "./pdf-templates";

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
  // Continuation support for Vercel timeout handling
  _continuation?: ContinuationState;
}

interface ContinuationState {
  a0Messages: A0Message[];
  step: number;
  id: string;
  model: string;
  contentSoFar: string;
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
const KILO_GATEWAY_URL = "https://api.kilo.ai/api/gateway/chat/completions";
const KILO_API_KEY = process.env.KILO_API_KEY || "";
const KILO_DEFAULT_MODEL = "kilo-auto/free";

const DEFAULT_MAX_TOKENS = 16384;
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_STEPS = 1;
const MAX_STEPS_LIMIT = 60;

// Vercel serverless function timeout handling
// Vercel Pro allows 5 minutes (300s). We start continuation at 4 min to leave
// buffer for serializing state + one final LLM call.
const VERCEL_TIMEOUT_MS = 300_000;
const CONTINUATION_THRESHOLD_MS = 240_000; // 4 minutes — trigger continuation

// ─── Prompt Enhancer ────────────────────────────────────────────────────────
// Detects vague code/HTML generation prompts and restructures them so the A0
// LLM produces actual output instead of timing out with an empty response.

const VAGUE_WEB_PATTERN =
  /\b(html|landing\s*page|website|web\s*page|webpage|portfolio|saas|dashboard|app\s*page)\b/i;
const CODE_HINT_PATTERN =
  /\b(tailwind|bootstrap|css|styled|dark\s*theme|animated|responsive|modern|beautiful|sleek|minimal)\b/i;

function enhanceUserPrompt(content: string, hasTaskAgent: boolean): string {
  // When task_agent is available, let the system prompt guide A0 to delegate
  // — don't rewrite the user prompt (it causes broken JSON in tool call args)
  if (hasTaskAgent) return content;

  // Only enhance short-ish, vague prompts that look like web/code generation requests
  if (content.length > 500) return content; // already detailed enough
  if (!VAGUE_WEB_PATTERN.test(content)) return content; // not a web generation request
  if (!CODE_HINT_PATTERN.test(content)) return content; // no styling hints

  // Extract what the user wants
  const wantsDark = /dark/i.test(content);
  const wantsTailwind = /tailwind/i.test(content);
  const wantsAnimated = /animat/i.test(content);
  const topic = content
    .replace(/\b(html|use|using|with|and|a|an|the|very|nice|modern|beautiful|create|make|build|write|generate|give me|show me|code|please)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return `${content}

Build a complete, standalone HTML file for this. Requirements:
- Full HTML5 document with <head> and <body>
${wantsTailwind ? "- Use Tailwind CSS via CDN" : "- Use embedded CSS or Tailwind CDN"}
${wantsDark ? "- Dark theme: use dark backgrounds with light text" : ""}
${wantsAnimated ? "- Add smooth CSS transitions and hover animations" : ""}
- Include a hero section with headline + CTA button
- Include a features/benefits section with 3 cards
- Keep it compact (under 150 lines) but visually polished
- Use realistic placeholder text relevant to "${topic || "SaaS product"}"
- Responsive layout that works on mobile

Respond with the complete HTML code in a single code block.`;
}

// PDF generation tool definition (shared between main brain and task agent)
const GENERATE_PDF_TOOL = {
  type: "function" as const,
  function: {
    name: "generate_pdf",
    description:
      "Generate a PDF document for the user to download. Pass a title and a description of what the PDF should contain. A powerful AI model will construct the PDF content automatically. Use this for any PDF request: reports, summaries, certificates, tables, etc.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Document title (also used as filename)",
        },
        description: {
          type: "string",
          description:
            "Detailed description of what the PDF should contain. Include all relevant information: sections, data, tables, formatting preferences, etc. The more detail you provide, the better the PDF will be.",
        },
        pageSize: {
          type: "string",
          description: "Page size: A4, LETTER, LEGAL. Default: A4",
        },
        pageOrientation: {
          type: "string",
          enum: ["portrait", "landscape"],
          description: "Page orientation. Default: portrait",
        },
      },
      required: ["title", "description"],
    },
  },
};

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
  GENERATE_PDF_TOOL,
  {
    type: "function" as const,
    function: {
      name: "task_agent",
      description:
        "Delegate a complex task to a more powerful AI model. The task agent has its own built-in tools: web_search, web_extract, and image_generation — so it can autonomously search the web, read pages, and generate images as part of its work. Use this for: (1) generating long code (full HTML pages, multi-component apps), (2) complex creative writing, (3) detailed technical explanations, (4) research-heavy tasks that need web lookup, (5) any task that requires a large, thorough output. Pass the FULL user request as the prompt — do NOT summarize or shorten it. The task agent has no conversation context, so include ALL relevant details in the prompt.",
      parameters: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description:
              "The complete, detailed prompt for the task. Include everything the AI needs to know: what to build, style preferences, technical requirements, etc. Be thorough — this agent has no prior context.",
          },
          system_prompt: {
            type: "string",
            description:
              "Optional system-level instructions for the task agent. Use to set tone, format requirements, or role (e.g. 'You are an expert frontend developer. Output only HTML code.').",
          },
          model: {
            type: "string",
            description:
              'Optional model to use. Default: "kilo-auto/free". Examples: "openai/gpt-4o", "anthropic/claude-sonnet-4-20250514", "google/gemini-2.0-flash".',
          },
          max_tokens: {
            type: "number",
            description:
              "Maximum tokens for the response. Default: 16384. Increase for very long outputs.",
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

// ─── PDF Generation (Kilo-powered) ──────────────────────────────────────────
// Uses the Kilo Gateway (powerful model) to generate structured pdfmake content
// nodes from a simple description. The result is returned as JSON that the
// frontend renders client-side with pdfmake.

async function executeGeneratePdf(
  args: Record<string, any>,
  log?: ReturnType<typeof createLogger>
): Promise<string> {
  const title = args.title || "Document";
  const description = args.description || args.content || "";
  const pageSize = args.pageSize || "A4";
  const pageOrientation = args.pageOrientation || "portrait";

  // If content is already an array (pdfmake nodes), pass through directly
  if (Array.isArray(args.content)) {
    return JSON.stringify({
      type: "pdf",
      title,
      content: args.content,
      pageSize,
      pageOrientation,
    });
  }

  // Use Kilo to generate structured data, then build pdfmake via templates
  if (!KILO_API_KEY) {
    log?.error("KILO_API_KEY not configured for PDF generation");
    return JSON.stringify({ error: "PDF generation is not configured." });
  }

  const { system: kiloSystem, user: kiloUser } = buildKiloPrompt(title, description);

  try {
    log?.info(`⚙ PDF generation via Kilo (template): title="${title}", desc=${description.length}ch`);
    const start = Date.now();

    const res = await fetch(KILO_GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KILO_API_KEY}`,
      },
      body: JSON.stringify({
        model: KILO_DEFAULT_MODEL,
        messages: [
          { role: "system", content: kiloSystem },
          { role: "user", content: kiloUser },
        ],
        max_tokens: 8192,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      log?.error(`Kilo PDF generation error ${res.status}: ${errText.slice(0, 300)}`);
      return JSON.stringify({ error: `PDF generation failed: ${res.status}` });
    }

    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content || "";
    log?.info(`⚙ Kilo PDF template response (${Date.now() - start}ms): ${rawContent.length}ch`);

    // Parse structured data from Kilo's response
    let cleanedContent = rawContent.trim();
    // Strip markdown code fences if present
    if (cleanedContent.startsWith("```")) {
      cleanedContent = cleanedContent.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }
    // Extract the JSON object if surrounded by extra text
    const firstBrace = cleanedContent.indexOf("{");
    const lastBrace = cleanedContent.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      cleanedContent = cleanedContent.slice(firstBrace, lastBrace + 1);
    }

    let pdfContent: unknown[];
    try {
      const templateInput = JSON.parse(cleanedContent) as TemplateData;
      if (!templateInput.template || !templateInput.data) {
        throw new Error("Missing template or data field");
      }
      pdfContent = buildPdfContent(templateInput);
      log?.info(`⚙ PDF template "${templateInput.template}" built successfully`);
    } catch (templateErr: any) {
      log?.warn(`Template parse failed: ${templateErr.message} — falling back to generic`);
      // Try to salvage: if Kilo returned a flat object, wrap it in generic template
      try {
        const rawData = JSON.parse(cleanedContent);
        // If it has sections, treat as generic
        if (rawData.sections) {
          pdfContent = buildPdfContent({ template: "generic", data: rawData });
        } else {
          // Build a generic doc from whatever fields are present
          const sections: { heading?: string; body?: string }[] = [];
          for (const [key, value] of Object.entries(rawData)) {
            if (typeof value === "string" && key !== "template") {
              sections.push({ heading: key.charAt(0).toUpperCase() + key.slice(1), body: value });
            }
          }
          pdfContent = buildPdfContent({
            template: "generic",
            data: { subtitle: rawData.subtitle, sections: sections.length > 0 ? sections : [{ body: description }] },
          });
        }
        log?.info("Salvaged Kilo output into generic template");
      } catch {
        // Last resort: generate a generic doc from the original description
        log?.error(`Could not parse Kilo output at all — generating from description. Raw (500ch): ${cleanedContent.slice(0, 500)}`);
        pdfContent = buildPdfContent({
          template: "generic",
          data: {
            subtitle: description.slice(0, 120),
            sections: [{ body: description }],
          },
        });
      }
    }

    return JSON.stringify({
      type: "pdf",
      title,
      content: pdfContent,
      pageSize,
      pageOrientation,
    });
  } catch (err: any) {
    log?.error(`PDF generation fetch error: ${err.message}`);
    return JSON.stringify({ error: `PDF generation failed: ${err.message}` });
  }
}

/**
 * Streaming PDF generation: calls Kilo, collects pdfmake JSON, emits the
 * ACTION tag as an SSE chunk, and streams a brief success message.
 * Used as a special case in streamAgentLoop so it terminates immediately.
 */
async function streamGeneratePdf(
  args: Record<string, any>,
  res: import("@vercel/node").VercelResponse,
  sseId: string,
  sseModel: string,
  log?: ReturnType<typeof createLogger>
): Promise<void> {
  const title = args.title || "Document";

  // Execute the PDF generation (calls Kilo internally)
  const resultJson = await executeGeneratePdf(args, log);

  try {
    const parsed = JSON.parse(resultJson);
    if (parsed.type === "pdf" && parsed.content) {
      const b64 = Buffer.from(JSON.stringify(parsed.content)).toString("base64");
      const actionTag = `\n\n[[ACTION:GENERATE_PDF|${parsed.title || "Document"}|${b64}|${parsed.pageSize || "A4"}|${parsed.pageOrientation || "portrait"}]]\n\n`;
      res.write(sseChunk(sseId, sseModel, { content: actionTag }));

      // Stream a brief success message
      const successMsg = `Your PDF "${parsed.title || "Document"}" has been generated and is ready for download.`;
      await streamTextTokens(res, sseId, sseModel, successMsg);
    } else if (parsed.error) {
      const errMsg = `I wasn't able to generate the PDF: ${parsed.error}`;
      await streamTextTokens(res, sseId, sseModel, errMsg);
    } else {
      await streamTextTokens(res, sseId, sseModel, `PDF "${title}" generation completed.`);
    }
  } catch {
    log?.error("Failed to parse executeGeneratePdf result");
    await streamTextTokens(res, sseId, sseModel, `I encountered an error generating the PDF "${title}". Please try again.`);
  }
}

// ─── Task Agent (Kilo Gateway) ──────────────────────────────────────────────

interface TaskAgentArgs {
  prompt: string;
  system_prompt?: string;
  model?: string;
  max_tokens?: number;
}

// Tools available to the task agent (everything except task_agent itself to avoid recursion)
const TASK_AGENT_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "web_search",
      description:
        "Search the web for real-time information. Returns top search results with snippets. Use when you need current events, facts, or any information that should be looked up.",
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
        "Generate an image based on a text description. Returns the image URL. Use when asked to create, generate, or produce an image, illustration, icon, or visual.",
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
              'Aspect ratio. Examples: "1:1" (square), "16:9" (widescreen), "9:16" (portrait). Default: "1:1".',
            default: "1:1",
          },
          seed: {
            type: "number",
            description:
              "A numeric seed for reproducibility. If not provided, a random seed is used.",
          },
        },
        required: ["prompt"],
      },
    },
  },
  GENERATE_PDF_TOOL,
];

const TASK_AGENT_TOOL_NAMES = new Set(TASK_AGENT_TOOLS.map((t) => t.function.name));
const MAX_TASK_AGENT_TOOL_STEPS = 60;

/**
 * Execute a tool call from the task agent. Reuses the same executors as the main brain.
 */
async function executeTaskAgentTool(
  name: string,
  args: Record<string, any>,
  log?: ReturnType<typeof createLogger>
): Promise<string> {
  log?.info(`⚙ Task agent tool: ${name}(${JSON.stringify(args).slice(0, 200)})`);
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
    case "generate_pdf":
      result = await executeGeneratePdf(args, log);
      break;
    default:
      result = `Unknown tool: ${name}`;
  }
  log?.info(`⚙ Task agent tool ${name} done (${Date.now() - start}ms): ${result.length}ch`);
  return result;
}

/**
 * Non-streaming: call Kilo Gateway with tool support, run a tool-calling loop.
 */
async function executeTaskAgent(
  args: TaskAgentArgs,
  log?: ReturnType<typeof createLogger>
): Promise<string> {
  if (!KILO_API_KEY) {
    log?.error("KILO_API_KEY not configured");
    return "Error: Task agent is not configured. KILO_API_KEY environment variable is missing.";
  }

  const model = KILO_DEFAULT_MODEL;
  const maxTokens = args.max_tokens || 16384;
  const messages: { role: string; content: string | null; tool_calls?: any[]; tool_call_id?: string }[] = [];

  if (args.system_prompt) {
    messages.push({ role: "system", content: args.system_prompt });
  }
  messages.push({ role: "user", content: args.prompt });

  log?.info(`⚙ Task agent call: model=${model}, max_tokens=${maxTokens}, prompt=${args.prompt.length}ch, tools=${TASK_AGENT_TOOLS.length}`);
  const start = Date.now();

  for (let step = 0; step < MAX_TASK_AGENT_TOOL_STEPS; step++) {
    try {
      const res = await fetch(KILO_GATEWAY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${KILO_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature: 0.7,
          stream: false,
          tools: TASK_AGENT_TOOLS,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        log?.error(`Task agent error ${res.status} (${Date.now() - start}ms): ${errText.slice(0, 500)}`);
        return `Error from task agent: ${res.status} ${errText.slice(0, 200)}`;
      }

      const data = await res.json();
      const choice = data.choices?.[0];
      const message = choice?.message;
      const finishReason = choice?.finish_reason;

      if (!message) {
        log?.error("Task agent returned no message");
        return "Error: Task agent returned no message.";
      }

      // If the model wants to call tools, execute them and loop
      if (finishReason === "tool_calls" && message.tool_calls?.length > 0) {
        log?.info(`⚙ Task agent step ${step + 1}: ${message.tool_calls.length} tool calls [${message.tool_calls.map((tc: any) => tc.function.name).join(", ")}]`);

        // Add assistant message with tool_calls
        messages.push({
          role: "assistant",
          content: message.content || null,
          tool_calls: message.tool_calls,
        });

        // Execute each tool call and add results
        for (const tc of message.tool_calls) {
          const toolArgs = JSON.parse(tc.function.arguments || "{}");
          const result = await executeTaskAgentTool(tc.function.name, toolArgs, log);
          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: result,
          });
        }
        continue; // next iteration of tool loop
      }

      // Normal stop — return the content
      const content = message.content || "";
      log?.info(`⚙ Task agent done (${Date.now() - start}ms, ${step + 1} steps): ${content.length}ch`);
      return content;
    } catch (err: any) {
      log?.error(`Task agent fetch error: ${err.message}`);
      return `Error calling task agent: ${err.message}`;
    }
  }

  log?.warn(`Task agent hit max tool steps (${MAX_TASK_AGENT_TOOL_STEPS})`);
  return "Error: Task agent exceeded maximum tool steps.";
}

/**
 * Streaming: call Kilo Gateway with stream=true and tool support.
 * Pipes text tokens directly to our SSE response. When Kilo requests tool calls,
 * executes them server-side and continues the conversation (non-streaming for
 * tool rounds, streaming for the final text response).
 */
async function streamTaskAgent(
  args: TaskAgentArgs,
  res: import("@vercel/node").VercelResponse,
  sseId: string,
  sseModel: string,
  log?: ReturnType<typeof createLogger>
): Promise<string> {
  if (!KILO_API_KEY) {
    log?.error("KILO_API_KEY not configured");
    const errMsg = "Error: Task agent is not configured. KILO_API_KEY environment variable is missing.";
    res.write(sseChunk(sseId, sseModel, { content: errMsg }));
    return errMsg;
  }

  const model = KILO_DEFAULT_MODEL;
  const maxTokens = args.max_tokens || 16384;
  const messages: { role: string; content: string | null; tool_calls?: any[]; tool_call_id?: string }[] = [];

  if (args.system_prompt) {
    messages.push({ role: "system", content: args.system_prompt });
  }
  messages.push({ role: "user", content: args.prompt });

  log?.info(`⚙ Task agent stream: model=${model}, max_tokens=${maxTokens}, prompt=${args.prompt.length}ch, tools=${TASK_AGENT_TOOLS.length}`);
  const start = Date.now();
  let totalCollected = "";

  for (let step = 0; step < MAX_TASK_AGENT_TOOL_STEPS; step++) {
    // Use non-streaming for tool-calling rounds (need to collect tool_calls),
    // and streaming for the final text response.
    // Strategy: always try streaming first. Collect tool_calls from the stream.
    try {
      const fetchRes = await fetch(KILO_GATEWAY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${KILO_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature: 0.7,
          stream: true,
          tools: TASK_AGENT_TOOLS,
        }),
      });

      if (!fetchRes.ok) {
        const errText = await fetchRes.text();
        log?.error(`Task agent stream error ${fetchRes.status}: ${errText.slice(0, 500)}`);
        const errMsg = `Error from task agent: ${fetchRes.status}`;
        res.write(sseChunk(sseId, sseModel, { content: errMsg }));
        return totalCollected + errMsg;
      }

      if (!fetchRes.body) {
        log?.error("Task agent stream: no response body");
        const errMsg = "Error: Task agent returned no stream body.";
        res.write(sseChunk(sseId, sseModel, { content: errMsg }));
        return totalCollected + errMsg;
      }

      // Read the full stream, collecting content + tool_calls
      const reader = fetchRes.body.getReader();
      const decoder = new TextDecoder();
      let collected = "";
      const streamToolCalls: (any & { _argFragments: string })[] = [];
      let finishReason: string | null = null;
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
            const chunk = JSON.parse(line.slice(6));
            const delta = chunk.choices?.[0]?.delta;
            const reason = chunk.choices?.[0]?.finish_reason;

            if (reason) finishReason = reason;

            // Text content — pipe to client in real-time
            if (delta?.content) {
              collected += delta.content;
              res.write(sseChunk(sseId, sseModel, { content: delta.content }));
            }

            // Tool call deltas — collect them
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0;
                if (!streamToolCalls[idx]) {
                  streamToolCalls[idx] = {
                    id: tc.id || "",
                    type: tc.type || "function",
                    function: { name: tc.function?.name || "", arguments: "" },
                    _argFragments: "",
                  };
                }
                if (tc.id) streamToolCalls[idx].id = tc.id;
                if (tc.function?.name) streamToolCalls[idx].function.name = tc.function.name;
                if (tc.function?.arguments) {
                  streamToolCalls[idx]._argFragments += tc.function.arguments;
                  streamToolCalls[idx].function.arguments = streamToolCalls[idx]._argFragments;
                }
              }
            }
          } catch {
            // skip malformed SSE chunks
          }
        }
      }

      totalCollected += collected;

      // Clean up tool calls
      const parsedToolCalls = streamToolCalls
        .filter(Boolean)
        .map(({ _argFragments, ...tc }: any) => tc);

      // If Kilo wants to call tools, execute them and continue
      if (finishReason === "tool_calls" && parsedToolCalls.length > 0) {
        log?.info(`⚙ Task agent stream step ${step + 1}: ${parsedToolCalls.length} tool calls [${parsedToolCalls.map((tc: any) => tc.function.name).join(", ")}]`);

        // Add assistant message with tool_calls
        messages.push({
          role: "assistant",
          content: collected || null,
          tool_calls: parsedToolCalls,
        });

        // Execute each tool call, emit status events, add results
        for (const tc of parsedToolCalls) {
          const toolArgs = JSON.parse(tc.function.arguments || "{}");
          sseToolStatus(res, sseId, sseModel, "tool_start", tc.function.name, toolArgs);
          const result = await executeTaskAgentTool(tc.function.name, toolArgs, log);
          sseToolStatus(res, sseId, sseModel, "tool_done", tc.function.name);

          // For generate_pdf: stream the PDF data as an action tag in the content
          // and feed a simplified result back to task_agent conversation
          if (tc.function.name === "generate_pdf") {
            try {
              const parsed = JSON.parse(result);
              if (parsed.type === "pdf" && parsed.content) {
                const b64 = Buffer.from(JSON.stringify(parsed.content)).toString("base64");
                const actionTag = `\n\n[[ACTION:GENERATE_PDF|${parsed.title || "Document"}|${b64}|${parsed.pageSize || "A4"}|${parsed.pageOrientation || "portrait"}]]\n\n`;
                res.write(sseChunk(sseId, sseModel, { content: actionTag }));
                messages.push({
                  role: "tool",
                  tool_call_id: tc.id,
                  content: JSON.stringify({ success: true, title: parsed.title, message: `PDF "${parsed.title}" generated and download button shown.` }),
                });
              } else {
                messages.push({ role: "tool", tool_call_id: tc.id, content: result });
              }
            } catch {
              messages.push({ role: "tool", tool_call_id: tc.id, content: result });
            }
          } else {
            messages.push({
              role: "tool",
              tool_call_id: tc.id,
              content: result,
            });
          }
        }
        continue; // next iteration — will stream the follow-up response
      }

      // Normal stop — we already piped all content
      log?.info(`⚙ Task agent stream done (${Date.now() - start}ms, ${step + 1} steps): ${totalCollected.length}ch piped`);
      return totalCollected;
    } catch (err: any) {
      log?.error(`Task agent stream fetch error: ${err.message}`);
      const errMsg = `Error streaming from task agent: ${err.message}`;
      res.write(sseChunk(sseId, sseModel, { content: errMsg }));
      return totalCollected + errMsg;
    }
  }

  log?.warn(`Task agent stream hit max tool steps (${MAX_TASK_AGENT_TOOL_STEPS})`);
  return totalCollected;
}

// ─── Tool Executor (dispatcher) ─────────────────────────────────────────────

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
    case "generate_pdf":
      result = await executeGeneratePdf(args, log);
      break;
    case "task_agent":
      result = await executeTaskAgent(args as TaskAgentArgs, log);
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

/**
 * Try to parse a raw tool call JSON string. Handles common A0 quirks:
 * - Whitespace around JSON
 * - Unescaped quotes inside string values (e.g. HTML attributes in prompts)
 */
function tryParseToolCall(raw: string): ParsedToolCall | null {
  const trimmed = raw.trim();

  // Try parsing as-is first (fast path)
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed.name && parsed.arguments) return parsed;
  } catch {
    // fall through to lenient parsing
  }

  // Lenient: extract name and arguments separately
  try {
    const nameMatch = trimmed.match(/"name"\s*:\s*"([^"]+)"/);
    if (!nameMatch) return null;

    // Find the arguments object: everything after "arguments": up to the end
    const argsStart = trimmed.indexOf('"arguments"');
    if (argsStart === -1) return null;

    const colonAfterArgs = trimmed.indexOf(":", argsStart + 11);
    if (colonAfterArgs === -1) return null;

    // Extract from the first { after "arguments": to the last }
    const afterColon = trimmed.slice(colonAfterArgs + 1);
    const firstBrace = afterColon.indexOf("{");
    if (firstBrace === -1) return null;

    // Find matching closing brace by counting depth
    let depth = 0;
    let lastBrace = -1;
    for (let i = firstBrace; i < afterColon.length; i++) {
      if (afterColon[i] === "{") depth++;
      else if (afterColon[i] === "}") {
        depth--;
        if (depth === 0) { lastBrace = i; break; }
      }
    }
    if (lastBrace === -1) return null;

    const argsStr = afterColon.slice(firstBrace, lastBrace + 1);

    // Try parsing arguments JSON
    let argsJson: any;
    try {
      argsJson = JSON.parse(argsStr);
    } catch {
      // Try fixing unescaped inner quotes: replace " that appears mid-value
      // Strategy: parse key-value pairs individually
      try {
        // Simple approach: extract each key's value using a greedy pattern
        const fixedStr = argsStr.replace(
          /("(?:prompt|system_prompt|model|query|url|description)":\s*")([^]*?)("(?:,\s*"|}\s*$))/g,
          (_m, pre, val, post) => pre + val.replace(/(?<!\\)"/g, '\\"') + post
        );
        argsJson = JSON.parse(fixedStr);
      } catch {
        // Last resort: extract fields by finding key positions and value boundaries
        const result: Record<string, any> = {};
        // Find all top-level keys and extract their values
        const keyRegex = /"(\w+)"\s*:/g;
        const keys: { key: string; start: number }[] = [];
        let km;
        while ((km = keyRegex.exec(argsStr)) !== null) {
          keys.push({ key: km[1], start: km.index + km[0].length });
        }
        for (let ki = 0; ki < keys.length; ki++) {
          const valueStart = keys[ki].start;
          const valueEnd = ki + 1 < keys.length
            ? argsStr.lastIndexOf(",", keys[ki + 1].start)
            : argsStr.lastIndexOf("}");
          const rawVal = argsStr.slice(valueStart, valueEnd !== -1 ? valueEnd : undefined).trim();
          if (rawVal.startsWith('"')) {
            // String value — strip outer quotes
            result[keys[ki].key] = rawVal.slice(1, rawVal.lastIndexOf('"'));
          } else if (/^\d+/.test(rawVal)) {
            result[keys[ki].key] = Number(rawVal);
          }
        }
        if (Object.keys(result).length > 0) {
          argsJson = result;
        }
      }
    }

    if (argsJson) {
      return { name: nameMatch[1], arguments: argsJson };
    }
  } catch {
    // skip completely malformed tool calls
  }

  return null;
}

function parseToolCalls(text: string): ParsedToolCall[] {
  const calls: ParsedToolCall[] = [];
  const regex = /<tool_call>([\s\S]*?)(?:<\/tool_call>|$)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const parsed = tryParseToolCall(match[1]);
    if (parsed) calls.push(parsed);
  }
  return calls;
}

function stripToolCalls(text: string): string {
  // Strip both closed and unclosed tool_call blocks
  return text.replace(/<tool_call>[\s\S]*?(?:<\/tool_call>|$)/g, "").trim();
}

// ─── Multi-step Agent Loop ───────────────────────────────────────────────────

// ─── Tool Classification ─────────────────────────────────────────────────────

const BUILTIN_TOOL_NAMES = new Set(["web_search", "web_extract", "image_generation", "task_agent", "generate_pdf"]);

function isBuiltinTool(name: string): boolean {
  return BUILTIN_TOOL_NAMES.has(name);
}

// ─── Default System Prompt ──────────────────────────────────────────────────

const DEFAULT_SYSTEM_PROMPT = `You are a helpful, creative, and knowledgeable AI assistant. You always respond with substantive, complete answers.

## Core Behavior
- ALWAYS provide a response. Never return an empty message. This is your most important rule.
- When a request is vague or broad, interpret it generously and deliver your best result rather than refusing or asking too many clarifying questions.
- If a request is ambiguous, pick the most likely interpretation and go with it. You can mention your assumptions briefly.
- Match your response length to the complexity of the request. Short questions get concise answers; creative/coding tasks get thorough outputs.

## Code Generation & Complex Tasks — IMPORTANT
For complex or large outputs, you have a **task_agent** tool that delegates to a more powerful AI model. The task agent has its own built-in tools (web_search, web_extract, image_generation) — it can autonomously search the web, read pages, and generate images as part of its work. USE IT when:
- The user asks you to generate a full HTML page, website, landing page, or multi-section UI
- The user wants long-form code (more than ~50 lines expected)
- The task requires detailed creative writing, long technical docs, or multi-file code
- The user asks for research-heavy content that needs web lookups and thorough analysis
- The user wants content with generated images embedded
- Any request where a thorough, high-quality, long response is needed
NOTE: Do NOT use task_agent for PDF generation. Use the generate_pdf tool directly instead.

When calling task_agent:
- Pass the user's FULL original request as the prompt — do NOT summarize or shorten it
- Add relevant context, style preferences, and technical requirements to the prompt
- If the task needs web research, tell the task agent to search the web in the prompt (it has web_search and web_extract tools)
- If the task needs images, tell the task agent to generate them (it has image_generation tool)
- If the user wants HTML/web pages, include in the prompt: "Produce a complete, standalone HTML file. Use Tailwind CSS via CDN. Include realistic content."
- If the user mentions "dark theme", include that in the prompt
- Set a system_prompt like "You are an expert frontend developer" for code tasks

## PDF Generation
You have a **generate_pdf** tool. Call it DIRECTLY — do NOT delegate PDF generation to task_agent. Pass a title and a DETAILED description with ALL the data to include. The system uses templates (profile_snapshot, report, certificate, table_report, generic) and an AI model extracts structured data from your description — so include every detail: names, dates, skills, scores, sections, table data, etc.
Example: generate_pdf({ title: "Anye Happiness — Profile Snapshot", description: "Profile snapshot for Anye Happiness Ade, email hans@gmail.com. Candidate, remote, open to relocation. Skills: Typescript (Frontend, Beginner), PHP (Backend, Beginner), React (Frontend, Beginner). 3 modules completed out of 10. 0 of 3 mentor loops. Recent activity: 3/9/2026 training Mentor Matched, 3/9/2026 resume_upload Resume Uploaded. Next steps: Find a Mentor, Continue BridgeFast modules." })
The more data you include in the description, the better the PDF. Include ALL relevant user data.

For SIMPLE code questions (explain a function, fix a bug, short snippet), answer directly without task_agent.
**Do NOT produce a blank/empty response.** If unsure whether to use task_agent, use it — it's better to delegate than return nothing.

## Formatting
- Use Markdown formatting for readability: headings, code blocks (with language tags), lists, bold/italic.
- For code responses, wrap the code in a single fenced code block with the correct language identifier.
- When showing HTML, use \`\`\`html code fences.

## Tone
- Be direct and helpful. Skip unnecessary preamble like "Sure!" or "Of course!". Go straight to the answer.
- Be conversational but professional.
- If you use a tool, incorporate the results naturally into your response.`;

// ─── Tool System Prompt Builder ─────────────────────────────────────────────

function buildToolSystemPrompt(userTools?: any[]): string {
  let prompt = `You have access to tools. When you need to use a tool, respond with a JSON tool call block.

Built-in tools (executed automatically):
1. **web_search** - Search the web. Params: { "query": "search terms" }
2. **web_extract** - Extract content from a URL. Params: { "url": "https://..." }
3. **image_generation** - Generate an image. Params: { "prompt": "description", "aspect": "1:1", "seed": 123 }
4. **generate_pdf** - Generate a downloadable PDF document. Call this DIRECTLY (not via task_agent). Params: { "title": "Document Title", "description": "Include ALL data: names, dates, skills, scores, sections, table rows, etc." }. Uses templates (profile_snapshot, report, certificate, table_report, generic) — include every detail in the description.
5. **task_agent** - Delegate complex tasks to a powerful AI model that has its OWN built-in tools (web_search, web_extract, image_generation). It can autonomously search the web, read pages, and generate images as part of its work. Params: { "prompt": "full detailed task description", "system_prompt": "optional role/instructions", "max_tokens": 16384 }. ALWAYS use this for: HTML pages, landing pages, full websites, long code, research tasks, or any task needing a large output. Do NOT use task_agent for PDF generation — use generate_pdf directly instead. Do NOT pass a "model" parameter — the system selects the best model automatically.`;

  if (userTools && userTools.length > 0) {
    prompt += `\n\nCustom tools (provided by the caller):`;
    userTools.forEach((tool, i) => {
      const fn = tool.function || tool;
      const params = fn.parameters
        ? ` Params: ${JSON.stringify(fn.parameters.properties ? Object.fromEntries(Object.entries(fn.parameters.properties).map(([k, v]: [string, any]) => [k, v.type || "any"])) : {})}`
        : "";
      prompt += `\n${i + 6}. **${fn.name}** - ${fn.description || "No description"}.${params}`;
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
  finish_reason: "stop" | "tool_calls" | "continuation";
  // Present when finish_reason is "continuation" — client should re-request with this
  _continuation?: ContinuationState;
}

async function runAgentLoop(
  messages: OpenAIMessage[],
  temperature: number,
  maxTokens: number,
  maxSteps: number,
  userTools?: any[],
  log?: ReturnType<typeof createLogger>,
  continuation?: ContinuationState,
  startTime: number = Date.now()
): Promise<AgentResult> {
  let a0Messages: A0Message[];
  let step: number;

  if (continuation) {
    // Resume from continuation
    a0Messages = continuation.a0Messages;
    step = continuation.step;
    log?.info(`Agent loop RESUMED: step=${step}, a0Messages=${a0Messages.length}`);
    a0Messages.push({
      role: "user",
      content: "[System: The previous response was interrupted due to a timeout. Continue EXACTLY where you left off. Do NOT repeat any content that was already generated.]",
    });
  } else {
    // Fresh start
    step = 0;
    log?.info(`Agent loop start: maxSteps=${maxSteps}, userTools=[${(userTools || []).map((t: any) => (t.function || t).name).join(",")}]`);

    // Convert OpenAI messages to A0 format
    a0Messages = [];
    const toolSystemPrompt = buildToolSystemPrompt(userTools);

    // Build combined system prompt: default base + user's system prompt + tool instructions
    const hasSystemMsg = messages.length > 0 && messages[0].role === "system";
    const userSystemPrompt = hasSystemMsg ? messages[0].content : "";
    const combinedSystem = [DEFAULT_SYSTEM_PROMPT, userSystemPrompt, toolSystemPrompt]
      .filter(Boolean)
      .join("\n\n");
    a0Messages.push({ role: "system", content: combinedSystem });

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
        const isUser = msg.role !== "assistant";
        a0Messages.push({
          role: isUser ? "user" : "assistant",
          content: isUser ? enhanceUserPrompt(msg.content || "", !!KILO_API_KEY) : (msg.content || ""),
        });
      }
    }
  }

  const customToolNames = new Set(
    (userTools || []).map((t: any) => (t.function || t).name)
  );

  const allToolCalls: { name: string; arguments: any; result: string }[] = [];
  let finalContent = "";

  while (step < maxSteps) {
    step++;
    log?.info(`── Step ${step}/${maxSteps} ── (elapsed: ${Math.round((Date.now() - startTime) / 1000)}s)`);

    // ── Timeout check: return continuation state before Vercel kills us ──
    if (shouldContinue(startTime)) {
      log?.warn(`Approaching Vercel timeout (${Math.round((Date.now() - startTime) / 1000)}s) — returning continuation`);
      return {
        content: finalContent || null,
        tool_calls_made: allToolCalls,
        pending_tool_calls: null,
        finish_reason: "continuation",
        _continuation: { a0Messages, step, id: "", model: "", contentSoFar: finalContent },
      };
    }

    const completion = await callA0(a0Messages, temperature, maxTokens, log);
    const toolCalls = parseToolCalls(completion);
    log?.info(`Parsed ${toolCalls.length} tool calls: [${toolCalls.map(t => t.name).join(", ")}]`);

    if (toolCalls.length === 0) {
      log?.info("No tool calls — final response");
      finalContent = completion;
      if (!finalContent && step === 1 && !continuation) {
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
        // For generate_pdf, embed action tag into finalContent and simplify result for A0
        if (tc.name === "generate_pdf") {
          try {
            const parsed = JSON.parse(result);
            if (parsed.type === "pdf" && parsed.content) {
              const b64 = Buffer.from(JSON.stringify(parsed.content)).toString("base64");
              finalContent += `\n\n[[ACTION:GENERATE_PDF|${parsed.title || "Document"}|${b64}|${parsed.pageSize || "A4"}|${parsed.pageOrientation || "portrait"}]]\n\n`;
              const simplified = JSON.stringify({ success: true, title: parsed.title, message: `PDF "${parsed.title}" generated.` });
              allToolCalls.push({ name: tc.name, arguments: tc.arguments, result: simplified });
              return { name: tc.name, result: simplified };
            }
          } catch { /* fall through */ }
        }
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
    // Continuation state — present when the function timed out mid-response
    ...(result._continuation ? { _continuation: result._continuation } : {}),
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
 * Emit a continuation event — tells the client to re-request with saved state
 * so the agent loop can seamlessly resume in a new serverless invocation.
 */
function sseContinuation(
  res: VercelResponse,
  id: string,
  model: string,
  state: ContinuationState
): void {
  // Send continuation state as a custom SSE event
  res.write(`data: ${JSON.stringify({
    id,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, delta: { continuation: state }, finish_reason: "continuation" }],
  })}\n\n`);
  res.write("data: [DONE]\n\n");
}

function shouldContinue(startTime: number): boolean {
  return Date.now() - startTime >= CONTINUATION_THRESHOLD_MS;
}

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

    // Parse the tool call (uses lenient parser for A0 quirks)
    const parsed = tryParseToolCall(match[1]);
    if (parsed) {
      calls.push(parsed);
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
  log?: ReturnType<typeof createLogger>,
  continuation?: ContinuationState,
  startTime: number = Date.now()
) {
  // ── Resume from continuation or start fresh ──
  let id: string;
  let a0Messages: A0Message[];
  let step: number;
  let contentSoFar: string;

  if (continuation) {
    // Resuming from a previous invocation that hit the timeout
    id = continuation.id;
    a0Messages = continuation.a0Messages;
    step = continuation.step;
    contentSoFar = continuation.contentSoFar;
    log?.info(`Stream agent loop RESUMED: id=${id}, step=${step}, contentSoFar=${contentSoFar.length}ch`);

    // Tell the AI we're continuing from where we left off
    a0Messages.push({
      role: "user",
      content: "[System: The previous response was interrupted due to a timeout. Continue EXACTLY where you left off. Do NOT repeat any content that was already generated. Do NOT add any preamble like 'Continuing from where I left off' — just seamlessly continue the response.]",
    });
  } else {
    // Fresh start
    id = generateId();
    step = 0;
    contentSoFar = "";
    log?.info(`Stream agent loop start: id=${id}, maxSteps=${maxSteps}, userTools=[${(userTools || []).map((t: any) => (t.function || t).name).join(",")}]`);

    // Convert OpenAI messages to A0 format
    a0Messages = [];
    const toolSystemPrompt = buildToolSystemPrompt(userTools);

    const hasSystemMsg = messages.length > 0 && messages[0].role === "system";
    const userSystemPrompt = hasSystemMsg ? messages[0].content : "";
    const combinedSystem = [DEFAULT_SYSTEM_PROMPT, userSystemPrompt, toolSystemPrompt]
      .filter(Boolean)
      .join("\n\n");
    a0Messages.push({ role: "system", content: combinedSystem });

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
        const isUser = msg.role !== "assistant";
        a0Messages.push({
          role: isUser ? "user" : "assistant",
          content: isUser ? enhanceUserPrompt(msg.content || "", !!KILO_API_KEY) : (msg.content || ""),
        });
      }
    }
  }

  const customToolNames = new Set(
    (userTools || []).map((t: any) => (t.function || t).name)
  );

  // Send initial role chunk (only on fresh start, not continuation)
  if (!continuation) {
    res.write(sseChunk(id, model, { role: "assistant", content: "" }));
  }

  while (step < maxSteps) {
    step++;
    log?.info(`── Stream step ${step}/${maxSteps} ── (elapsed: ${Math.round((Date.now() - startTime) / 1000)}s)`);

    // ── Timeout check: trigger continuation before Vercel kills us ──
    if (shouldContinue(startTime)) {
      log?.warn(`Approaching Vercel timeout (${Math.round((Date.now() - startTime) / 1000)}s elapsed) — triggering continuation`);
      const state: ContinuationState = {
        a0Messages: a0Messages,
        step,
        id,
        model,
        contentSoFar,
      };
      sseContinuation(res, id, model, state);
      res.end();
      log?.info("Stream ended (continuation triggered)");
      return;
    }

    const completion = await callA0(a0Messages, temperature, maxTokens, log);
    const segments = splitCompletionSegments(completion);
    log?.debug(`Segments: ${segments.map(s => s.type === "text" ? `text(${s.content.length}ch)` : `tool_calls(${s.calls.length})`).join(", ")}`);

    // Check if there are any tool calls at all
    const toolSegment = segments.find((s) => s.type === "tool_calls") as
      | { type: "tool_calls"; calls: ParsedToolCall[] }
      | undefined;

    // ── Post-LLM-call timeout check ──
    // The LLM call itself may have taken a long time. Check again.
    if (shouldContinue(startTime)) {
      log?.warn(`Post-LLM timeout (${Math.round((Date.now() - startTime) / 1000)}s) — adding completion to context and triggering continuation`);
      // Add the completion we just got to conversation context so it's not lost
      a0Messages.push({ role: "assistant", content: completion });
      contentSoFar += stripToolCalls(completion);
      const state: ContinuationState = {
        a0Messages,
        step,
        id,
        model,
        contentSoFar,
      };
      sseContinuation(res, id, model, state);
      res.end();
      log?.info("Stream ended (continuation triggered post-LLM)");
      return;
    }

    if (!toolSegment) {
      // Pure text response — stream it and finish
      let textToStream = completion;
      if (!textToStream && step === 1 && !continuation) {
        log?.warn("Empty completion on first stream step — returning fallback message");
        textToStream = "I wasn't able to generate a response for that request. This can happen with very large code generation prompts. Try breaking it into smaller pieces, e.g.:\n\n- \"Create the HTML structure for a dark SaaS landing page\"\n- \"Add Tailwind CSS animations to this page\"\n- \"Write the hero section with a gradient background\"";
      }
      log?.info(`No tool calls — streaming final text (${textToStream.length}ch)`);
      contentSoFar += textToStream;
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
        contentSoFar += seg.content;
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

    // ── generate_pdf special case: generate PDF, emit action tag, terminate ──
    const pdfCall = allCalls.find((tc) => tc.name === "generate_pdf");
    if (pdfCall) {
      log?.info("generate_pdf detected — generating PDF and terminating");
      sseToolStatus(res, id, model, "tool_start", "generate_pdf", pdfCall.arguments);

      // Execute any other co-occurring built-in calls first (silently)
      for (const tc of builtinCalls.filter((t) => t.name !== "generate_pdf")) {
        sseToolStatus(res, id, model, "tool_start", tc.name, tc.arguments);
        await executeTool(tc.name, tc.arguments, log);
        sseToolStatus(res, id, model, "tool_done", tc.name);
      }

      // Generate PDF, emit action tag, stream success message
      await streamGeneratePdf(pdfCall.arguments as Record<string, any>, res, id, model, log);

      sseToolStatus(res, id, model, "tool_done", "generate_pdf");
      res.write(sseChunk(id, model, {}, "stop"));
      res.write("data: [DONE]\n\n");
      res.end();
      log?.info("Stream ended (stop, generate_pdf)");
      return;
    }

    // ── task_agent special case: pipe Kilo stream directly to client ──
    const taskAgentCall = allCalls.find((tc) => tc.name === "task_agent");
    if (taskAgentCall) {
      log?.info("task_agent detected — piping Kilo Gateway stream directly to client");
      sseToolStatus(res, id, model, "tool_start", "task_agent", taskAgentCall.arguments);

      // Execute any other co-occurring built-in calls first
      for (const tc of builtinCalls.filter((t) => t.name !== "task_agent")) {
        sseToolStatus(res, id, model, "tool_start", tc.name, tc.arguments);
        await executeTool(tc.name, tc.arguments, log);
        sseToolStatus(res, id, model, "tool_done", tc.name);
      }

      // Stream task_agent response directly — real-time piping from Kilo → client
      await streamTaskAgent(taskAgentCall.arguments as TaskAgentArgs, res, id, model, log);

      sseToolStatus(res, id, model, "tool_done", "task_agent");
      res.write(sseChunk(id, model, {}, "stop"));
      res.write("data: [DONE]\n\n");
      res.end();
      log?.info("Stream ended (stop, task_agent piped)");
      return;
    }

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

      // For generate_pdf: stream the PDF data as an action tag in the content
      // so the frontend can parse it and render client-side with pdfmake CDN.
      // Feed a simplified result back to A0 (not the full pdfmake JSON).
      if (tc.name === "generate_pdf") {
        try {
          const parsed = JSON.parse(result);
          if (parsed.type === "pdf" && parsed.content) {
            const b64 = Buffer.from(JSON.stringify(parsed.content)).toString("base64");
            const actionTag = `\n\n[[ACTION:GENERATE_PDF|${parsed.title || "Document"}|${b64}|${parsed.pageSize || "A4"}|${parsed.pageOrientation || "portrait"}]]\n\n`;
            res.write(sseChunk(id, model, { content: actionTag }));
            // Feed simplified result to A0 so it doesn't waste context on pdfmake JSON
            results.push({ name: tc.name, result: JSON.stringify({ success: true, title: parsed.title, message: `PDF "${parsed.title}" has been generated and a download button is shown to the user.` }) });
          } else {
            results.push({ name: tc.name, result });
          }
        } catch {
          results.push({ name: tc.name, result });
        }
      } else {
        results.push({ name: tc.name, result });
      }
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

    // ── Post-tool-execution timeout check ──
    if (shouldContinue(startTime)) {
      log?.warn(`Post-tool timeout (${Math.round((Date.now() - startTime) / 1000)}s) — triggering continuation with tool results in context`);
      const state: ContinuationState = {
        a0Messages,
        step,
        id,
        model,
        contentSoFar,
      };
      sseContinuation(res, id, model, state);
      res.end();
      log?.info("Stream ended (continuation triggered post-tools)");
      return;
    }

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

    const startTime = Date.now();
    const continuation = body._continuation || undefined;
    log.info(`Config: model=${model}, temp=${temperature}, maxTokens=${maxTokens}, stream=${stream}, maxSteps=${maxSteps}, continuation=${!!continuation}`);

    if (stream) {
      // Streaming: run the agent loop with live SSE output
      log.info(continuation ? "Resuming streaming agent loop from continuation" : "Starting streaming agent loop");
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
        log,
        continuation,
        startTime
      );
    }

    // Non-streaming: run the agent loop and return complete response
    log.info(continuation ? "Resuming non-streaming agent loop from continuation" : "Starting non-streaming agent loop");
    const result = await runAgentLoop(
      body.messages,
      temperature,
      maxTokens,
      maxSteps,
      body.tools,
      log,
      continuation,
      startTime
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
