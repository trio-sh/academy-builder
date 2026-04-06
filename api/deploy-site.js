/**
 * Deploy Site Proxy API
 *
 * Upload to the3rdacademy.com as: /api/deploy-site
 *
 * This proxies deploy requests from the PiPilot IDE frontend to
 * the Supabase Edge Function, solving two problems:
 *   1. CORS — browser blocks cross-origin requests to Supabase
 *   2. Cloudflare WAF — raw HTML/JS in request body gets flagged as XSS
 *
 * The frontend sends files as base64 JSON. This API decodes them and
 * forwards to Supabase as multipart form-data (server-to-server, no CORS/WAF).
 *
 * ─── Usage ───────────────────────────────────────────────────────────
 *
 * If your backend is Express:
 *   const deploySite = require('./deploy-site');
 *   app.post('/api/deploy-site', deploySite);
 *
 * If your backend is a standalone serverless function (Vercel, Netlify, etc.):
 *   module.exports = handler;  // already exported at the bottom
 *
 * ─── Frontend Request Format ─────────────────────────────────────────
 *
 * POST /api/deploy-site
 * Content-Type: application/json
 *
 * {
 *   "slug": "my-project",
 *   "name": "My Project",
 *   "files": {
 *     "index.html": "PGh0bWw+Li4u...",     // base64-encoded content
 *     "style.css":  "Ym9keSB7Li4u...",
 *     "script.js":  "Y29uc29sZS4u..."
 *   }
 * }
 */

const SUPABASE_URL = "https://efbajxuvfxrvniuyohho.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmYmFqeHV2Znhydm5pdXlvaGhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNTUxMTMsImV4cCI6MjA5MDYzMTExM30.lSahWo-oGDeUg-jVbCf3ZjLzVRuZC4tu-CKw0aT2pyI";
const DEPLOY_FUNCTION = `${SUPABASE_URL}/functions/v1/deploy-site`;

// ─── CORS headers ────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

// ─── Mime type map ───────────────────────────────────────────────────

const MIME_MAP = {
  html: "text/html",
  htm: "text/html",
  css: "text/css",
  js: "application/javascript",
  mjs: "application/javascript",
  json: "application/json",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  ico: "image/x-icon",
  txt: "text/plain",
  md: "text/markdown",
  xml: "application/xml",
};

function getMimeType(filename) {
  const ext = filename.split(".").pop()?.toLowerCase();
  return MIME_MAP[ext] || "application/octet-stream";
}

// ─── Main handler ────────────────────────────────────────────────────

async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(405, { ...corsHeaders, "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  try {
    // Parse the incoming JSON body
    const body = await parseBody(req);
    const { slug, name, files } = body;

    if (!slug || !files || typeof files !== "object") {
      res.writeHead(400, { ...corsHeaders, "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Missing required fields: slug, files" }));
      return;
    }

    // Step 1: Register the site (ignore errors — site may already exist)
    try {
      await fetch(DEPLOY_FUNCTION, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_KEY}`,
          apikey: SUPABASE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slug, name: name || slug }),
      });
    } catch (_) {
      // Registration failure is OK — site may already exist
    }

    // Step 2: Build multipart form-data with decoded files
    const boundary = "----PiPilotDeploy" + Date.now();
    const parts = [];

    // Add slug field
    parts.push(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="slug"\r\n\r\n` +
      `${slug}\r\n`
    );

    // Add each file — decode from base64
    for (const [filePath, fileContent] of Object.entries(files)) {
      const content = typeof fileContent === "string" ? fileContent : fileContent;
      let decoded;
      try {
        // Decode base64 → UTF-8 string
        decoded = Buffer.from(content, "base64").toString("utf-8");
      } catch {
        // If not valid base64, use as-is (plain text fallback)
        decoded = content;
      }

      const mime = getMimeType(filePath);
      parts.push(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="${filePath}"; filename="${filePath}"\r\n` +
        `Content-Type: ${mime}\r\n\r\n` +
        `${decoded}\r\n`
      );
    }

    parts.push(`--${boundary}--\r\n`);
    const multipartBody = parts.join("");

    // Step 3: Forward to Supabase Edge Function (server-to-server, no CORS/WAF issue)
    const supabaseRes = await fetch(DEPLOY_FUNCTION, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_KEY}`,
        apikey: SUPABASE_KEY,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body: multipartBody,
    });

    const responseText = await supabaseRes.text();

    // Forward the Supabase response back to the client
    let responseBody;
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = { message: responseText };
    }

    // Add the live URL to the response
    responseBody.slug = slug;
    responseBody.url = `https://pipilot.dev/site-proxy.html?slug=${encodeURIComponent(slug)}`;
    responseBody.fileCount = Object.keys(files).length;

    res.writeHead(supabaseRes.ok ? 200 : supabaseRes.status, {
      ...corsHeaders,
      "Content-Type": "application/json",
    });
    res.end(JSON.stringify(responseBody));

  } catch (err) {
    console.error("Deploy proxy error:", err);
    res.writeHead(500, { ...corsHeaders, "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message || "Internal server error" }));
  }
}

// ─── Body parser (works with raw Node.js req or Express) ─────────────

function parseBody(req) {
  // If Express already parsed the body
  if (req.body && typeof req.body === "object") {
    return Promise.resolve(req.body);
  }

  // Raw Node.js — read the stream
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString()));
      } catch (e) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

// ─── Express middleware export ────────────────────────────────────────
// Use as: app.post('/api/deploy-site', require('./deploy-site'))

module.exports = handler;

// Also export for ES modules / serverless
module.exports.default = handler;
