"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { getVisitors, getStats, exportToCSV, seedDummyData, Visitor } from "@/lib/visitorStore";

// SVG Icons
const PageIcons = {
    download: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
    search: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
    trendUp: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>,
};

function formatNumber(n: number): string {
    return n.toLocaleString("id-ID");
}

export default function AdminPage() {
    const [visitors, setVisitors] = useState<Visitor[]>([]);
    const [stats, setStats] = useState({
        today: 0, week: 0, month: 0, total: 0,
        peakHour: "-", topProvinsi: "-", avgPerDay: 0,
        provinsiCounts: {} as Record<string, number>,
        hourlyData: [] as number[],
    });
    const [searchQuery, setSearchQuery] = useState("");
    const [provinsiFilter, setProvinsiFilter] = useState("all");
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const loadData = () => {
        setVisitors(getVisitors());
        setStats(getStats());
        setLastUpdated(new Date());
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleSeedData = () => {
        seedDummyData();
        loadData();
    };



    const filteredVisitors = useMemo(() => {
        return visitors.filter((v) => {
            const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                v.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
                v.nip.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesProvinsi = provinsiFilter === "all" || v.provinsi === provinsiFilter;
            return matchesSearch && matchesProvinsi;
        });
    }, [visitors, searchQuery, provinsiFilter]);

    const provinsis = useMemo(() => [...new Set(visitors.map((v) => v.provinsi).filter(p => p && p !== "-"))], [visitors]);

    const handleExport = () => {
        const csv = exportToCSV();
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `visitors_${new Date().toISOString().split("T")[0]}.csv`;
        link.click();
    };

    // Hourly chart max value
    const maxHourly = Math.max(...stats.hourlyData, 1);

    return (
        <div className="space-y-6">
            {/* Header */}
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Dashboard Overview</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-slate-500">Ringkasan aktivitas dan statistik pengunjung</p>
                        {lastUpdated && (
                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Updated: {lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                        )}
                    </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={loadData} className="flex items-center gap-1.5 px-4 py-3 text-xs font-bold text-[#505F79] bg-white border-2 border-gray-200 rounded-2xl hover:border-[#009FA9] hover:text-[#009FA9] transition-all shadow-sm">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
                        Refresh
                    </button>
                    <button onClick={handleSeedData} className="flex items-center gap-2 px-4 py-3 text-xs font-bold text-[#505F79] bg-white border-2 border-gray-200 rounded-2xl hover:border-[#009FA9] hover:text-[#009FA9] transition-all shadow-sm">
                        Seed Data
                    </button>
                    <button onClick={handleExport} className="flex items-center gap-2 px-4 py-3 text-xs font-bold text-white bg-[#009FA9] rounded-2xl hover:shadow-xl hover:-translate-y-0.5 transition-all shadow-lg shadow-[#009FA9]/20">
                        {PageIcons.download}
                        Export .CSV
                    </button>
                </div>
            </header>


            {/* Stats Row 1 - Primary Numbers */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                {[
                    { label: "Hari Ini", value: stats.today, accent: "bg-[#009FA9]" },
                    { label: "Minggu Ini", value: stats.week, accent: "bg-blue-500" },
                    { label: "Bulan Ini", value: stats.month, accent: "bg-indigo-500" },
                    { label: "Total", value: stats.total, accent: "bg-slate-700" },
                    { label: "Rata-rata/Hari", value: stats.avgPerDay, accent: "bg-amber-500" },
                ].map((s) => (
                    <div key={s.label} className="bg-white border-2 border-gray-200 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <div className={`w-2 h-2 rounded-full ${s.accent}`} />
                            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{s.label}</span>
                        </div>
                        <p className="text-3xl font-bold text-slate-800 tracking-tight">{formatNumber(s.value)}</p>
                    </div>
                ))}
            </div>

            {/* Stats Row 2 - Charts & Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Hourly Chart */}
                <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 sm:p-5 lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-sm font-semibold text-slate-700">Aktivitas Hari Ini</p>
                            <p className="text-xs text-slate-400">Distribusi pengunjung per jam</p>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                            {PageIcons.trendUp}
                            Jam ramai: {stats.peakHour}
                        </div>
                    </div>
                    <div className="flex items-end gap-1 h-24">
                        {stats.hourlyData.slice(7, 18).map((count, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                <div
                                    className="w-full bg-teal-100 rounded-sm transition-all hover:bg-teal-200"
                                    style={{ height: `${(count / maxHourly) * 100}%`, minHeight: count > 0 ? "4px" : "2px" }}
                                />
                                <span className="text-[10px] text-slate-400">{7 + i}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Province Breakdown */}
                <div className="bg-white border-2 border-gray-200 rounded-2xl p-5">
                    <p className="text-sm font-semibold text-slate-700 mb-1">Asal Provinsi</p>
                    <p className="text-xs text-slate-400 mb-4">Top provinsi pengunjung</p>
                    <div className="space-y-3">
                        {Object.entries(stats.provinsiCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([prov, count]) => (
                            <div key={prov}>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="font-medium text-slate-600 truncate">{prov}</span>
                                    <span className="text-slate-400">{count}</span>
                                </div>
                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-teal-500 rounded-full" style={{ width: `${(count / stats.total) * 100}%` }} />
                                </div>
                            </div>
                        ))}
                        {Object.keys(stats.provinsiCounts).length === 0 && (
                            <p className="text-xs text-slate-400 text-center py-4">Belum ada data</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center gap-4">
                    <div className="flex-1 relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{PageIcons.search}</div>
                        <input
                            type="text"
                            placeholder="Cari nama, instansi, atau NIP/NIK..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#009FA9] focus:ring-1 focus:ring-[#009FA9]/20"
                        />
                    </div>
                    <select
                        value={provinsiFilter}
                        onChange={(e) => setProvinsiFilter(e.target.value)}
                        className="px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#009FA9]"
                    >
                        <option value="all">Semua Provinsi</option>
                        {provinsis.map((prov) => (<option key={prov} value={prov}>{prov}</option>))}
                    </select>
                </div>

                <table className="w-full">
                    <thead>
                        <tr className="bg-slate-50 text-left border-b border-slate-100">
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-12">#</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nama</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Instansi</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Unit</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tanggal</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Waktu</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredVisitors.length === 0 ? (
                            <tr><td colSpan={6} className="px-4 py-16 text-center text-slate-400 text-sm">Belum ada data pengunjung</td></tr>
                        ) : (
                            filteredVisitors.slice(0, 20).map((v, idx) => (
                                <tr key={v.id} className="hover:bg-slate-50/50">
                                    <td className="px-4 py-3 text-sm text-slate-400">{idx + 1}</td>
                                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{v.name}</td>
                                    <td className="px-4 py-3 text-sm text-slate-600">{v.organization}</td>
                                        <td className="px-4 py-3 text-sm"><span className="inline-block px-2 py-0.5 bg-[#009FA9]/10 text-[#009FA9] text-xs font-bold rounded-lg border border-[#009FA9]/20">{v.unit}</span></td>
                                    <td className="px-4 py-3 text-sm text-slate-500">{v.date}</td>
                                    <td className="px-4 py-3 text-sm font-medium text-slate-700">{v.timestamp}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
                    Menampilkan {Math.min(filteredVisitors.length, 20)} dari {visitors.length} pengunjung
                </div>
            </div>
        </div>
    );
}
