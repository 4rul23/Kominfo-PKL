"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { getSuratList, getSuratStats, updateSuratStatus, exportSuratToCSV, seedDummySurat, SuratElektronik, getOverdueSurat, getHourlyStats, assignDisposisi, Prioritas, Disposisi } from "@/lib/suratStore";
import { getCaseByRelatedSuratId } from "@/lib/caseStore";

// SVG Icons (matching admin/page.tsx style)
const PageIcons = {
    download: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
    search: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
    refresh: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>,
    eye: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
    close: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
};

// Status configuration (matching main admin color style)
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
    submitted: { label: "Terkirim", color: "bg-slate-100 text-slate-600", icon: "📤" },
    received: { label: "Diterima", color: "bg-blue-50 text-blue-700", icon: "📥" },
    processing: { label: "Diproses", color: "bg-amber-50 text-amber-700", icon: "⏳" },
    completed: { label: "Selesai", color: "bg-emerald-50 text-emerald-700", icon: "✅" },
    archived: { label: "Arsip", color: "bg-slate-50 text-slate-400", icon: "📁" },
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

const PRIORITAS_CONFIG: Record<Prioritas, { label: string; color: string; accent: string }> = {
    tinggi: { label: "Tinggi", color: "bg-red-50 text-red-700", accent: "bg-red-500" },
    normal: { label: "Normal", color: "bg-slate-50 text-slate-600", accent: "bg-slate-400" },
    rendah: { label: "Rendah", color: "bg-slate-50 text-slate-400", accent: "bg-slate-300" },
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

    if (days > 0) return { text: `${days}h`, isOverdue: false, urgency: days <= 1 ? "warning" : "safe" };
    return { text: `${hours}j`, isOverdue: false, urgency: hours <= 8 ? "warning" : "safe" };
}

