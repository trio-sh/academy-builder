/**
 * RPC + polling layer.
 *
 * Replaces Supabase Realtime channels and notification edge functions.
 * A single `poll_updates` RPC returns new notifications, new inbound messages
 * and unread counts in one round-trip, so the app needs one cheap request per
 * interval instead of a persistent websocket per surface.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";

export const DEFAULT_POLL_INTERVAL_MS = 15000;

export interface PolledNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  action_url: string | null;
  priority: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface PolledMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string | null;
  file_url: string | null;
  is_deleted: boolean;
  created_at: string;
}

export interface PollResult {
  server_time: string;
  notifications: PolledNotification[];
  messages: PolledMessage[];
  unread_notifications: number;
  unread_messages: number;
}

/** One-shot poll for everything new since `since`. */
export async function pollUpdates(since?: string | null): Promise<PollResult | null> {
  const { data, error } = await supabase.rpc("poll_updates", { since: since ?? null });
  if (error) {
    console.warn("poll_updates failed:", error.message);
    return null;
  }
  return data as PollResult;
}

interface UsePollingOptions {
  enabled?: boolean;
  intervalMs?: number;
  onUpdate?: (result: PollResult) => void;
}

/**
 * Polls `poll_updates` on an interval while the tab is visible.
 * Pauses when the tab is hidden so background tabs cost nothing.
 */
export function usePolling({
  enabled = true,
  intervalMs = DEFAULT_POLL_INTERVAL_MS,
  onUpdate,
}: UsePollingOptions = {}) {
  const [notifications, setNotifications] = useState<PolledNotification[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const sinceRef = useRef<string | null>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const poll = useCallback(async () => {
    const result = await pollUpdates(sinceRef.current);
    if (!result) return;

    setUnreadNotifications(result.unread_notifications ?? 0);
    setUnreadMessages(result.unread_messages ?? 0);

    if (result.notifications?.length) {
      setNotifications((prev) => {
        const seen = new Set(prev.map((n) => n.id));
        const fresh = result.notifications.filter((n) => !seen.has(n.id));
        return fresh.length ? [...fresh, ...prev].slice(0, 20) : prev;
      });
    }

    onUpdateRef.current?.(result);
    sinceRef.current = result.server_time;
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer) return;
      void poll();
      timer = setInterval(() => void poll(), intervalMs);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, intervalMs, poll]);

  return {
    notifications,
    setNotifications,
    unreadNotifications,
    unreadMessages,
    refresh: poll,
  };
}

/**
 * Polls the messages of a single conversation, appending any messages sent by
 * other participants. Replaces the per-conversation realtime channel.
 */
export function useConversationPolling(
  conversationId: string | null | undefined,
  currentUserId: string | null | undefined,
  onNewMessages: (messages: unknown[]) => void,
  intervalMs = 5000
) {
  const lastAtRef = useRef<string | null>(null);
  const onNewRef = useRef(onNewMessages);
  onNewRef.current = onNewMessages;

  useEffect(() => {
    lastAtRef.current = null;
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId || !currentUserId) return;
    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = async () => {
      let query = supabase
        .from("messages")
        .select("*, sender:profiles!messages_sender_id_fkey(id, first_name, last_name, avatar_url)")
        .eq("conversation_id", conversationId)
        .neq("sender_id", currentUserId)
        .order("created_at", { ascending: true })
        .limit(50);

      if (lastAtRef.current) query = query.gt("created_at", lastAtRef.current);

      const { data } = await query;
      if (data?.length) {
        lastAtRef.current = (data[data.length - 1] as { created_at: string }).created_at;
        onNewRef.current(data);
      } else if (!lastAtRef.current) {
        lastAtRef.current = new Date().toISOString();
      }
    };

    const start = () => {
      if (timer) return;
      void tick();
      timer = setInterval(() => void tick(), intervalMs);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [conversationId, currentUserId, intervalMs]);
}

/** Mark a single notification read via RPC. */
export async function markNotificationRead(id: string) {
  return supabase.rpc("mark_notification_read", { p_id: id });
}

/** Mark every notification read via RPC. */
export async function markAllNotificationsRead() {
  return supabase.rpc("mark_all_notifications_read");
}

/** Mark a conversation read via RPC. */
export async function markConversationRead(conversationId: string) {
  return supabase.rpc("mark_conversation_read", { p_conversation_id: conversationId });
}
