import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Hook to track unread message count across all conversations for sidebar badge.
 * Subscribes to real-time INSERT on messages table to update count live.
 */
export function useUnreadMessageCount(userId: string | undefined) {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!userId) return;

    // Get all conversations this user participates in, with their last_read_at
    const { data: participants } = await supabase
      .from("conversation_participants")
      .select("conversation_id, last_read_at")
      .eq("user_id", userId);

    if (!participants || participants.length === 0) {
      setUnreadCount(0);
      return;
    }

    // Count messages newer than last_read_at in each conversation, not sent by this user
    let total = 0;
    for (const p of participants) {
      const query = supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", p.conversation_id)
        .neq("sender_id", userId);

      if (p.last_read_at) {
        query.gt("created_at", p.last_read_at);
      }

      const { count } = await query;
      total += count || 0;
    }

    setUnreadCount(total);
  }, [userId]);

  useEffect(() => {
    fetchUnreadCount();

    if (!userId) return;

    // Poll the unread count instead of holding a realtime channel open
    const timer = setInterval(() => {
      if (!document.hidden) void fetchUnreadCount();
    }, 15000);

    return () => clearInterval(timer);
  }, [userId, fetchUnreadCount]);

  // Allow manual refresh (e.g., when user opens messages page)
  return { unreadCount, refreshUnreadCount: fetchUnreadCount };
}

/**
 * Hook to update user's last_seen timestamp for online/offline presence.
 * Updates every 60 seconds while active, and on mount.
 *
 * Resilient to missing schema: if `profiles.last_seen` doesn't exist yet
 * (fresh env, migration pending), the presence update is disabled for the
 * rest of the session instead of spamming PGRST204 errors on every tick.
 */
let presenceDisabled = false;

export function usePresence(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    const updateLastSeen = async () => {
      if (presenceDisabled) return;
      const { error } = await supabase
        .from("profiles")
        .update({ last_seen: new Date().toISOString() })
        .eq("id", userId);

      if (!error) return;

      // Column missing → disable for the rest of the session.
      // PGRST204: PostgREST schema-cache miss (column not in cache / not created).
      // 42703:    Postgres "undefined column".
      const code = (error as { code?: string }).code;
      if (code === "PGRST204" || code === "42703") {
        presenceDisabled = true;
        console.warn(
          "[usePresence] profiles.last_seen is not available — presence disabled for this session. Run the latest migration to enable it."
        );
        return;
      }

      // Any other error: log once, keep trying (transient network / RLS issue).
      console.warn("[usePresence] last_seen update failed:", error);
    };

    updateLastSeen();
    const interval = setInterval(updateLastSeen, 60000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        updateLastSeen();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [userId]);
}

/**
 * Check if a user is online (seen within last 2 minutes).
 */
export function isUserOnline(lastSeen: string | null | undefined): boolean {
  if (!lastSeen) return false;
  const diff = Date.now() - new Date(lastSeen).getTime();
  return diff < 2 * 60 * 1000; // 2 minutes
}

/**
 * Send a notification to the recipient when a message is sent.
 */
export async function sendMessageNotification(
  senderId: string,
  senderName: string,
  recipientId: string,
  messagePreview: string,
  conversationId: string
) {
  try {
    await supabase.from("notifications").insert({
      user_id: recipientId,
      type: "message",
      title: `New message from ${senderName}`,
      message: messagePreview.substring(0, 150),
      is_read: false,
      action_url: `/dashboard/*/messages`,
      metadata: { conversation_id: conversationId, sender_id: senderId },
    });
  } catch (error) {
    console.error("Error sending message notification:", error);
  }
}
