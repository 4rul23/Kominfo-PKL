"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getStaffSession } from "@/lib/staffSession";
import { clearAllForUser, getNotificationsForUser, markAllReadForUser, markNotificationRead, type WebNotification } from "@/lib/webNotificationStore";

const Icons = {
    refresh: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>,
    trash: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>,
};

export default function NotificationsPage() {
    const session = useMemo(() => getStaffSession(), []);
    const userId = session?.userId || "";

    const [list, setList] = useState<WebNotification[]>([]);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const load = () => {
        if (!userId) return;
        setList(getNotificationsForUser(userId));
        setLastUpdated(new Date());
    };

    useEffect(() => {
        load();
        const i = setInterval(load, 5000);
        return () => clearInterval(i);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    const unreadCount = list.filter((n) => !n.readAt).length;

    if (!userId) {
        return (
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
                <p className="text-sm font-bold text-slate-800">Belum login</p>
                <p className="text-sm text-slate-500 mt-1">Silakan login lewat `/admin`.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Notifikasi</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-slate-500">Daftar notifikasi web (dummy)</p>
                        {lastUpdated && (
                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Updated: {lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                        )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Unread: {unreadCount}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={load} className="flex items-center gap-1.5 px-4 py-3 text-xs font-bold text-[#505F79] bg-white border-2 border-gray-200 rounded-2xl hover:border-[#009FA9] hover:text-[#009FA9] transition-all shadow-sm">
                        {Icons.refresh}
                        Refresh
                    </button>
                    <button
                        onClick={() => { markAllReadForUser(userId); load(); }}
                        className="flex items-center gap-2 px-4 py-3 text-xs font-bold text-white bg-[#009FA9] rounded-2xl hover:shadow-xl hover:-translate-y-0.5 transition-all shadow-lg shadow-[#009FA9]/20"
                    >
                        Mark All Read
                    </button>
                    <button
                        onClick={() => {
                            if (!confirm("Hapus semua notifikasi?")) return;
                            clearAllForUser(userId);
                            load();
                        }}
                        className="flex items-center gap-2 px-4 py-3 text-xs font-bold text-[#991b1b] bg-white border-2 border-[#991b1b]/30 rounded-2xl hover:bg-[#991b1b]/10 transition-all shadow-sm"
                    >
                        {Icons.trash}
                        Hapus
                    </button>
                </div>
            </header>

            <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 text-left border-b border-slate-100">
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-40">Waktu</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Judul</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Isi</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {list.length === 0 ? (
                                <tr><td colSpan={5} className="px-4 py-16 text-center text-slate-400 text-sm">Tidak ada notifikasi</td></tr>
                            ) : (
                                list.map((n) => (
                                    <tr key={n.id} className="hover:bg-slate-50/50">
                                        <td className="px-4 py-3 text-sm text-slate-500 font-mono">{new Date(n.createdAt).toLocaleString("id-ID", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                                        <td className="px-4 py-3 text-sm font-semibold text-slate-800">{n.title}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600 whitespace-pre-wrap">{n.body}</td>
                                        <td className="px-4 py-3 text-sm">
                                            {!n.readAt ? (
                                                <span className="inline-block px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg border border-amber-200">unread</span>
                                            ) : (
                                                <span className="inline-block px-2 py-0.5 bg-slate-50 text-slate-500 text-xs font-bold rounded-lg border border-slate-200">read</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {n.link ? (
                                                    <Link
                                                        href={n.link}
                                                        className="inline-flex items-center justify-center px-3 py-2 text-xs font-bold text-white bg-[#009FA9] rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-sm"
                                                    >
                                                        Buka
                                                    </Link>
                                                ) : (
                                                    <span className="text-xs text-slate-400">-</span>
                                                )}
                                                {!n.readAt && (
                                                    <button
                                                        onClick={() => { markNotificationRead(n.id); load(); }}
                                                        className="inline-flex items-center justify-center px-3 py-2 text-xs font-bold text-[#505F79] bg-white border-2 border-gray-200 rounded-xl hover:border-[#009FA9] hover:text-[#009FA9] transition-all"
                                                    >
                                                        Read
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

