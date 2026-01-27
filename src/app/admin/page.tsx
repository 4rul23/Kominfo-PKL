"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { getVisitors, getStats, exportToCSV, seedDummyData, Visitor } from "@/lib/visitorStore";

const ADMIN_PIN = "1234";

// SVG Icons
const Icons = {
    lock: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
    grid: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>,
    users: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
    download: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
    logout: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
    search: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
    trendUp: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>,
};

function formatNumber(n: number): string {
    return n.toLocaleString("id-ID");
}

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [pin, setPin] = useState("");
    const [pinError, setPinError] = useState(false);
    const [visitors, setVisitors] = useState<Visitor[]>([]);
    const [stats, setStats] = useState({
        today: 0, week: 0, month: 0, total: 0,
        peakHour: "-", topProvinsi: "-", avgPerDay: 0,
        provinsiCounts: {} as Record<string, number>,
        hourlyData: [] as number[],
    });
    const [searchQuery, setSearchQuery] = useState("");
    const [provinsiFilter, setProvinsiFilter] = useState("all");

    useEffect(() => {
        if (isAuthenticated) {
            loadData();
            // Auto-refresh every 30 seconds
            const interval = setInterval(loadData, 30000);
            return () => clearInterval(interval);
        }
    }, [isAuthenticated]);

    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const loadData = () => {
        setVisitors(getVisitors());
        setStats(getStats());
        setLastUpdated(new Date());
    };

    const handleSeedData = () => {
        seedDummyData();
        loadData();
    };

    const handlePinSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (pin === ADMIN_PIN) {
            setIsAuthenticated(true);
            setPinError(false);
        } else {
            setPinError(true);
            setPin("");
        }
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

    // PIN Login
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="w-full max-w-sm">
                    <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
                        <div className="flex items-center justify-center gap-3 mb-8">
                            <Image src="/lontara.svg" alt="Lontara" width={32} height={32} />
                            <span className="text-lg font-semibold text-slate-800">Diskominfo</span>
                        </div>
                        <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4 text-slate-500">
                            {Icons.lock}
                        </div>
                        <h1 className="text-lg font-semibold text-slate-800 text-center mb-1">Admin Panel</h1>
                        <p className="text-sm text-slate-500 text-center mb-6">Masukkan PIN untuk akses</p>

                        <form onSubmit={handlePinSubmit}>
                            <input
                                type="password"
                                maxLength={4}
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                                placeholder="••••"
                                autoFocus
                                className={`w-full text-center text-2xl tracking-[0.5em] py-3 border rounded-lg mb-3 font-mono ${pinError ? "border-red-300 bg-red-50" : "border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                                    } outline-none transition-all`}
                            />
                            {pinError && <p className="text-red-600 text-sm mb-3 text-center">PIN salah</p>}
                            <button type="submit" className="w-full py-3 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors">
                                Masuk
                            </button>
                        </form>
                        <Link href="/" className="block text-center text-sm text-slate-400 mt-6 hover:text-slate-600 transition-colors">
                            ← Kembali ke Beranda
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Dashboard
    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar */}
            <aside className="w-60 bg-white border-r border-slate-200 flex flex-col">
                <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-100">
                    <Image src="/lontara.svg" alt="Lontara" width={28} height={28} />
                    <div>
                        <p className="text-sm font-semibold text-slate-800 leading-tight">Buku Tamu</p>
                        <p className="text-[11px] text-slate-400 leading-tight">Diskominfo Makassar</p>
                    </div>
                </div>
                <nav className="flex-1 p-3">
                    <p className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Menu</p>
                    <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-lg mb-1">
                        {Icons.grid}
                        <span>Dashboard</span>
                    </a>
                    <Link href="/admin/visitors" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg mb-1">
                        {Icons.users}
                        <span>Pengunjung</span>
                    </Link>
                    <Link href="/admin/surat" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                        <span>Surat Elektronik</span>
                    </Link>
                </nav>
                <div className="p-3 border-t border-slate-100">
                    <button onClick={() => setIsAuthenticated(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100 rounded-lg w-full">
                        {Icons.logout}
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-auto min-h-16 bg-white border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 py-3 gap-3">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800">Dashboard</h2>
                        <div className="flex items-center gap-2">
                            <p className="text-xs text-slate-400">Ringkasan aktivitas pengunjung</p>
                            {lastUpdated && (
                                <span className="text-[10px] text-slate-300">• Update: {lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <button onClick={loadData} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
                            Refresh
                        </button>
                        <button onClick={handleSeedData} className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                            Seed Data
                        </button>
                        <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-teal-600 border border-teal-200 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors">
                            {Icons.download}
                            Export
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-6">
                    {/* Stats Row 1 - Primary Numbers */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
                        {[
                            { label: "Hari Ini", value: stats.today, accent: "bg-teal-500" },
                            { label: "Minggu Ini", value: stats.week, accent: "bg-blue-500" },
                            { label: "Bulan Ini", value: stats.month, accent: "bg-indigo-500" },
                            { label: "Total", value: stats.total, accent: "bg-slate-700" },
                            { label: "Rata-rata/Hari", value: stats.avgPerDay, accent: "bg-amber-500" },
                        ].map((s) => (
                            <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className={`w-2 h-2 rounded-full ${s.accent}`} />
                                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{s.label}</span>
                                </div>
                                <p className="text-3xl font-bold text-slate-800 tracking-tight">{formatNumber(s.value)}</p>
                            </div>
                        ))}
                    </div>

                    {/* Stats Row 2 - Charts & Breakdown */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                        {/* Hourly Chart */}
                        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 lg:col-span-2">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-sm font-semibold text-slate-700">Aktivitas Hari Ini</p>
                                    <p className="text-xs text-slate-400">Distribusi pengunjung per jam</p>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                                    {Icons.trendUp}
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
                                        <span className="text-[9px] text-slate-400">{7 + i}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Province Breakdown */}
                        <div className="bg-white border border-slate-200 rounded-xl p-5">
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
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex items-center gap-4">
                            <div className="flex-1 relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{Icons.search}</div>
                                <input
                                    type="text"
                                    placeholder="Cari nama atau instansi..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20"
                                />
                            </div>
                            <select
                                value={provinsiFilter}
                                onChange={(e) => setProvinsiFilter(e.target.value)}
                                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500"
                            >
                                <option value="all">Semua Provinsi</option>
                                {provinsis.map((prov) => (<option key={prov} value={prov}>{prov}</option>))}
                            </select>
                        </div>

                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 text-left border-b border-slate-100">
                                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide w-12">#</th>
                                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Nama</th>
                                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Instansi</th>
                                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Unit</th>
                                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Tanggal</th>
                                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Waktu</th>
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
                                            <td className="px-4 py-3 text-sm"><span className="inline-block px-2 py-0.5 bg-teal-50 text-teal-700 text-xs font-medium rounded">{v.unit}</span></td>
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
            </main>
        </div>
    );
}
