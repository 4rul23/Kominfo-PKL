"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getCases, hydrateCasesFromServer, syncCasesFromExistingData, type CaseItem } from "@/lib/caseStore";
import { fetchOrgDataFromServer, getOrgUnits } from "@/lib/orgUnitStore";

const Icons = {
    refresh: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>,
    inbox: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16v12H4z" /><path d="M22 16H2" /><path d="M8 20h8" /></svg>,
};

function shortId(id: string) {
    return id.split("-")[0].toUpperCase();
}

function statusBadge(status: string) {
    const map: Record<string, string> = {
        new: "bg-slate-100 text-slate-600",
        triaged: "bg-blue-50 text-blue-700",
        assigned: "bg-amber-50 text-amber-700",
        acknowledged: "bg-indigo-50 text-indigo-700",
        in_progress: "bg-amber-50 text-amber-700",
        escalated: "bg-red-50 text-red-700",
        closed: "bg-emerald-50 text-emerald-700",
        cancelled: "bg-slate-50 text-slate-400",
    };
    return map[status] || "bg-slate-100 text-slate-600";
}

export default function IntakePage() {
    const [isLoading, setIsLoading] = useState(true);
    const [cases, setCases] = useState<CaseItem[]>([]);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [syncInfo, setSyncInfo] = useState<{ visitors: number; surat: number } | null>(null);
    const [orgUnits, setOrgUnits] = useState(() => getOrgUnits());
    const [queueLimit, setQueueLimit] = useState(20);
    const [activeLimit, setActiveLimit] = useState(20);

    const load = () => {
        setCases(getCases());
        setLastUpdated(new Date());
    };

    useEffect(() => {
        const boot = async () => {
            const orgData = await fetchOrgDataFromServer();
            setOrgUnits(orgData.units);
            await hydrateCasesFromServer();
            const info = await syncCasesFromExistingData();
            setSyncInfo(info.visitors || info.surat ? info : null);
            load();
            setIsLoading(false);
        };
        void boot();
        const i = setInterval(() => {
            void hydrateCasesFromServer().then(() => {
                const refreshed = getCases();
                setCases(prev => {
                    if (prev.length !== refreshed.length) return refreshed;
                    const changed = refreshed.some((c, idx) => c.status !== prev[idx]?.status || c.updatedAt !== prev[idx]?.updatedAt);
                    return changed ? refreshed : prev;
                });
                setLastUpdated(new Date());
            });
        }, 10000);
        return () => clearInterval(i);
    }, []);

    const queue = useMemo(() => cases.filter((c) => ["new", "triaged"].includes(c.status)), [cases]);
    const active = useMemo(() => cases.filter((c) => ["assigned", "acknowledged", "in_progress", "escalated"].includes(c.status)), [cases]);

    const orgLabel = (id: string | null) => {
        if (!id) return "-";
        return orgUnits.find((u) => u.id === id)?.name || id;
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Ruang Tugas Lobi (Intake)</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-slate-500">Antrian masuk untuk resepsionis / pelayanan administrasi terpadu</p>
                        {lastUpdated && (
                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Updated: {lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                        )}
                    </div>
                    {syncInfo && (
                        <p className="text-xs text-slate-400 mt-1">Sync initial: +{syncInfo.visitors} visitor, +{syncInfo.surat} surat</p>
                    )}
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={load} className="flex items-center gap-1.5 px-4 py-3 text-xs font-bold text-[#505F79] bg-white border-2 border-gray-200 rounded-2xl hover:border-[#009FA9] hover:text-[#009FA9] transition-all shadow-sm">
                        {Icons.refresh}
                        Refresh
                    </button>
                    <button
                        onClick={async () => {
                            const info = await syncCasesFromExistingData();
                            setSyncInfo(info);
                            load();
                        }}
                        className="flex items-center gap-2 px-4 py-3 text-xs font-bold text-white bg-[#009FA9] rounded-2xl hover:shadow-xl hover:-translate-y-0.5 transition-all shadow-lg shadow-[#009FA9]/20"
                    >
                        {Icons.inbox}
                        Sync Data
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-slate-100">
                        <p className="text-sm font-bold text-slate-800">Antrian Baru</p>
                        <p className="text-xs text-slate-400 mt-1">Lobi/Resepsionis</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 text-left border-b border-slate-100">
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">No Tiket</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Jenis</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tujuan</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Bidang/Sub</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {isLoading ? (
                                    <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-sm">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="w-6 h-6 border-2 border-[#009FA9] border-t-transparent rounded-full animate-spin"></div>
                                            <p>Memuat antrian...</p>
                                        </div>
                                    </td></tr>
                                ) : queue.length === 0 ? (
                                    <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-sm">Tidak ada antrian</td></tr>
                                ) : (
                                    queue.slice(0, queueLimit).map((c) => (
                                        <tr key={c.id} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3 text-sm font-mono text-slate-600">{shortId(c.id)}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{c.caseType}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{c.unitTujuan === "UPT_WARROOM" ? "UPT Warroom" : "Diskominfo"}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{orgLabel(c.orgUnitId)}</td>
                                            <td className="px-4 py-3 text-sm">
                                                <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded-lg border border-slate-200 ${statusBadge(c.status)}`}>
                                                    {c.status}
                                                </span>
                                            </td>
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
                    {queue.length > queueLimit && (
                        <div className="px-4 py-3 border-t border-slate-100 flex justify-center">
                            <button onClick={() => setQueueLimit(queueLimit + 20)} className="text-sm font-semibold text-[#009FA9] hover:underline">
                                Tampilkan Lebih Banyak ({queue.length - queueLimit} tersisa)
                            </button>
                        </div>
                    )}
                    <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
                        Menampilkan {Math.min(queue.length, queueLimit)} dari {queue.length} antrian
                    </div>
                </div>

                <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-slate-100">
                        <p className="text-sm font-bold text-slate-800">Menunggu Respon Bidang</p>
                        <p className="text-xs text-slate-400 mt-1">Pekerjaan ditugaskan ke operator ruang dalam</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 text-left border-b border-slate-100">
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">No Tiket</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tujuan</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Bidang/Sub</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {isLoading ? (
                                    <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400 text-sm">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="w-6 h-6 border-2 border-[#009FA9] border-t-transparent rounded-full animate-spin"></div>
                                            <p>Memuat data aktif...</p>
                                        </div>
                                    </td></tr>
                                ) : active.length === 0 ? (
                                    <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400 text-sm">Belum ada proses aktif</td></tr>
                                ) : (
                                    active.slice(0, activeLimit).map((c) => (
                                        <tr key={c.id} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3 text-sm font-mono text-slate-600">{shortId(c.id)}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600 max-w-[240px] truncate">{c.subject}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{orgLabel(c.orgUnitId)}</td>
                                            <td className="px-4 py-3 text-sm">
                                                <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded-lg border border-slate-200 ${statusBadge(c.status)}`}>
                                                    {c.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Link href={`/admin/cases/${c.id}`} className="inline-flex items-center justify-center px-3 py-2 text-xs font-bold text-white bg-[#009FA9] rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-sm">
                                                    Detail
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {active.length > activeLimit && (
                        <div className="px-4 py-3 border-t border-slate-100 flex justify-center">
                            <button onClick={() => setActiveLimit(activeLimit + 20)} className="text-sm font-semibold text-[#009FA9] hover:underline">
                                Tampilkan Lebih Banyak ({active.length - activeLimit} tersisa)
                            </button>
                        </div>
                    )}
                    <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
                        Menampilkan {Math.min(active.length, activeLimit)} dari {active.length} aktif
                    </div>
                </div>
            </div>
        </div>
    );
}
