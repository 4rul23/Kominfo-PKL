"use client";

export type WebNotifType =
    | "task_assigned"
    | "status_update"
    | "escalation"
    | "note";

export interface WebNotification {
    id: string;
    toUserId: string; // staff user id
    type: WebNotifType;
    title: string;
    body: string;
    link?: string;
    createdAt: string; // ISO
    readAt: string | null;
}

const STORAGE_KEY = "diskominfo_web_notifications";
const CHANNEL_NAME = "diskominfo_web_notifications_channel";

function readAll(): WebNotification[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
}

function writeAll(list: WebNotification[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function getNotificationsForUser(userId: string): WebNotification[] {
    if (typeof window === "undefined") return [];
    return readAll()
        .filter((n) => n.toUserId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function addWebNotification(input: Omit<WebNotification, "id" | "createdAt" | "readAt">): WebNotification {
    const n: WebNotification = {
        ...input,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        readAt: null,
    };
    const list = readAll();
    list.unshift(n);
    writeAll(list);

    // Broadcast to other tabs in same browser profile.
    try {
        const bc = new BroadcastChannel(CHANNEL_NAME);
        bc.postMessage({ type: "created", notification: n });
        bc.close();
    } catch {
        // ignore
    }
    return n;
}

export function markNotificationRead(id: string): void {
    const list = readAll();
    const idx = list.findIndex((n) => n.id === id);
    if (idx < 0) return;
    list[idx].readAt = new Date().toISOString();
    writeAll(list);
}

export function markAllReadForUser(userId: string): void {
    const list = readAll();
    const now = new Date().toISOString();
    let changed = false;
    for (const n of list) {
        if (n.toUserId === userId && !n.readAt) {
            n.readAt = now;
            changed = true;
        }
    }
    if (changed) writeAll(list);
}

export function clearAllForUser(userId: string): void {
    const next = readAll().filter((n) => n.toUserId !== userId);
    writeAll(next);
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

    // Also listen to storage events as a fallback (works across tabs too).
    const onStorage = (e: StorageEvent) => {
        if (e.key !== STORAGE_KEY) return;
        // We can't easily diff; just noop here. ToastCenter will poll on interval if needed.
    };
    window.addEventListener("storage", onStorage);

    return () => {
        window.removeEventListener("storage", onStorage);
        try { bc?.close(); } catch { /* ignore */ }
    };
}

