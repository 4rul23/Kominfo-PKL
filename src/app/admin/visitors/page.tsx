"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { getVisitors, exportToCSV, clearVisitors, seedDummyData, Visitor } from "@/lib/visitorStore";
import { getCaseByRelatedVisitorId } from "@/lib/caseStore";

// SVG Icons
const Icons = {
    grid: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>,
    users: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
    download: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
    logout: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
    search: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
    trash: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>,
    refresh: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>,
};

function caseBadge(status: string) {
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

export default function VisitorsPage() {
    const [visitors, setVisitors] = useState<Visitor[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [provinsiFilter, setProvinsiFilter] = useState("all");
    const [dateFilter, setDateFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const perPage = 10;

    const loadData = () => {
        setVisitors(getVisitors());
        setLastUpdated(new Date());
    };

    useEffect(() => {
        loadData();
        // Auto-refresh every 30 seconds
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
    }, []);

    const filteredVisitors = useMemo(() => {
        const today = new Date().toISOString().split("T")[0];
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

        return visitors.filter((v) => {
            const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                v.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
                v.nip.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (v.unit || "").toLowerCase().includes(searchQuery.toLowerCase());
            const matchesProvinsi = provinsiFilter === "all" || v.provinsi === provinsiFilter;

            let matchesDate = true;
            if (dateFilter === "today") matchesDate = v.date === today;
            else if (dateFilter === "week") matchesDate = v.date >= weekAgo;

            return matchesSearch && matchesProvinsi && matchesDate;
        });
    }, [visitors, searchQuery, provinsiFilter, dateFilter]);

    const provinsis = useMemo(() => [...new Set(visitors.map((v) => v.provinsi).filter(p => p && p !== "-"))], [visitors]);
    const totalPages = Math.ceil(filteredVisitors.length / perPage);
    const paginatedVisitors = filteredVisitors.slice((currentPage - 1) * perPage, currentPage * perPage);

    const handleExport = () => {
        const csv = exportToCSV();
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `visitors_${new Date().toISOString().split("T")[0]}.csv`;
        link.click();
    };

    const handleSeedData = () => {
        seedDummyData();
        loadData();
    };

    const handleClearData = () => {
        if (confirm("Hapus semua data pengunjung?")) {
            clearVisitors();
            loadData();
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Data Pengunjung</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-slate-500">Kelola semua data kunjungan buku tamu</p>
                        {lastUpdated && (
                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Updated: {lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                        )}
                    </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={loadData} className="flex items-center gap-1.5 px-4 py-3 text-xs font-bold text-[#505F79] bg-white border-2 border-gray-200 rounded-2xl hover:border-[#009FA9] hover:text-[#009FA9] transition-all shadow-sm">
                        {Icons.refresh}
                        Refresh
                    </button>
                    <button onClick={handleSeedData} className="flex items-center gap-2 px-4 py-3 text-xs font-bold text-[#505F79] bg-white border-2 border-gray-200 rounded-2xl hover:border-[#009FA9] hover:text-[#009FA9] transition-all shadow-sm">
                        Seed Data
                    </button>
                    <button onClick={handleClearData} className="flex items-center gap-2 px-4 py-3 text-xs font-bold text-[#991b1b] bg-white border-2 border-[#991b1b]/30 rounded-2xl hover:bg-[#991b1b]/10 transition-all shadow-sm">
                        {Icons.trash}
                        Hapus
                    </button>
                    <button onClick={handleExport} className="flex items-center gap-2 px-4 py-3 text-xs font-bold text-white bg-[#009FA9] rounded-2xl hover:shadow-xl hover:-translate-y-0.5 transition-all shadow-lg shadow-[#009FA9]/20">
                        {Icons.download}
                        Export
                    </button>
                </div>
            </header>


            {/* Filters */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center gap-4">
                    <div className="flex-1 relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{Icons.search}</div>
                        <input
                            type="text"
                            placeholder="Cari nama, instansi, atau NIP/NIK..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#009FA9] focus:ring-1 focus:ring-[#009FA9]/20"
                        />
                    </div>
                    <select value={provinsiFilter} onChange={(e) => { setProvinsiFilter(e.target.value); setCurrentPage(1); }} className="px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#009FA9]">
                        <option value="all">Semua Provinsi</option>
                        {provinsis.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <select value={dateFilter} onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }} className="px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#009FA9]">
                        <option value="all">Semua Tanggal</option>
                        <option value="today">Hari Ini</option>
                        <option value="week">7 Hari Terakhir</option>
                    </select>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 text-left border-b border-slate-100">
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-12">#</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nama</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Case</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">NIP/NIK</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Jabatan</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Instansi</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Unit Tujuan</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Provinsi</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Keperluan</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tanggal</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Waktu</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {paginatedVisitors.length === 0 ? (
                                <tr><td colSpan={11} className="px-4 py-16 text-center text-slate-400 text-sm">Tidak ada data</td></tr>
                            ) : (
                                paginatedVisitors.map((v, idx) => (
                                    <tr key={v.id} className="hover:bg-slate-50/50">
                                        <td className="px-4 py-3 text-sm text-slate-400">{(currentPage - 1) * perPage + idx + 1}</td>
                                        <td className="px-4 py-3 text-sm font-medium text-slate-800">{v.name}</td>
                                        <td className="px-4 py-3 text-sm">
                                            {(() => {
                                                const c = getCaseByRelatedVisitorId(v.id);
                                                if (!c) return <span className="text-xs text-slate-400">-</span>;
                                                return (
                                                    <Link href={`/admin/cases/${c.id}`} className={`inline-flex items-center px-2 py-0.5 text-xs font-bold rounded-lg border border-slate-200 ${caseBadge(c.status)}`}>
                                                        {c.status}
                                                    </Link>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-500 font-mono">{v.nip || "-"}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{v.jabatan || "-"}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{v.organization}</td>
                                        <td className="px-4 py-3 text-sm"><span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg border border-slate-200">{v.unit || "-"}</span></td>
                                        <td className="px-4 py-3 text-sm"><span className="inline-block px-2 py-0.5 bg-[#009FA9]/10 text-[#009FA9] text-xs font-bold rounded-lg border border-[#009FA9]/20">{v.provinsi || "-"}</span></td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{v.purpose}</td>
                                        <td className="px-4 py-3 text-sm text-slate-500">{v.date}</td>
                                        <td className="px-4 py-3 text-sm font-medium text-slate-700">{v.timestamp}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                        Menampilkan {paginatedVisitors.length} dari {filteredVisitors.length} pengunjung
                    </p>
                    {totalPages > 1 && (
                        <div className="flex gap-1">
                            {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentPage(i + 1)}
                                    className={`w-8 h-8 text-xs font-bold rounded-xl ${currentPage === i + 1 ? "bg-[#009FA9] text-white" : "text-[#505F79] hover:bg-slate-100"}`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
