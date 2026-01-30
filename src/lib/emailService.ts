import { supabase } from "./supabase";
import { getEmailHtml, getEmailSubject, type EmailTemplate } from "./notifications";

// Email configuration for Zoho SMTP
export const EMAIL_CONFIG = {
  host: "smtp.zoho.com",
  port: 465,
  secure: true, // SSL
  auth: {
    user: "the3rdacademy@pipilot.dev",
    pass: "Bamenda@5",
  },
  from: {
    name: "The 3rd Academy",
    email: "the3rdacademy@pipilot.dev",
  },
};

// For browser-based sending, we'll use Supabase Edge Function or API
// This config is for reference or server-side implementation

/**
 * Send email via Supabase Edge Function
 * The edge function handles the actual SMTP connection
 */
export async function sendEmailViaEdgeFunction(
  to: string,
  toName: string,
  template: EmailTemplate,
  templateData: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    const subject = getEmailSubject(template);
    const html = getEmailHtml(template, templateData);

    // Call Supabase Edge Function to send email
    const { data, error } = await supabase.functions.invoke("send-email", {
      body: {
        to,
        toName,
        subject,
        html,
        from: EMAIL_CONFIG.from,
      },
    });

    if (error) {
      console.error("Edge function error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Error sending email:", err);
    return { success: false, error: "Failed to send email" };
  }
}

/**
 * Process pending emails in the queue
 * This should be called by a cron job or edge function
 */
export async function processEmailQueue(): Promise<{
  processed: number;
  failed: number;
  errors: string[];
}> {
  const result = { processed: 0, failed: 0, errors: [] as string[] };

  // Fetch pending emails
  const { data: pendingEmails, error: fetchError } = await supabase
    .from("email_queue")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(50);

  if (fetchError || !pendingEmails) {
    result.errors.push(fetchError?.message || "Failed to fetch pending emails");
    return result;
  }

  for (const email of pendingEmails) {
    try {
      const sendResult = await sendEmailViaEdgeFunction(
        email.to_email,
        email.to_name,
        email.template as EmailTemplate,
        email.template_data as Record<string, any>
      );

      if (sendResult.success) {
        // Mark as sent
        await supabase
          .from("email_queue")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
          })
          .eq("id", email.id);
        result.processed++;
      } else {
        // Mark as failed
        await supabase
          .from("email_queue")
          .update({
            status: "failed",
            error_message: sendResult.error,
          })
          .eq("id", email.id);
        result.failed++;
        result.errors.push(`Email ${email.id}: ${sendResult.error}`);
      }
    } catch (err) {
      result.failed++;
      result.errors.push(`Email ${email.id}: ${err}`);
    }
  }

  return result;
}

/**
 * Send email directly (for immediate delivery)
 * Falls back to queue if direct send fails
 */
export async function sendEmailDirect(
  to: string,
  toName: string,
  template: EmailTemplate,
  templateData: Record<string, any>
): Promise<{ success: boolean; queued?: boolean; error?: string }> {
  // Try direct send first
  const result = await sendEmailViaEdgeFunction(to, toName, template, templateData);

  if (result.success) {
    return { success: true };
  }

  // Fall back to queue
  const { error } = await supabase.from("email_queue").insert({
    to_email: to,
    to_name: toName,
    template,
    template_data: templateData,
    status: "pending",
  });

  if (error) {
    return { success: false, error: "Failed to queue email" };
  }

  return { success: true, queued: true };
}

/**
 * Get email queue stats
 */
export async function getEmailQueueStats(): Promise<{
  pending: number;
  sent: number;
  failed: number;
}> {
  const stats = { pending: 0, sent: 0, failed: 0 };

  const { count: pending } = await supabase
    .from("email_queue")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  const { count: sent } = await supabase
    .from("email_queue")
    .select("*", { count: "exact", head: true })
    .eq("status", "sent");

  const { count: failed } = await supabase
    .from("email_queue")
    .select("*", { count: "exact", head: true })
    .eq("status", "failed");

  stats.pending = pending || 0;
  stats.sent = sent || 0;
  stats.failed = failed || 0;

  return stats;
}

/**
 * Retry failed emails
 */
export async function retryFailedEmails(): Promise<number> {
  const { data, error } = await supabase
    .from("email_queue")
    .update({ status: "pending", error_message: null })
    .eq("status", "failed")
    .select();

  if (error) {
    console.error("Failed to retry emails:", error);
    return 0;
  }

  return data?.length || 0;
}

export default {
  EMAIL_CONFIG,
  sendEmailViaEdgeFunction,
  sendEmailDirect,
  processEmailQueue,
  getEmailQueueStats,
  retryFailedEmails,
};
