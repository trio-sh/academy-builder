// Supabase Edge Function for sending emails via Zoho SMTP
// Deploy with: supabase functions deploy send-email

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Zoho SMTP Configuration
const SMTP_CONFIG = {
  hostname: "smtp.zoho.com",
  port: 465,
  username: "the3rdacademy@pipilot.dev",
  password: "Bamenda@5",
};

interface EmailRequest {
  to: string;
  toName: string;
  subject: string;
  html: string;
  from: {
    name: string;
    email: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to, toName, subject, html, from }: EmailRequest = await req.json();

    // Validate required fields
    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, html" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create SMTP client
    const client = new SmtpClient();

    // Connect to Zoho SMTP
    await client.connectTLS({
      hostname: SMTP_CONFIG.hostname,
      port: SMTP_CONFIG.port,
      username: SMTP_CONFIG.username,
      password: SMTP_CONFIG.password,
    });

    // Send email
    await client.send({
      from: `${from?.name || "The 3rd Academy"} <${from?.email || SMTP_CONFIG.username}>`,
      to: toName ? `${toName} <${to}>` : to,
      subject: subject,
      content: html,
      html: html,
    });

    // Close connection
    await client.close();

    console.log(`Email sent successfully to ${to}`);

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending email:", error);

    return new Response(
      JSON.stringify({ error: error.message || "Failed to send email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
