"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getCases, type CaseItem } from "@/lib/caseStore";
import { getStaffSession } from "@/lib/staffSession";

const Icons = {
    refresh: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>,
};

function shortId(id: string) {
    return id.split("-")[0].toUpperCase();
}

function statusBadge(status: string) {
    const map: Record<string, string> = {
        assigned: "bg-amber-50 text-amber-700",
        acknowledged: "bg-indigo-50 text-indigo-700",
        in_progress: "bg-amber-50 text-amber-700",
        escalated: "bg-red-50 text-red-700",
        closed: "bg-emerald-50 text-emerald-700",
        cancelled: "bg-slate-50 text-slate-400",
    };
    return map[status] || "bg-slate-100 text-slate-600";
}

export default function InboxPage() {
    const [cases, setCases] = useState<CaseItem[]>([]);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const session = useMemo(() => getStaffSession(), []);
    const userId = session?.userId || null;

    const load = () => {
        setCases(getCases());
        setLastUpdated(new Date());
    };

    useEffect(() => {
        load();
        const i = setInterval(load, 30000);
        return () => clearInterval(i);
    }, []);

    const assigned = useMemo(() => {
        if (!userId) return [];
        return cases
            .filter((c) => c.assignedToUserId === userId && !["closed", "cancelled"].includes(c.status))
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }, [cases, userId]);

    return (
        <div className="space-y-6">
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Inbox Operator</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-slate-500">Tugas yang ditugaskan ke akun kamu</p>
                        {lastUpdated && (
                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Updated: {lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                        )}
                    </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={load} className="flex items-center gap-1.5 px-4 py-3 text-xs font-bold text-[#505F79] bg-white border-2 border-gray-200 rounded-2xl hover:border-[#009FA9] hover:text-[#009FA9] transition-all shadow-sm">
                        {Icons.refresh}
                        Refresh
                    </button>
                </div>
            </header>

            <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 text-left border-b border-slate-100">
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Case</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Jenis</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Judul</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Updated</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {assigned.length === 0 ? (
                                <tr><td colSpan={6} className="px-4 py-16 text-center text-slate-400 text-sm">Tidak ada tugas</td></tr>
                            ) : (
                                assigned.map((c) => (
                                    <tr key={c.id} className="hover:bg-slate-50/50">
                                        <td className="px-4 py-3 text-sm font-mono text-slate-600">{shortId(c.id)}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{c.caseType}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600 max-w-[360px] truncate">{c.subject}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded-lg border border-slate-200 ${statusBadge(c.status)}`}>
                                                {c.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-500 font-mono">{new Date(c.updatedAt).toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}</td>
                                        <td className="px-4 py-3">
                                            <Link href={`/admin/cases/${c.id}`} className="inline-flex items-center justify-center px-3 py-2 text-xs font-bold text-white bg-[#009FA9] rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-sm">
                                                Buka
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
                    Menampilkan {assigned.length} tugas
                </div>
            </div>
        </div>
    );
}

