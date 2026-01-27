"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { getSuratList, getSuratStats, updateSuratStatus, exportSuratToCSV, seedDummySurat, SuratElektronik, getOverdueSurat, getUnitStats, getHourlyStats, assignDisposisi, Prioritas, Disposisi } from "@/lib/suratStore";

const ADMIN_PIN = "1234";

// SVG Icons
const Icons = {
    lock: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
    grid: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>,
    users: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
    mail: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>,
    download: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
    logout: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
    search: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
    eye: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
    check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>,
    archive: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" /><line x1="10" y1="12" x2="14" y2="12" /></svg>,
    paperclip: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>,
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
    submitted: { label: "Terkirim", color: "bg-blue-100 text-blue-700", icon: "📤" },
    received: { label: "Diterima", color: "bg-purple-100 text-purple-700", icon: "📥" },
    processing: { label: "Diproses", color: "bg-amber-100 text-amber-700", icon: "⏳" },
    completed: { label: "Selesai", color: "bg-emerald-100 text-emerald-700", icon: "✅" },
    archived: { label: "Arsip", color: "bg-slate-100 text-slate-500", icon: "📁" },
};

const PRIORITAS_CONFIG: Record<Prioritas, { label: string; color: string; dot: string }> = {
    tinggi: { label: "Tinggi", color: "bg-red-100 text-red-700", dot: "bg-red-500" },
    normal: { label: "Normal", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
    rendah: { label: "Rendah", color: "bg-gray-100 text-gray-600", dot: "bg-gray-400" },
};

const STAFF_OPTIONS = [
    "Kepala Bidang IKP",
    "Kepala Bidang Aptika",
    "Kepala Bidang Statistik",
    "Kepala Bidang E-Government",
    "Kepala Sekretariat",
    "Staff Administrasi",
];

const INSTRUKSI_OPTIONS = [
    "Untuk diketahui",
    "Untuk ditindaklanjuti",
    "Untuk dikoordinasikan",
    "Untuk dipelajari dan dilaporkan",
    "Untuk diarsipkan",
];

const STATUS_ORDER: SuratElektronik["status"][] = ["submitted", "received", "processing", "completed", "archived"];

// Helper to calculate SLA remaining time
function getSlaInfo(slaDeadline: string): { text: string; isOverdue: boolean; urgency: string } {
    const now = new Date();
    const deadline = new Date(slaDeadline);
    const diffMs = deadline.getTime() - now.getTime();

    if (diffMs <= 0) {
        const hoursOverdue = Math.abs(Math.floor(diffMs / (1000 * 60 * 60)));
        return { text: `+${hoursOverdue}j`, isOverdue: true, urgency: "overdue" };
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return { text: `${days}h`, isOverdue: false, urgency: days <= 1 ? "warning" : "safe" };
    }
    return { text: `${hours}j`, isOverdue: false, urgency: hours <= 8 ? "warning" : "safe" };
}

export default function AdminSuratPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [pin, setPin] = useState("");
    const [pinError, setPinError] = useState(false);
    const [suratList, setSuratList] = useState<SuratElektronik[]>([]);
    const [stats, setStats] = useState({
        today: 0, week: 0, total: 0, overdue: 0,
        statusCounts: { submitted: 0, received: 0, processing: 0, completed: 0, archived: 0 },
        unitCounts: {} as Record<string, number>,
        hourlyData: [] as number[],
        unitStats: [] as { unit: string; count: number; percentage: number }[],
    });
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [priorityFilter, setPriorityFilter] = useState("all");
    const [selectedSurat, setSelectedSurat] = useState<SuratElektronik | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [statusNote, setStatusNote] = useState("");

    // Disposisi State
    const [isDisposisiModalOpen, setIsDisposisiModalOpen] = useState(false);
    const [disposisiForm, setDisposisiForm] = useState({
        assignedTo: STAFF_OPTIONS[0],
        instruksi: [] as string[],
        catatan: "",
    });

    useEffect(() => {
        const authStatus = sessionStorage.getItem("admin_auth");
        if (authStatus === "true") setIsAuthenticated(true);
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            loadData();
            const interval = setInterval(loadData, 30000);
            return () => clearInterval(interval);
        }
    }, [isAuthenticated]);

    const loadData = () => {
        setSuratList(getSuratList());
        const baseStats = getSuratStats();
        setStats({
            ...baseStats,
            overdue: getOverdueSurat().length,
            hourlyData: getHourlyStats(),
            unitStats: getUnitStats(),
        });
        setLastUpdated(new Date());
    };

    const handleSeedData = () => { seedDummySurat(); loadData(); };

    const handlePinSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (pin === ADMIN_PIN) {
            setIsAuthenticated(true);
            sessionStorage.setItem("admin_auth", "true");
            setPinError(false);
        } else {
            setPinError(true);
            setPin("");
        }
    };

    const handleStatusChange = (id: string, newStatus: SuratElektronik["status"], note?: string) => {
        updateSuratStatus(id, newStatus, note);
        loadData();
        if (selectedSurat?.id === id) {
            const updated = getSuratList().find(s => s.id === id);
            if (updated) setSelectedSurat(updated);
        }
        setStatusNote("");
    };

    const getNextStatus = (current: SuratElektronik["status"]): SuratElektronik["status"] | null => {
        const currentIndex = STATUS_ORDER.indexOf(current);
        if (currentIndex < STATUS_ORDER.length - 1) return STATUS_ORDER[currentIndex + 1];
        return null;
    };

    const filteredSurat = useMemo(() => {
        return suratList.filter((s) => {
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch = s.namaPengirim.toLowerCase().includes(searchLower) ||
                s.perihal.toLowerCase().includes(searchLower) ||
                s.nomorSurat.toLowerCase().includes(searchLower) ||
                s.trackingId?.toLowerCase().includes(searchLower) ||
                s.instansiPengirim.toLowerCase().includes(searchLower);
            const matchesStatus = statusFilter === "all" || s.status === statusFilter;
            const matchesPriority = priorityFilter === "all" || (s.prioritas || "normal") === priorityFilter;
            return matchesSearch && matchesStatus && matchesPriority;
        });
    }, [suratList, searchQuery, statusFilter, priorityFilter]);

    const openDisposisiModal = (surat: SuratElektronik) => {
        setSelectedSurat(surat);
        setIsDisposisiModalOpen(true);
        // Reset form or load existing disposisi
        if (surat.disposisi) {
            setDisposisiForm({
                assignedTo: surat.disposisi.assignedTo,
                instruksi: surat.disposisi.instruksi,
                catatan: surat.disposisi.catatan
            });
        } else {
            setDisposisiForm({
                assignedTo: STAFF_OPTIONS[0],
                instruksi: [],
                catatan: ""
            });
        }
    };

    const handleDisposisiSubmit = () => {
        if (!selectedSurat) return;
        assignDisposisi(selectedSurat.id, {
            ...disposisiForm,
            disposisiOleh: "Admin" // Should come from logged in user ideally
        });
        loadData();
        setIsDisposisiModalOpen(false);
        // Refresh selected surat if open
        const updated = getSuratList().find(s => s.id === selectedSurat.id);
        if (updated) setSelectedSurat(updated);
    };

    const toggleInstruksi = (instruksi: string) => {
        setDisposisiForm(prev => {
            const exists = prev.instruksi.includes(instruksi);
            return {
                ...prev,
                instruksi: exists
                    ? prev.instruksi.filter(i => i !== instruksi)
                    : [...prev.instruksi, instruksi]
            };
        });
    };

    const handleExport = () => {
        const csv = exportSuratToCSV();
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `surat_elektronik_${new Date().toISOString().split("T")[0]}.csv`;
        link.click();
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    const downloadAttachment = (attachment: { filename: string; data: string }) => {
        const link = document.createElement("a");
        link.href = attachment.data;
        link.download = attachment.filename;
        link.click();
    };

    const formatDateTime = (isoStr: string) => {
        const date = new Date(isoStr);
        return date.toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    };

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
                        <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4 text-slate-500">{Icons.lock}</div>
                        <h1 className="text-lg font-semibold text-slate-800 text-center mb-1">Admin Panel</h1>
                        <p className="text-sm text-slate-500 text-center mb-6">Masukkan PIN untuk akses</p>
                        <form onSubmit={handlePinSubmit}>
                            <input type="password" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} placeholder="••••" autoFocus className={`w-full text-center text-2xl tracking-[0.5em] py-3 border rounded-lg mb-3 font-mono ${pinError ? "border-red-300 bg-red-50" : "border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"} outline-none transition-all`} />
                            {pinError && <p className="text-red-600 text-sm mb-3 text-center">PIN salah</p>}
                            <button type="submit" className="w-full py-3 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors">Masuk</button>
                        </form>
                        <Link href="/" className="block text-center text-sm text-slate-400 mt-6 hover:text-slate-600 transition-colors">← Kembali ke Beranda</Link>
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
                    <Link href="/admin" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg mb-1">{Icons.grid}<span>Dashboard</span></Link>
                    <Link href="/admin/visitors" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg mb-1">{Icons.users}<span>Pengunjung</span></Link>
                    <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-lg">{Icons.mail}<span>Surat Elektronik</span></a>
                </nav>
                <div className="p-3 border-t border-slate-100">
                    <button onClick={() => { setIsAuthenticated(false); sessionStorage.removeItem("admin_auth"); }} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100 rounded-lg w-full">{Icons.logout}<span>Logout</span></button>
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-auto min-h-16 bg-white border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 py-3 gap-3">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800">Surat Elektronik</h2>
                        <div className="flex items-center gap-2">
                            <p className="text-xs text-slate-400">Kelola surat masuk elektronik</p>
                            {lastUpdated && <span className="text-[10px] text-slate-300">• Update: {lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>}
                        </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <button onClick={loadData} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
                            Refresh
                        </button>
                        <button onClick={handleSeedData} className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Seed Data</button>
                        <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-teal-600 border border-teal-200 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors">{Icons.download}Export</button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-6">
                    {/* Stats Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
                        {[
                            { label: "Baru", value: stats.statusCounts.submitted, accent: "bg-blue-500", icon: Icons.mail },
                            { label: "Diproses", value: stats.statusCounts.processing + stats.statusCounts.received, accent: "bg-amber-500", icon: Icons.eye },
                            { label: "Selesai", value: stats.statusCounts.completed, accent: "bg-emerald-500", icon: Icons.check },
                            { label: "Arsip", value: stats.statusCounts.archived, accent: "bg-slate-500", icon: Icons.archive },
                            { label: "Tertunda", value: stats.overdue, accent: "bg-red-500", icon: Icons.lock }, // Using lock as warning icon substitute
                            { label: "Total", value: stats.total, accent: "bg-slate-800", icon: Icons.grid },
                        ].map((s) => (
                            <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`w-2 h-2 rounded-full ${s.accent}`} />
                                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{s.label}</span>
                                </div>
                                <div className="flex items-end justify-between">
                                    <p className="text-2xl font-bold text-slate-800 tracking-tight">{s.value}</p>
                                    <div className={`p-1.5 rounded-lg ${s.accent} bg-opacity-10 text-opacity-100`}>
                                        <div className={`w-4 h-4 ${s.accent.replace("bg-", "text-")}`}>
                                            {s.icon}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                        {/* Unit Distribution */}
                        <div className="bg-white border border-slate-200 rounded-xl p-5">
                            <h3 className="text-sm font-semibold text-slate-800 mb-1">Distribusi per Bidang</h3>
                            <p className="text-xs text-slate-400 mb-4">Jumlah surat berdasarkan unit tujuan</p>
                            <div className="space-y-3">
                                {stats.unitStats.map((item) => (
                                    <div key={item.unit}>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="font-medium text-slate-600 truncate">{item.unit}</span>
                                            <span className="text-slate-400">{item.count}</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-teal-500 rounded-full"
                                                style={{ width: `${item.percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                                {stats.unitStats.length === 0 && (
                                    <p className="text-xs text-slate-400 text-center py-8">Belum ada data distribusi</p>
                                )}
                            </div>
                        </div>

                        {/* Hourly Activity */}
                        <div className="bg-white border border-slate-200 rounded-xl p-5 lg:col-span-2">
                            <h3 className="text-sm font-semibold text-slate-800 mb-1">Aktivitas Hari Ini</h3>
                            <p className="text-xs text-slate-400 mb-4">Volume surat masuk per jam</p>
                            <div className="flex items-end gap-1 h-48 mt-4">
                                {stats.hourlyData.map((count, i) => {
                                    const height = count > 0 ? Math.max((count / Math.max(...stats.hourlyData)) * 100, 5) : 2;
                                    return (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                                            <div className="relative w-full flex justify-center">
                                                <div
                                                    className={`w-full max-w-[20px] rounded-t-sm transition-all duration-300 ${count > 0 ? "bg-teal-500 group-hover:bg-teal-600" : "bg-slate-100"}`}
                                                    style={{ height: `${height}%` }}
                                                ></div>
                                                {count > 0 && (
                                                    <div className="absolute -top-8 bg-slate-800 text-white text-[10px] py-0.5 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                                        {count} surat
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-[9px] text-slate-400 rotate-0">{i}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-4">
                            <div className="flex-1 relative min-w-[200px]">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{Icons.search}</div>
                                <input type="text" placeholder="Cari nama, tracking ID, atau perihal..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20" />
                            </div>
                            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500">
                                <option value="all">Semua Status</option>
                                <option value="submitted">Terkirim</option>
                                <option value="received">Diterima</option>
                                <option value="processing">Diproses</option>
                                <option value="completed">Selesai</option>
                                <option value="archived">Arsip</option>
                            </select>
                            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500">
                                <option value="all">Semua Prioritas</option>
                                <option value="tinggi">Tinggi</option>
                                <option value="normal">Normal</option>
                                <option value="rendah">Rendah</option>
                            </select>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50 text-left border-b border-slate-100">
                                        <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Tracking ID</th>
                                        <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Pengirim</th>
                                        <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Perihal</th>
                                        <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Tujuan</th>
                                        <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Prioritas</th>
                                        <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">SLA</th>
                                        <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                                        <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredSurat.length === 0 ? (
                                        <tr><td colSpan={8} className="px-4 py-16 text-center text-slate-400 text-sm">Belum ada surat elektronik</td></tr>
                                    ) : (
                                        filteredSurat.slice(0, 20).map((s) => {
                                            const slaInfo = s.slaDeadline ? getSlaInfo(s.slaDeadline) : null;
                                            return (
                                                <tr key={s.id} className="hover:bg-slate-50/50">
                                                    <td className="px-4 py-3">
                                                        <p className="text-sm font-mono text-teal-600">{s.trackingId || "-"}</p>
                                                        <p className="text-[10px] text-slate-400">{s.date}</p>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <p className="text-sm font-medium text-slate-800">{s.namaPengirim}</p>
                                                        <p className="text-xs text-slate-400">{s.instansiPengirim}</p>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-slate-600 max-w-[150px] truncate">{s.perihal}</td>
                                                    <td className="px-4 py-3 text-sm"><span className="inline-block px-2 py-0.5 bg-teal-50 text-teal-700 text-xs font-medium rounded">{s.tujuanUnit}</span></td>
                                                    <td className="px-4 py-3">
                                                        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITAS_CONFIG[s.prioritas || "normal"].color}`}>
                                                            <div className={`w-1.5 h-1.5 rounded-full ${PRIORITAS_CONFIG[s.prioritas || "normal"].dot}`} />
                                                            {PRIORITAS_CONFIG[s.prioritas || "normal"].label}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {slaInfo && (
                                                            <span className={`text-xs font-mono font-medium px-1.5 py-0.5 rounded ${slaInfo.urgency === "overdue" ? "bg-red-100 text-red-600" :
                                                                slaInfo.urgency === "warning" ? "bg-amber-100 text-amber-600" :
                                                                    "bg-slate-100 text-slate-600 bg-opacity-50"
                                                                }`}>
                                                                {slaInfo.text}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${STATUS_CONFIG[s.status]?.color || "bg-gray-100"}`}>
                                                            {STATUS_CONFIG[s.status]?.label || s.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <button onClick={() => setSelectedSurat(s)} className="p-1 px-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded">
                                                                Detail
                                                            </button>
                                                            {s.status !== "completed" && s.status !== "archived" && (
                                                                <button onClick={(e) => { e.stopPropagation(); openDisposisiModal(s); }} className="p-1 px-2 text-xs bg-teal-50 hover:bg-teal-100 text-teal-600 rounded">
                                                                    Disposisi
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>

                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
                            Menampilkan {Math.min(filteredSurat.length, 20)} dari {suratList.length} surat
                        </div>
                    </div>
                </div>
            </main >

            {/* Detail Modal */}
            {
                selectedSurat && !isDisposisiModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
                        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">Detail Surat</h3>
                                    <p className="text-sm text-teal-600 font-mono">{selectedSurat.trackingId}</p>
                                </div>
                                <button onClick={() => setSelectedSurat(null)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                </button>
                            </div>
                            <div className="p-6 space-y-6">
                                {/* Status + Actions */}
                                <div className="flex items-center justify-between flex-wrap gap-3">
                                    <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${STATUS_CONFIG[selectedSurat.status]?.color}`}>
                                        {STATUS_CONFIG[selectedSurat.status]?.icon} {STATUS_CONFIG[selectedSurat.status]?.label}
                                    </span>
                                    <div className="flex gap-2 flex-wrap">
                                        {getNextStatus(selectedSurat.status) && selectedSurat.status !== "archived" && (
                                            <button onClick={() => handleStatusChange(selectedSurat.id, getNextStatus(selectedSurat.status)!)} className="px-3 py-1.5 text-xs font-medium text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50">
                                                → {STATUS_CONFIG[getNextStatus(selectedSurat.status)!]?.label}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* IDs */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 rounded-xl p-4">
                                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Tracking ID</h4>
                                        <p className="text-lg font-bold font-mono text-teal-600">{selectedSurat.trackingId}</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-4">
                                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Nomor Surat</h4>
                                        <p className="text-sm font-medium text-slate-700">{selectedSurat.nomorSurat}</p>
                                    </div>
                                </div>

                                {/* Info Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 rounded-xl p-4">
                                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Pengirim</h4>
                                        <p className="text-sm font-medium text-slate-800 mb-1">{selectedSurat.namaPengirim}</p>
                                        <p className="text-sm text-slate-500">{selectedSurat.instansiPengirim}</p>
                                        <p className="text-sm text-slate-400 mt-2">{selectedSurat.emailPengirim}</p>
                                        <p className="text-sm text-slate-400">{selectedSurat.teleponPengirim}</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-4">
                                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Detail Surat</h4>
                                        <p className="text-sm text-slate-500 mb-1">Tujuan: <span className="font-medium text-slate-700">{selectedSurat.tujuanUnit}</span></p>
                                        <p className="text-sm text-slate-500 mb-1">Jenis: <span className="font-medium text-slate-700">{selectedSurat.jenisSurat}</span></p>
                                        <p className="text-sm text-slate-500">Tanggal: <span className="font-medium text-slate-700">{selectedSurat.date} {selectedSurat.timestamp}</span></p>
                                    </div>
                                </div>

                                {/* Perihal & Isi */}
                                <div className="bg-slate-50 rounded-xl p-4">
                                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Perihal</h4>
                                    <p className="text-base font-semibold text-slate-800">{selectedSurat.perihal}</p>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-4">
                                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Isi Surat</h4>
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{selectedSurat.isiSurat}</p>
                                </div>

                                {/* Attachments */}
                                {selectedSurat.lampiran && selectedSurat.lampiran.length > 0 && (
                                    <div className="bg-amber-50 rounded-xl p-4">
                                        <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-3">📎 Lampiran ({selectedSurat.lampiran.length})</h4>
                                        <div className="space-y-2">
                                            {selectedSurat.lampiran.map((file) => (
                                                <div key={file.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-amber-200">
                                                    <div className="w-8 h-8 rounded bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                                                        {Icons.paperclip}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-slate-800 truncate">{file.filename}</p>
                                                        <p className="text-xs text-slate-400">{formatFileSize(file.size)}</p>
                                                    </div>
                                                    <button onClick={() => downloadAttachment(file)} className="px-3 py-1.5 text-xs font-medium text-teal-600 border border-teal-200 rounded-lg hover:bg-teal-50">
                                                        Unduh
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Status History */}
                                {selectedSurat.statusHistory && selectedSurat.statusHistory.length > 0 && (
                                    <div className="bg-slate-50 rounded-xl p-4">
                                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Riwayat Status</h4>
                                        <div className="space-y-3">
                                            {selectedSurat.statusHistory.map((history, idx) => (
                                                <div key={idx} className="flex gap-3 items-start">
                                                    <div className={`w-2 h-2 rounded-full mt-1.5 ${STATUS_CONFIG[history.status]?.color?.includes("bg-") ? STATUS_CONFIG[history.status].color.split(" ")[0] : "bg-gray-300"}`} />
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium text-slate-700">{STATUS_CONFIG[history.status]?.label || history.status}</p>
                                                        <p className="text-xs text-slate-400">{formatDateTime(history.timestamp)}</p>
                                                        {history.note && <p className="text-xs text-slate-500 mt-1">{history.note}</p>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Update Status with Note */}
                                {selectedSurat.status !== "archived" && getNextStatus(selectedSurat.status) && (
                                    <div className="bg-teal-50 rounded-xl p-4">
                                        <h4 className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-3">Update Status</h4>
                                        <textarea
                                            value={statusNote}
                                            onChange={(e) => setStatusNote(e.target.value)}
                                            placeholder="Catatan (opsional)..."
                                            rows={2}
                                            className="w-full px-3 py-2 border border-teal-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 resize-none mb-3"
                                        />
                                        <button
                                            onClick={() => handleStatusChange(selectedSurat.id, getNextStatus(selectedSurat.status)!, statusNote || undefined)}
                                            className="px-4 py-2 bg-teal-600 text-white font-medium text-sm rounded-lg hover:bg-teal-700 transition-colors"
                                        >
                                            Update ke {STATUS_CONFIG[getNextStatus(selectedSurat.status)!]?.label}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
            {isDisposisiModalOpen && selectedSurat && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Disposisi Surat</h3>
                                <p className="text-sm text-slate-500">{selectedSurat.nomorSurat}</p>
                            </div>
                            <button onClick={() => setIsDisposisiModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">Diteruskan Kepada</label>
                                <select
                                    value={disposisiForm.assignedTo}
                                    onChange={(e) => setDisposisiForm({ ...disposisiForm, assignedTo: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500 bg-white"
                                >
                                    {STAFF_OPTIONS.map(staff => (
                                        <option key={staff} value={staff}>{staff}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">Instruksi</label>
                                <div className="space-y-2">
                                    {INSTRUKSI_OPTIONS.map(instruksi => (
                                        <label key={instruksi} className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={disposisiForm.instruksi.includes(instruksi)}
                                                onChange={() => toggleInstruksi(instruksi)}
                                                className="rounded text-teal-600 focus:ring-teal-500"
                                            />
                                            <span className="text-sm text-slate-700">{instruksi}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">Catatan Tambahan</label>
                                <textarea
                                    value={disposisiForm.catatan}
                                    onChange={(e) => setDisposisiForm({ ...disposisiForm, catatan: e.target.value })}
                                    rows={3}
                                    placeholder="Tambahkan catatan khusus..."
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500 resize-none"
                                />
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
                            <button
                                onClick={() => setIsDisposisiModalOpen(false)}
                                className="px-4 py-2 text-slate-600 bg-white border border-slate-200 font-medium text-sm rounded-xl hover:bg-slate-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => window.print()}
                                className="px-4 py-2 text-slate-600 bg-white border border-slate-200 font-medium text-sm rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2"
                            >
                                {Icons.download} Print
                            </button>
                            <button
                                onClick={handleDisposisiSubmit}
                                className="px-4 py-2 bg-teal-600 text-white font-medium text-sm rounded-xl hover:bg-teal-700 transition-colors shadow-lg shadow-teal-500/20"
                            >
                                Simpan Disposisi
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
