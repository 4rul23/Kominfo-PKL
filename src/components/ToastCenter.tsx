"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getNotificationsForUser, markNotificationRead, subscribeWebNotifications, type WebNotification } from "@/lib/webNotificationStore";
import { maybeDesktopNotify } from "@/lib/webNotify";

type Toast = {
    id: string;
    title: string;
    body: string;
    link?: string;
    createdAt: string;
};

const SETTINGS_KEY = "diskominfo_web_notify_settings";

function readSettings(): { desktop: boolean } {
    if (typeof window === "undefined") return { desktop: false };
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { desktop: false };
    try {
        const v = JSON.parse(raw);
        return {
            desktop: v.desktop === true,
        };
    } catch {
        return { desktop: false };
    }
}

function writeSettings(next: { desktop: boolean }) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
}

export default function ToastCenter({ userId }: { userId: string }) {
    if (process.env.NEXT_PUBLIC_DISABLE_TOAST_CENTER === "true") return null;

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

        if (settings.desktop) {
            maybeDesktopNotify(n.title, n.body, () => {
                if (n.link) router.push(n.link);
            });
        }
    };

    useEffect(() => {
        try {
            document.documentElement.classList.add("a11y-large");
        } catch {
            return;
        }

        // On mount: show the latest unread as a soft reminder (max 1)
        const loadInitial = async () => {
            const list = await getNotificationsForUser(userId);
            const latestUnread = list.find((n) => !n.readAt);
            if (latestUnread) pushToast(latestUnread);
        };
        void loadInitial();

        const unsub = subscribeWebNotifications((n) => pushToast(n));

        // Poll as a fallback for environments where BroadcastChannel fails.
        const interval = setInterval(async () => {
            const unread = (await getNotificationsForUser(userId)).filter((n) => !n.readAt);
            if (unread[0]) pushToast(unread[0]);
        }, 4000);

        return () => {
            unsub();
            clearInterval(interval);
            try {
                document.documentElement.classList.remove("a11y-large");
            } catch {
                return;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, settings.desktop]);

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

    const dismiss = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        void markNotificationRead(id);
    };

    if (!userId) return null;

    return (
        <div className="pointer-events-none fixed top-4 right-4 z-[60] w-[360px] max-w-[calc(100vw-2rem)] space-y-3">
            {toasts.map((t) => (
                <div key={t.id} className="pointer-events-auto bg-white border-2 border-gray-200 rounded-2xl p-4 shadow-xl shadow-slate-200/40">
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

            <div className="pointer-events-auto fixed bottom-4 right-4 z-[61]">
                <button
                    onClick={toggleDesktop}
                    className={`group relative w-11 h-11 inline-flex items-center justify-center rounded-xl border-2 transition-all shadow-sm ${settings.desktop ? "bg-[#009FA9]/10 text-[#009FA9] border-[#009FA9]/30" : "bg-white text-[#505F79] border-gray-200 hover:border-[#009FA9]/30"}`}
                    title={settings.desktop ? "Desktop notification aktif" : "Desktop notification nonaktif"}
                    aria-label={settings.desktop ? "Matikan desktop notification" : "Aktifkan desktop notification"}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${settings.desktop ? "bg-emerald-500" : "bg-slate-300"}`} />
                    <span className="pointer-events-none absolute right-12 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                        Desktop {settings.desktop ? "ON" : "OFF"}
                    </span>
                </button>
            </div>
        </div>
    );
}
