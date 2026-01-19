"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { getVisitors, exportToCSV, clearVisitors, seedDummyData, Visitor } from "@/lib/visitorStore";

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
                v.nip.toLowerCase().includes(searchQuery.toLowerCase());
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
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar */}
            <aside className="w-60 bg-white border-r border-slate-200 flex flex-col shrink-0">
                <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-100">
                    <Image src="/lontara.svg" alt="Lontara" width={28} height={28} />
                    <div>
                        <p className="text-sm font-semibold text-slate-800 leading-tight">Buku Tamu</p>
                        <p className="text-[11px] text-slate-400 leading-tight">Diskominfo Makassar</p>
                    </div>
                </div>
                <nav className="flex-1 p-3">
                    <p className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Menu</p>
                    <Link href="/admin" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg mb-1">
                        {Icons.grid}
                        <span>Dashboard</span>
                    </Link>
                    <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-lg">
                        {Icons.users}
                        <span>Pengunjung</span>
                    </a>
                </nav>
                <div className="p-3 border-t border-slate-100">
                    <Link href="/" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100 rounded-lg w-full">
                        {Icons.logout}
                        <span>Kembali</span>
                    </Link>
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 flex flex-col overflow-hidden">
                <header className="h-auto min-h-16 bg-white border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 py-3 gap-3 shrink-0">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800">Data Pengunjung</h2>
                        <div className="flex items-center gap-2">
                            <p className="text-xs text-slate-400">Kelola semua data kunjungan</p>
                            {lastUpdated && (
                                <span className="text-[10px] text-slate-300">• Update: {lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <button onClick={loadData} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50">
                            {Icons.refresh}
                            Refresh
                        </button>
                        <button onClick={handleSeedData} className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
                            Seed Data
                        </button>
                        <button onClick={handleClearData} className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
                            {Icons.trash}
                            Hapus
                        </button>
                        <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-teal-600 border border-teal-200 bg-teal-50 rounded-lg hover:bg-teal-100">
                            {Icons.download}
                            Export
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-auto p-6">
                    {/* Filters */}
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex items-center gap-4">
                            <div className="flex-1 relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{Icons.search}</div>
                                <input
                                    type="text"
                                    placeholder="Cari nama, instansi, atau NIP..."
                                    value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500"
                                />
                            </div>
                            <select value={provinsiFilter} onChange={(e) => { setProvinsiFilter(e.target.value); setCurrentPage(1); }} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
                                <option value="all">Semua Provinsi</option>
                                {provinsis.map((p) => <option key={p} value={p}>{p}</option>)}
                            </select>
                            <select value={dateFilter} onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
                                <option value="all">Semua Tanggal</option>
                                <option value="today">Hari Ini</option>
                                <option value="week">7 Hari Terakhir</option>
                            </select>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1200px]">
                                <thead>
                                    <tr className="bg-slate-50 text-left border-b border-slate-100">
                                        <th className="px-3 py-3 text-[10px] font-semibold text-slate-500 uppercase w-10">#</th>
                                        <th className="px-3 py-3 text-[10px] font-semibold text-slate-500 uppercase">Nama</th>
                                        <th className="px-3 py-3 text-[10px] font-semibold text-slate-500 uppercase">NIP</th>
                                        <th className="px-3 py-3 text-[10px] font-semibold text-slate-500 uppercase">Jabatan</th>
                                        <th className="px-3 py-3 text-[10px] font-semibold text-slate-500 uppercase">Instansi</th>
                                        <th className="px-3 py-3 text-[10px] font-semibold text-slate-500 uppercase">Asal</th>
                                        <th className="px-3 py-3 text-[10px] font-semibold text-slate-500 uppercase">Provinsi</th>
                                        <th className="px-3 py-3 text-[10px] font-semibold text-slate-500 uppercase">Keperluan</th>
                                        <th className="px-3 py-3 text-[10px] font-semibold text-slate-500 uppercase">No. Surat</th>
                                        <th className="px-3 py-3 text-[10px] font-semibold text-slate-500 uppercase">Tanggal</th>
                                        <th className="px-3 py-3 text-[10px] font-semibold text-slate-500 uppercase">Waktu</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {paginatedVisitors.length === 0 ? (
                                        <tr><td colSpan={11} className="px-4 py-16 text-center text-slate-400 text-sm">Tidak ada data</td></tr>
                                    ) : (
                                        paginatedVisitors.map((v, idx) => (
                                            <tr key={v.id} className="hover:bg-slate-50/50">
                                                <td className="px-3 py-2.5 text-xs text-slate-400">{(currentPage - 1) * perPage + idx + 1}</td>
                                                <td className="px-3 py-2.5 text-xs font-medium text-slate-800">{v.name}</td>
                                                <td className="px-3 py-2.5 text-xs text-slate-500 font-mono">{v.nip}</td>
                                                <td className="px-3 py-2.5 text-xs text-slate-600">{v.jabatan}</td>
                                                <td className="px-3 py-2.5 text-xs text-slate-600">{v.organization}</td>
                                                <td className="px-3 py-2.5 text-xs text-slate-600">{v.asalDaerah}</td>
                                                <td className="px-3 py-2.5 text-xs"><span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 font-medium rounded">{v.provinsi}</span></td>
                                                <td className="px-3 py-2.5 text-xs text-slate-600">{v.purpose}</td>
                                                <td className="px-3 py-2.5 text-xs text-slate-500">{v.nomorSurat}</td>
                                                <td className="px-3 py-2.5 text-xs text-slate-500">{v.date}</td>
                                                <td className="px-3 py-2.5 text-xs font-medium text-slate-700">{v.timestamp}</td>
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
                                            className={`w-8 h-8 text-xs font-medium rounded-lg ${currentPage === i + 1 ? "bg-teal-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
