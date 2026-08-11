// Supabase Edge Function for sending emails via SMTP
// Deploy with: supabase functions deploy send-email
//
// Configure these Function Secrets before deploying:
//   supabase secrets set \
//     SMTP_HOST=smtp.gmail.com \
//     SMTP_PORT=587 \
//     SMTP_USERNAME=support@the3rdacademy.com \
//     SMTP_PASSWORD='<google app password>' \
//     SMTP_FROM_EMAIL=support@the3rdacademy.com \
//     SMTP_FROM_NAME='The 3rd Academy'
//
// STARTTLS is used when SMTP_PORT is 587; implicit TLS is used when
// SMTP_PORT is 465. Never commit credentials to source.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  from?: {
    name?: string;
    email?: string;
  };
}

function readSmtpConfig() {
  const host = Deno.env.get("SMTP_HOST");
  const portRaw = Deno.env.get("SMTP_PORT");
  const username = Deno.env.get("SMTP_USERNAME");
  const password = Deno.env.get("SMTP_PASSWORD");

  if (!host || !portRaw || !username || !password) {
    throw new Error(
      "SMTP not configured: set SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD as function secrets",
    );
  }

  const port = Number(portRaw);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`Invalid SMTP_PORT: ${portRaw}`);
  }

  return {
    host,
    port,
    username,
    password,
    fromEmail: Deno.env.get("SMTP_FROM_EMAIL") ?? username,
    fromName: Deno.env.get("SMTP_FROM_NAME") ?? "The 3rd Academy",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to, toName, subject, html, from }: EmailRequest = await req.json();

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, html" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const cfg = readSmtpConfig();

    // Port 465 uses implicit TLS; every other port uses STARTTLS.
    const client = new SMTPClient({
      connection: {
        hostname: cfg.host,
        port: cfg.port,
        tls: cfg.port === 465,
        auth: {
          username: cfg.username,
          password: cfg.password,
        },
      },
    });

    await client.send({
      from: `${from?.name || cfg.fromName} <${from?.email || cfg.fromEmail}>`,
      to: toName ? `${toName} <${to}>` : to,
      subject,
      content: html,
      html,
    });

    await client.close();

    console.log(`Email sent successfully to ${to}`);

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error sending email:", error);
    const message = error instanceof Error ? error.message : "Failed to send email";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
