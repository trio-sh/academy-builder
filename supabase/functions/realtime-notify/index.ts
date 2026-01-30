// Supabase Edge Function for real-time notifications
// Triggers notifications via Supabase Realtime when events occur
// Deploy with: supabase functions deploy realtime-notify

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Notification event types
type NotificationEvent =
  | "observation_completed"
  | "endorsement_received"
  | "passport_issued"
  | "connection_request"
  | "connection_accepted"
  | "payment_shared"
  | "payment_verified"
  | "milestone_approved"
  | "project_application"
  | "mentor_assigned"
  | "training_completed"
  | "talentvisa_approved"
  | "talentvisa_rejected"
  | "message_received";

interface NotificationPayload {
  event: NotificationEvent;
  user_id: string;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  send_email?: boolean;
  priority?: "low" | "normal" | "high";
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role for admin access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: NotificationPayload = await req.json();
    const { event, user_id, title, message, metadata, send_email, priority } = payload;

    // Validate required fields
    if (!event || !user_id || !title || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: event, user_id, title, message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create notification in database
    const { data: notification, error: insertError } = await supabase
      .from("notifications")
      .insert({
        user_id,
        type: event,
        title,
        message,
        metadata: metadata || {},
        is_read: false,
        priority: priority || "normal",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting notification:", insertError);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Broadcast to Realtime channel for instant delivery
    // Client should subscribe to: supabase.channel(`notifications:${user_id}`)
    const channel = supabase.channel(`notifications:${user_id}`);
    await channel.send({
      type: "broadcast",
      event: "new_notification",
      payload: notification,
    });

    // If email should be sent, queue it
    if (send_email) {
      // Get user profile for email
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, first_name, last_name")
        .eq("id", user_id)
        .single();

      if (profile?.email) {
        // Map event to email template
        const templateMap: Record<NotificationEvent, string> = {
          observation_completed: "observation_completed",
          endorsement_received: "endorsement_received",
          passport_issued: "passport_issued",
          connection_request: "connection_request",
          connection_accepted: "connection_accepted",
          payment_shared: "payment_released",
          payment_verified: "payment_released",
          milestone_approved: "project_milestone",
          project_application: "project_milestone",
          mentor_assigned: "observation_completed",
          training_completed: "training_completed",
          talentvisa_approved: "talentvisa_approved",
          talentvisa_rejected: "talentvisa_rejected",
          message_received: "connection_request",
        };

        await supabase.from("email_queue").insert({
          to_email: profile.email,
          to_name: `${profile.first_name} ${profile.last_name}`,
          template: templateMap[event] || "welcome",
          template_data: {
            firstName: profile.first_name,
            title,
            message,
            ...metadata,
          },
          status: "pending",
        });
      }
    }

    // Update user's unread notification count (for badge display)
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user_id)
      .eq("is_read", false);

    // Broadcast updated count
    await channel.send({
      type: "broadcast",
      event: "notification_count",
      payload: { unread_count: count || 0 },
    });

    console.log(`Notification sent to user ${user_id}: ${event}`);

    return new Response(
      JSON.stringify({
        success: true,
        notification_id: notification.id,
        event,
        user_id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in realtime-notify:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
