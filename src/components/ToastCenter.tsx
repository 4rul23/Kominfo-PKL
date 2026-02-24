"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getNotificationsForUser, markNotificationRead, subscribeWebNotifications, type WebNotification } from "@/lib/webNotificationStore";
import { maybeDesktopNotify, playBeep } from "@/lib/webNotify";

type Toast = {
    id: string;
    title: string;
    body: string;
    link?: string;
    createdAt: string;
};

const SETTINGS_KEY = "diskominfo_web_notify_settings";

function readSettings(): { sound: boolean; desktop: boolean; largeText: boolean } {
    if (typeof window === "undefined") return { sound: true, desktop: false, largeText: true };
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { sound: true, desktop: false, largeText: true };
    try {
        const v = JSON.parse(raw);
        return {
            sound: v.sound !== false,
            desktop: v.desktop === true,
            largeText: v.largeText !== false,
        };
    } catch {
        return { sound: true, desktop: false, largeText: true };
    }
}

function writeSettings(next: { sound: boolean; desktop: boolean; largeText: boolean }) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
}

export default function ToastCenter({ userId }: { userId: string }) {
    const router = useRouter();
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [settings, setSettings] = useState(() => readSettings());

    const seenIds = useMemo(() => new Set<string>(), []);

    const pushToast = (n: WebNotification) => {
        if (n.toUserId !== userId) return;
        if (seenIds.has(n.id)) return;
        seenIds.add(n.id);

        const t: Toast = { id: n.id, title: n.title, body: n.body, link: n.link, createdAt: n.createdAt };
        setToasts((prev) => [t, ...prev].slice(0, 4));

        if (settings.sound) playBeep();
        if (settings.desktop) {
            maybeDesktopNotify(n.title, n.body, () => {
                if (n.link) router.push(n.link);
            });
        }
    };

    useEffect(() => {
        // Accessibility: big text mode for older staff (PNS)
        try {
            document.documentElement.classList.toggle("a11y-large", settings.largeText);
        } catch {
            // ignore
        }

        // On mount: show the latest unread as a soft reminder (max 1)
        const latestUnread = getNotificationsForUser(userId).find((n) => !n.readAt);
        if (latestUnread) pushToast(latestUnread);

        const unsub = subscribeWebNotifications((n) => pushToast(n));

        // Poll as a fallback for environments where BroadcastChannel fails.
        const interval = setInterval(() => {
            const unread = getNotificationsForUser(userId).filter((n) => !n.readAt);
            // show at most 1 per tick to avoid spam after reload
            if (unread[0]) pushToast(unread[0]);
        }, 4000);

        return () => {
            unsub();
            clearInterval(interval);
            try {
                // Avoid leaking admin text size to public pages after navigating away.
                document.documentElement.classList.remove("a11y-large");
            } catch {
                // ignore
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, settings.sound, settings.desktop, settings.largeText]);

    const toggleSound = () => {
        const next = { ...settings, sound: !settings.sound };
        setSettings(next);
        writeSettings(next);
    };

    const toggleDesktop = async () => {
        let granted = false;
        try {
            if ("Notification" in window) {
                if (Notification.permission === "granted") granted = true;
                else if (Notification.permission !== "denied") {
                    const p = await Notification.requestPermission();
                    granted = p === "granted";
                }
            }
        } catch {
            granted = false;
        }
        const next = { ...settings, desktop: granted ? !settings.desktop : false };
        setSettings(next);
        writeSettings(next);
    };

    const toggleLargeText = () => {
        const next = { ...settings, largeText: !settings.largeText };
        setSettings(next);
        writeSettings(next);
    };

    const dismiss = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        markNotificationRead(id);
    };

    if (!userId) return null;

    return (
        <div className="fixed top-4 right-4 z-[60] w-[360px] max-w-[calc(100vw-2rem)] space-y-3">
            <div className="flex items-center justify-end gap-2">
                <button
                    onClick={toggleLargeText}
                    className={`px-3 py-2 text-xs font-bold rounded-xl border-2 transition-all ${settings.largeText ? "bg-[#009FA9]/10 text-[#009FA9] border-[#009FA9]/30" : "bg-white text-[#505F79] border-gray-200 hover:border-[#009FA9]/30"}`}
                    title="Mode teks besar"
                >
                    Teks {settings.largeText ? "BESAR" : "Normal"}
                </button>
                <button
                    onClick={toggleSound}
                    className={`px-3 py-2 text-xs font-bold rounded-xl border-2 transition-all ${settings.sound ? "bg-[#009FA9]/10 text-[#009FA9] border-[#009FA9]/30" : "bg-white text-[#505F79] border-gray-200 hover:border-[#009FA9]/30"}`}
                    title="Toggle bunyi"
                >
                    Sound {settings.sound ? "ON" : "OFF"}
                </button>
                <button
                    onClick={toggleDesktop}
                    className={`px-3 py-2 text-xs font-bold rounded-xl border-2 transition-all ${settings.desktop ? "bg-[#009FA9]/10 text-[#009FA9] border-[#009FA9]/30" : "bg-white text-[#505F79] border-gray-200 hover:border-[#009FA9]/30"}`}
                    title="Desktop notification (butuh permission browser)"
                >
                    Desktop {settings.desktop ? "ON" : "OFF"}
                </button>
            </div>

            {toasts.map((t) => (
                <div key={t.id} className="bg-white border-2 border-gray-200 rounded-2xl p-4 shadow-xl shadow-slate-200/40">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{t.title}</p>
                            <p className="text-xs text-slate-500 mt-1 whitespace-pre-wrap">{t.body}</p>
                        </div>
                        <button onClick={() => dismiss(t.id)} className="text-slate-400 hover:text-slate-700 transition-colors" title="Dismiss">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>
                        </button>
                    </div>
                    {t.link && (
                        <div className="mt-3 flex justify-end">
                            <button
                                onClick={() => {
                                    dismiss(t.id);
                                    router.push(t.link!);
                                }}
                                className="px-4 py-2 text-xs font-bold text-white bg-[#009FA9] rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-sm"
                            >
                                Buka
                            </button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