export default function AdminSuratPage() {
    const [suratList, setSuratList] = useState<SuratElektronik[]>([]);
    const [overdueSurat, setOverdueSurat] = useState<SuratElektronik[]>([]);
    const [stats, setStats] = useState({
        today: 0, week: 0, total: 0, overdue: 0,
        statusCounts: { submitted: 0, received: 0, processing: 0, completed: 0, archived: 0 },
        jenisCounts: {} as Record<string, number>,
        hourlyData: [] as number[],
    });
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilters, setStatusFilters] = useState<SuratElektronik["status"][]>(STATUS_ORDER);
    const [priorityFilter, setPriorityFilter] = useState("all");
    const [jenisFilter, setJenisFilter] = useState("all");
    const [instansiFilter, setInstansiFilter] = useState("all");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [slaFilter, setSlaFilter] = useState("all");
    const [selectedSurat, setSelectedSurat] = useState<SuratElektronik | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [statusNote, setStatusNote] = useState("");
    const [previewFile, setPreviewFile] = useState<{ filename: string; data: string; type: string } | null>(null);
    const [isDisposisiModalOpen, setIsDisposisiModalOpen] = useState(false);
    const [disposisiForm, setDisposisiForm] = useState({ assignedTo: STAFF_OPTIONS[0], instruksi: [] as string[], catatan: "" });

    useEffect(() => { loadData(); const i = setInterval(loadData, 30000); return () => clearInterval(i); }, []);

    const loadData = () => {
        const list = getSuratList();
        setSuratList(list);
        const overdue = getOverdueSurat();
        setOverdueSurat(overdue);
        const baseStats = getSuratStats();

        // Calculate jenis surat distribution
        const jenisCounts: Record<string, number> = {};
        list.forEach(s => {
            if (s.jenisSurat) {
                jenisCounts[s.jenisSurat] = (jenisCounts[s.jenisSurat] || 0) + 1;
            }
        });

        setStats({ ...baseStats, overdue: overdue.length, hourlyData: getHourlyStats(), jenisCounts });
        setLastUpdated(new Date());
    };

    const handleSeedData = () => { seedDummySurat(); loadData(); };
    const handlePreview = (file: { filename: string; data: string; type: string }) => setPreviewFile(file);
    const handleVerify = (id: string) => { updateSuratStatus(id, "received", "Surat diverifikasi oleh Admin"); loadData(); if (selectedSurat?.id === id) setSelectedSurat(getSuratList().find(s => s.id === id) || null); };
    const handleStatusChange = (id: string, newStatus: SuratElektronik["status"], note?: string) => { updateSuratStatus(id, newStatus, note); loadData(); if (selectedSurat?.id === id) setSelectedSurat(getSuratList().find(s => s.id === id) || null); setStatusNote(""); };
    const getNextStatus = (current: SuratElektronik["status"]): SuratElektronik["status"] | null => { const idx = STATUS_ORDER.indexOf(current); return idx < STATUS_ORDER.length - 1 ? STATUS_ORDER[idx + 1] : null; };

    const statusOptions = STATUS_ORDER.map((status) => ({ value: status, label: STATUS_CONFIG[status]?.label || status }));
    const jenisOptions = useMemo(() => [...new Set(suratList.map((s) => s.jenisSurat).filter(Boolean))], [suratList]);
    const instansiOptions = useMemo(() => [...new Set(suratList.map((s) => s.instansiPengirim).filter(Boolean))], [suratList]);

    const toggleStatusFilter = (status: SuratElektronik["status"]) => {
        setStatusFilters((prev) => prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]);
    };

    const parseDate = (value: string) => new Date(`${value}T00:00:00`);
    const matchesDateRange = (dateStr: string) => {
        if (!dateFrom && !dateTo) return true;
        const date = parseDate(dateStr);
        if (dateFrom && date < parseDate(dateFrom)) return false;
        if (dateTo && date > parseDate(dateTo)) return false;
        return true;
    };

    const matchesSlaRange = (deadline?: string) => {
        if (slaFilter === "all") return true;
        if (!deadline) return false;
        const diffMs = new Date(deadline).getTime() - Date.now();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        switch (slaFilter) {
            case "overdue":
                return diffDays < 0;
            case "today":
                return diffDays === 0;
            case "1day":
                return diffDays >= 0 && diffDays <= 1;
            case "3days":
                return diffDays >= 0 && diffDays <= 3;
            case "safe":
                return diffDays > 3;
            default:
                return true;
        }
    };

    const filteredSurat = useMemo(() => suratList.filter((s) => {
        const q = searchQuery.toLowerCase();
        const matchesSearch = s.namaPengirim.toLowerCase().includes(q) || s.perihal.toLowerCase().includes(q) || s.nomorSurat.toLowerCase().includes(q) || s.trackingId?.toLowerCase().includes(q) || s.instansiPengirim.toLowerCase().includes(q);
        const matchesStatus = statusFilters.length === 0 || statusFilters.includes(s.status);
        const matchesPriority = priorityFilter === "all" || (s.prioritas || "normal") === priorityFilter;
        const matchesJenis = jenisFilter === "all" || s.jenisSurat === jenisFilter;
        const matchesInstansi = instansiFilter === "all" || s.instansiPengirim === instansiFilter;
        const matchesTanggal = s.date ? matchesDateRange(s.date) : true;
        const matchesSla = matchesSlaRange(s.slaDeadline);

        return matchesSearch && matchesStatus && matchesPriority && matchesJenis && matchesInstansi && matchesTanggal && matchesSla;
    }), [suratList, searchQuery, statusFilters, priorityFilter, jenisFilter, instansiFilter, dateFrom, dateTo, slaFilter]);

    const openDisposisiModal = (surat: SuratElektronik) => { setSelectedSurat(surat); setIsDisposisiModalOpen(true); setDisposisiForm(surat.disposisi ? { assignedTo: surat.disposisi.assignedTo, instruksi: surat.disposisi.instruksi, catatan: surat.disposisi.catatan } : { assignedTo: STAFF_OPTIONS[0], instruksi: [], catatan: "" }); };
    const handleDisposisiSubmit = () => { if (!selectedSurat) return; assignDisposisi(selectedSurat.id, { ...disposisiForm, disposisiOleh: "Admin" }); loadData(); setIsDisposisiModalOpen(false); setSelectedSurat(getSuratList().find(s => s.id === selectedSurat.id) || null); };
    const toggleInstruksi = (instruksi: string) => setDisposisiForm(prev => ({ ...prev, instruksi: prev.instruksi.includes(instruksi) ? prev.instruksi.filter(i => i !== instruksi) : [...prev.instruksi, instruksi] }));
    const handleExport = () => { const csv = exportSuratToCSV(); const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `surat_${new Date().toISOString().split("T")[0]}.csv`; link.click(); };
    const formatFileSize = (bytes: number): string => bytes < 1024 ? bytes + " B" : bytes < 1024 * 1024 ? (bytes / 1024).toFixed(1) + " KB" : (bytes / (1024 * 1024)).toFixed(1) + " MB";
    const downloadAttachment = (a: { filename: string; data: string }) => { const l = document.createElement("a"); l.href = a.data; l.download = a.filename; l.click(); };
    const formatDateTime = (isoStr: string) => new Date(isoStr).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

    const maxHourly = Math.max(...stats.hourlyData, 1);

    return (
        <div className="space-y-6">
            {/* Header - matching admin/page.tsx */}
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Surat Masuk</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-slate-500">Kelola dan verifikasi surat elektronik</p>
                        {lastUpdated && (
                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Updated: {lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                        )}
                    </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={loadData} className="flex items-center gap-1.5 px-4 py-3 text-xs font-bold text-[#505F79] bg-white border-2 border-gray-200 rounded-2xl hover:border-[#009FA9] hover:text-[#009FA9] transition-all shadow-sm">
                        {PageIcons.refresh}
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
            {/* SLA Overdue Notice - matches stats card style */}
            {overdueSurat.length > 0 && (
                <div className="bg-[#991b1b]/5 border-2 border-[#991b1b]/20 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <div>
                            <span className="text-sm font-semibold text-slate-800">{overdueSurat.length} surat melewati SLA</span>
                            <span className="text-xs text-slate-400 ml-2">
                                {overdueSurat.slice(0, 2).map(s => s.trackingId).join(", ")}
                                {overdueSurat.length > 2 && ` +${overdueSurat.length - 2}`}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Row - matching admin/page.tsx */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                {[
                    { label: "Baru Masuk", value: stats.statusCounts.submitted, accent: "bg-slate-500" },
                    { label: "Diterima", value: stats.statusCounts.received, accent: "bg-blue-500" },
                    { label: "Diproses", value: stats.statusCounts.processing, accent: "bg-amber-500" },
                    { label: "Selesai", value: stats.statusCounts.completed, accent: "bg-emerald-500" },
                    { label: "Arsip", value: stats.statusCounts.archived, accent: "bg-slate-400" },
                    { label: "Total", value: stats.total, accent: "bg-[#009FA9]" },
                ].map((s) => (
                    <div key={s.label} className="bg-white border-2 border-gray-200 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <div className={`w-2 h-2 rounded-full ${s.accent}`} />
                            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{s.label}</span>
                        </div>
                        <p className="text-3xl font-bold text-slate-800 tracking-tight">{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Charts Row - matching admin/page.tsx */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Hourly Chart */}
                <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 sm:p-5 lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-sm font-semibold text-slate-700">Aktivitas Hari Ini</p>
                            <p className="text-xs text-slate-400">Distribusi surat per jam</p>
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

                {/* Jenis Surat Distribution */}
                <div className="bg-white border-2 border-gray-200 rounded-2xl p-5">
                    <p className="text-sm font-semibold text-slate-700 mb-1">Jenis Surat</p>
                    <p className="text-xs text-slate-400 mb-4">Distribusi berdasarkan jenis</p>
                    <div className="space-y-3">
                        {Object.keys(stats.jenisCounts).length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-4">Belum ada data</p>
                        ) : Object.entries(stats.jenisCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([jenis, count]) => (
                            <div key={jenis}>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="font-medium text-slate-600 truncate">{jenis}</span>
                                    <span className="text-slate-400">{count}</span>
                                </div>
                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-teal-500 rounded-full" style={{ width: `${(count / stats.total) * 100}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Table - matching admin/page.tsx */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-4">
                    <div className="flex-1 relative min-w-[200px]">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{PageIcons.search}</div>
                        <input
                            type="text"
                            placeholder="Cari tracking ID, pengirim, atau perihal..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#009FA9] focus:ring-1 focus:ring-[#009FA9]/20"
                        />
                    </div>
                    <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#009FA9]"
                    >
                        <option value="all">Semua Prioritas</option>
                        <option value="tinggi">Tinggi</option>
                        <option value="normal">Normal</option>
                        <option value="rendah">Rendah</option>
                    </select>
                    <select
                        value={slaFilter}
                        onChange={(e) => setSlaFilter(e.target.value)}
                        className="px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#009FA9]"
                    >
                        <option value="all">Semua SLA</option>
                        <option value="overdue">Terlambat</option>
                        <option value="today">Jatuh Tempo Hari Ini</option>
                        <option value="1day">≤ 1 Hari</option>
                        <option value="3days">≤ 3 Hari</option>
                        <option value="safe">&gt; 3 Hari</option>
                    </select>
                </div>
                <div className="p-4 border-b border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Jenis Surat</label>
                        <select
                            value={jenisFilter}
                            onChange={(e) => setJenisFilter(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#009FA9]"
                        >
                            <option value="all">Semua Jenis</option>
                            {jenisOptions.map((jenis) => (
                                <option key={jenis} value={jenis}>{jenis}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Instansi</label>
                        <select
                            value={instansiFilter}
                            onChange={(e) => setInstansiFilter(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#009FA9]"
                        >
                            <option value="all">Semua Instansi</option>
                            {instansiOptions.map((instansi) => (
                                <option key={instansi} value={instansi}>{instansi}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Tanggal</label>
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#009FA9]"
                            />
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#009FA9]"
                            />
                        </div>
                    </div>
                </div>
                <div className="p-4 border-b border-slate-100">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Status Kombinasi</p>
                            <p className="text-xs text-slate-500 mt-1">Pilih lebih dari satu status untuk hasil gabungan.</p>
                        </div>
                        <button
                            onClick={() => setStatusFilters(STATUS_ORDER)}
                            className="px-3 py-2 text-xs font-bold text-[#505F79] bg-white border-2 border-gray-200 rounded-2xl hover:border-[#009FA9] hover:text-[#009FA9] transition-all"
                        >
                            Semua Status
                        </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {statusOptions.map((status) => {
                            const active = statusFilters.includes(status.value as SuratElektronik["status"]);
                            return (
                                <button
                                    key={status.value}
                                    onClick={() => toggleStatusFilter(status.value as SuratElektronik["status"])}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-xl border-2 transition-all ${active
                                        ? "bg-[#009FA9]/10 text-[#009FA9] border-[#009FA9]/30"
                                        : "bg-white text-[#505F79] border-gray-200 hover:border-[#009FA9]/30"
                                        }`}
                                >
                                    {status.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <table className="w-full">
                    <thead>
                        <tr className="bg-slate-50 text-left border-b border-slate-100">
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tracking</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Case</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Pengirim</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Perihal</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Jenis</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Prioritas</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredSurat.length === 0 ? (
                            <tr><td colSpan={8} className="px-4 py-16 text-center text-slate-400 text-sm">Belum ada surat masuk</td></tr>
                        ) : filteredSurat.slice(0, 20).map((s) => {
                            const sla = s.slaDeadline ? getSlaInfo(s.slaDeadline) : null;
                            return (
                                <tr key={s.id} className="hover:bg-slate-50/50">
                                    <td className="px-4 py-3">
                                        <p className="text-sm font-medium text-[#009FA9]">{s.trackingId || "-"}</p>
                                        <p className="text-xs text-slate-400">{s.date}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        {(() => {
                                            const c = getCaseByRelatedSuratId(s.id);
                                            if (!c) return <span className="text-xs text-slate-400">-</span>;
                                            return (
                                                <Link href={`/admin/cases/${c.id}`} className={`inline-flex items-center px-2 py-0.5 text-xs font-bold rounded-lg border border-slate-200 ${caseBadge(c.status)}`}>
                                                    {c.status}
                                                </Link>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="text-sm font-medium text-slate-800">{s.namaPengirim}</p>
                                        <p className="text-xs text-slate-400">{s.instansiPengirim}</p>
                                    </td>
                                    <td className="px-4 py-3 max-w-[220px]">
                                        <p className="text-sm text-slate-600 truncate">{s.perihal}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="inline-block px-2 py-0.5 bg-[#009FA9]/10 text-[#009FA9] text-xs font-bold rounded-lg border border-[#009FA9]/20">{s.jenisSurat}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-lg ${PRIORITAS_CONFIG[s.prioritas || "normal"].color}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${PRIORITAS_CONFIG[s.prioritas || "normal"].accent}`} />
                                            {PRIORITAS_CONFIG[s.prioritas || "normal"].label}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-lg ${STATUS_CONFIG[s.status]?.color}`}>
                                            {STATUS_CONFIG[s.status]?.label}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => setSelectedSurat(s)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                                {PageIcons.eye}
                                            </button>
                                            {s.status !== "completed" && s.status !== "archived" && (
                                                <button onClick={() => openDisposisiModal(s)} className="px-3 py-1.5 text-xs font-bold text-[#009FA9] bg-[#009FA9]/10 border border-[#009FA9]/20 rounded-xl hover:bg-[#009FA9]/15 transition-all">
                                                    Disposisi
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
                    Menampilkan {Math.min(filteredSurat.length, 20)} dari {suratList.length} surat
                </div>
            </div>

            {/* Detail Modal */}
            {selectedSurat && !isDisposisiModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
                    <div className="w-full max-w-2xl bg-white border-2 border-gray-200 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Detail Surat</h3>
                                <p className="text-sm text-[#009FA9]">{selectedSurat.trackingId}</p>
                            </div>
                            <button onClick={() => setSelectedSurat(null)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                {PageIcons.close}
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-6">
                            {/* Status Bar */}
                            <div className="flex items-center justify-between flex-wrap gap-3 p-4 bg-white border-2 border-gray-200 rounded-2xl">
                                <span className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg ${STATUS_CONFIG[selectedSurat.status]?.color}`}>
                                    {STATUS_CONFIG[selectedSurat.status]?.icon} {STATUS_CONFIG[selectedSurat.status]?.label}
                                </span>
                                <div className="flex gap-2">
                                    {selectedSurat.status === "submitted" && (
                                        <button onClick={() => handleVerify(selectedSurat.id)} className="px-4 py-2 text-xs font-bold text-white bg-[#009FA9] rounded-2xl hover:shadow-md transition-all">Verifikasi</button>
                                    )}
                                    {getNextStatus(selectedSurat.status) && selectedSurat.status !== "archived" && selectedSurat.status !== "submitted" && (
                                        <button onClick={() => handleStatusChange(selectedSurat.id, getNextStatus(selectedSurat.status)!)} className="px-3 py-2 text-xs font-bold text-[#505F79] border-2 border-gray-200 rounded-2xl hover:border-[#009FA9] hover:text-[#009FA9] transition-all">
                                            → {STATUS_CONFIG[getNextStatus(selectedSurat.status)!]?.label}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white border-2 border-gray-200 rounded-2xl p-4">
                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Tracking ID</p>
                                    <p className="text-base font-bold text-[#009FA9]">{selectedSurat.trackingId}</p>
                                </div>
                                <div className="bg-white border-2 border-gray-200 rounded-2xl p-4">
                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Nomor Surat</p>
                                    <p className="text-sm font-medium text-slate-700">{selectedSurat.nomorSurat}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white border-2 border-gray-200 rounded-2xl p-4">
                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">Pengirim</p>
                                    <p className="text-sm font-medium text-slate-800">{selectedSurat.namaPengirim}</p>
                                    <p className="text-sm text-slate-500">{selectedSurat.instansiPengirim}</p>
                                    <p className="text-xs text-slate-400 mt-2">{selectedSurat.emailPengirim}</p>
                                    <p className="text-xs text-slate-400">{selectedSurat.teleponPengirim}</p>
                                </div>
                                <div className="bg-white border-2 border-gray-200 rounded-2xl p-4">
                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">Detail</p>
                                    <p className="text-sm text-slate-600">Jenis: <span className="font-medium text-slate-800">{selectedSurat.jenisSurat}</span></p>
                                    <p className="text-sm text-slate-600 mt-1">Tanggal: <span className="font-medium text-slate-800">{selectedSurat.date}</span></p>
                                    <p className="text-sm text-slate-600 mt-1">SLA: <span className={`font-medium ${new Date(selectedSurat.slaDeadline) < new Date() ? 'text-red-600' : 'text-slate-800'}`}>{new Date(selectedSurat.slaDeadline).toLocaleDateString('id-ID')}</span></p>
                                </div>
                            </div>

                            <div className="bg-white border-2 border-gray-200 rounded-2xl p-4">
                                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Perihal</p>
                                <p className="text-base font-semibold text-slate-800">{selectedSurat.perihal}</p>
                            </div>
                            <div className="bg-white border-2 border-gray-200 rounded-2xl p-4">
                                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Isi Surat</p>
                                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{selectedSurat.isiSurat}</p>
                            </div>

                            {/* Attachments */}
                            {selectedSurat.lampiran && selectedSurat.lampiran.length > 0 && (
                                <div className="bg-white border-2 border-gray-200 rounded-2xl p-4">
                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">📎 Lampiran ({selectedSurat.lampiran.length})</p>
                                    <div className="space-y-2">
                                        {selectedSurat.lampiran.map((file) => (
                                            <div key={file.id} className="flex items-center gap-3 p-3 bg-white rounded-2xl border-2 border-gray-200">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-800 truncate">{file.filename}</p>
                                                    <p className="text-xs text-slate-400">{formatFileSize(file.size)}</p>
                                                </div>
                                                <button onClick={() => handlePreview(file)} className="px-3 py-1.5 text-xs font-bold text-[#009FA9] border-2 border-[#009FA9]/30 rounded-xl hover:bg-[#009FA9]/10 transition-all">Preview</button>
                                                <button onClick={() => downloadAttachment(file)} className="px-3 py-1.5 text-xs font-bold text-[#505F79] border-2 border-gray-200 rounded-xl hover:border-[#009FA9] hover:text-[#009FA9] transition-all">Unduh</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* History */}
                            {selectedSurat.statusHistory && selectedSurat.statusHistory.length > 0 && (
                                <div className="bg-white border-2 border-gray-200 rounded-2xl p-4">
                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">Riwayat</p>
                                    <div className="space-y-3">
                                        {selectedSurat.statusHistory.map((h, i) => (
                                            <div key={i} className="flex gap-3 items-start">
                                                <div className="w-2 h-2 rounded-full bg-[#009FA9] mt-1.5 flex-shrink-0" />
                                                <div>
                                                    <p className="text-sm font-medium text-slate-700">{STATUS_CONFIG[h.status]?.label}</p>
                                                    <p className="text-xs text-slate-400">{formatDateTime(h.timestamp)}</p>
                                                    {h.note && <p className="text-xs text-slate-500 mt-1">{h.note}</p>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Update Status */}
                            {selectedSurat.status !== "archived" && getNextStatus(selectedSurat.status) && (
                                <div className="bg-[#009FA9]/5 rounded-2xl p-4 border-2 border-[#009FA9]/20">
                                    <p className="text-xs font-bold text-[#009FA9] uppercase tracking-wider mb-2">Update Status</p>
                                    <textarea value={statusNote} onChange={(e) => setStatusNote(e.target.value)} placeholder="Catatan (opsional)..." rows={2} className="w-full px-3 py-2 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#009FA9] resize-none mb-3 bg-white" />
                                    <button onClick={() => handleStatusChange(selectedSurat.id, getNextStatus(selectedSurat.status)!, statusNote || undefined)} className="px-4 py-2 bg-[#009FA9] text-white font-bold text-sm rounded-2xl hover:shadow-md transition-all">
                                        Update ke {STATUS_CONFIG[getNextStatus(selectedSurat.status)!]?.label}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Disposisi Modal */}
            {isDisposisiModalOpen && selectedSurat && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
                    <div className="bg-white border-2 border-gray-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Disposisi Surat</h3>
                                <p className="text-sm text-slate-500">{selectedSurat.nomorSurat}</p>
                            </div>
                            <button onClick={() => setIsDisposisiModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                {PageIcons.close}
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Diteruskan Kepada</label>
                                <select value={disposisiForm.assignedTo} onChange={(e) => setDisposisiForm({ ...disposisiForm, assignedTo: e.target.value })} className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#009FA9]">
                                    {STAFF_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Instruksi</label>
                                <div className="space-y-2">
                                    {INSTRUKSI_OPTIONS.map(instruksi => (
                                        <label key={instruksi} className="flex items-center gap-2 p-2 rounded-2xl border-2 border-gray-200 hover:bg-slate-50 cursor-pointer transition-colors">
                                            <input type="checkbox" checked={disposisiForm.instruksi.includes(instruksi)} onChange={() => toggleInstruksi(instruksi)} className="rounded text-[#009FA9] focus:ring-[#009FA9]" />
                                            <span className="text-sm text-slate-700">{instruksi}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Catatan</label>
                                <textarea value={disposisiForm.catatan} onChange={(e) => setDisposisiForm({ ...disposisiForm, catatan: e.target.value })} rows={2} placeholder="Catatan khusus..." className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#009FA9] resize-none" />
                            </div>
                        </div>
                        <div className="p-5 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
                            <button onClick={() => setIsDisposisiModalOpen(false)} className="px-4 py-2 text-[#505F79] font-bold text-sm bg-white border-2 border-gray-200 rounded-2xl hover:border-[#009FA9] hover:text-[#009FA9] transition-all">Batal</button>
                            <button onClick={handleDisposisiSubmit} className="px-4 py-2 bg-[#009FA9] text-white font-bold text-sm rounded-2xl hover:shadow-md transition-all">Simpan</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {previewFile && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80">
                    <div className="w-full max-w-5xl h-[90vh] bg-white border-2 border-gray-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                            <h3 className="font-semibold text-slate-800">Preview: {previewFile.filename}</h3>
                            <button onClick={() => setPreviewFile(null)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                {PageIcons.close}
                            </button>
                        </div>
                        <div className="flex-1 bg-slate-100 overflow-hidden flex items-center justify-center p-2">
                            {previewFile.type.startsWith("image/") ? (
                                <div className="relative w-full h-full"><Image src={previewFile.data} alt={previewFile.filename} fill className="object-contain" /></div>
                            ) : previewFile.type === "application/pdf" ? (
                                <iframe src={previewFile.data} className="w-full h-full rounded-2xl border-2 border-gray-200 bg-white" title={previewFile.filename} />
                            ) : (
                                <div className="text-center p-8 bg-white rounded-2xl border-2 border-gray-200">
                                    <p className="text-slate-800 font-medium mb-1">Preview tidak tersedia</p>
                                    <p className="text-sm text-slate-500 mb-4">Format tidak didukung</p>
                                    <button onClick={() => downloadAttachment(previewFile)} className="px-4 py-2 bg-[#009FA9] text-white text-sm font-bold rounded-2xl hover:shadow-md transition-all">Unduh File</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
