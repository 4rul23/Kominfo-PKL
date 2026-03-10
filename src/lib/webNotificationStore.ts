"use client";

export type WebNotifType =
  | "task_assigned"
  | "status_update"
  | "escalation"
  | "note";

export interface WebNotification {
  id: string;
  toUserId: string;
  type: WebNotifType;
  title: string;
  body: string;
  link?: string;
  createdAt: string;
  readAt: string | null;
}

const CHANNEL_NAME = "diskominfo_web_notifications_channel";

type NotificationsResponse = {
  notifications?: WebNotification[];
  notification?: WebNotification;
  message?: string;
};

async function callNotificationsApi(init?: RequestInit, query?: string): Promise<NotificationsResponse> {
  const response = await fetch(`/api/notifications${query ? `?${query}` : ""}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const data = (await response.json().catch(() => ({}))) as NotificationsResponse;
  if (!response.ok) {
    throw new Error(data.message || "Gagal memproses notifikasi.");
  }
  return data;
}

export async function getNotificationsForUser(userId: string): Promise<WebNotification[]> {
  if (!userId) return [];
  const data = await callNotificationsApi(undefined, `userId=${encodeURIComponent(userId)}`);
  return Array.isArray(data.notifications) ? data.notifications : [];
}

export async function addWebNotification(input: Omit<WebNotification, "id" | "createdAt" | "readAt">): Promise<WebNotification> {
  const data = await callNotificationsApi({
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!data.notification) {
    throw new Error("Respons notifikasi tidak valid.");
  }

  try {
    const bc = new BroadcastChannel(CHANNEL_NAME);
    bc.postMessage({ type: "created", notification: data.notification });
    bc.close();
  } catch {
    return data.notification;
  }

  return data.notification;
}

export async function markNotificationRead(id: string): Promise<void> {
  await callNotificationsApi({ method: "PATCH", body: JSON.stringify({ id }) });
}

export async function markAllReadForUser(userId: string): Promise<void> {
  await callNotificationsApi({ method: "PATCH", body: JSON.stringify({ userId, markAllRead: true }) });
}

export async function clearAllForUser(userId: string): Promise<void> {
  await callNotificationsApi({ method: "PATCH", body: JSON.stringify({ userId, clearAll: true }) });
}

export function subscribeWebNotifications(onMessage: (n: WebNotification) => void): () => void {
  let bc: BroadcastChannel | null = null;
  try {
    bc = new BroadcastChannel(CHANNEL_NAME);
    bc.onmessage = (ev) => {
      const msg = ev.data;
      if (msg?.type === "created" && msg.notification) onMessage(msg.notification as WebNotification);
    };
  } catch {
    bc = null;
  }

  return () => {
    try {
      bc?.close();
    } catch {
      return;
    }
  };
}
