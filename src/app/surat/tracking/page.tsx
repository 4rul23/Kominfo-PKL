"use client";

import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getSuratByTrackingId, SuratElektronik } from "@/lib/suratStore";

const STATUS_CONFIG: Record<string, { label: string; color: string; gradient: string; icon: string }> = {
    submitted: { label: "Terkirim", color: "text-blue-400", gradient: "from-blue-500 to-cyan-500", icon: "📤" },
    received: { label: "Diterima", color: "text-purple-400", gradient: "from-purple-500 to-violet-500", icon: "📥" },
    processing: { label: "Diproses", color: "text-amber-400", gradient: "from-amber-500 to-orange-500", icon: "⏳" },
    completed: { label: "Selesai", color: "text-emerald-400", gradient: "from-emerald-500 to-teal-500", icon: "✅" },
    archived: { label: "Diarsipkan", color: "text-slate-400", gradient: "from-slate-500 to-gray-500", icon: "📁" },
};

const STATUS_ORDER = ["submitted", "received", "processing", "completed", "archived"];

function TrackingContent() {
    const searchParams = useSearchParams();
    const [trackingId, setTrackingId] = useState(searchParams.get("id") || "");
    const [surat, setSurat] = useState<SuratElektronik | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const id = searchParams.get("id");
        if (id) {
            setTrackingId(id);
            handleSearch(id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSearch = (id?: string) => {
        const searchId = id || trackingId;
        if (!searchId.trim()) {
            setError("Masukkan Tracking ID");
            return;
        }

        setIsSearching(true);
        setError("");
        setHasSearched(true);

        setTimeout(() => {
            const result = getSuratByTrackingId(searchId.trim());
            setSurat(result);
            if (!result) setError("Surat tidak ditemukan. Pastikan Tracking ID benar.");
            setIsSearching(false);
        }, 500);
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    };

    const formatDateTime = (isoStr: string) => {
        const date = new Date(isoStr);
        return date.toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
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

    const getCurrentStatusIndex = () => surat ? STATUS_ORDER.indexOf(surat.status) : -1;

    return (
        <div className="min-h-screen bg-[#0a0f1c] overflow-hidden">
            {/* Ambient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-cyan-500/15 to-teal-500/10 blur-[120px] animate-pulse" style={{ animationDuration: "8s" }} />
                <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-br from-violet-500/10 to-purple-500/10 blur-[100px] animate-pulse" style={{ animationDuration: "10s" }} />
                {/* Grid */}
                <div className="absolute inset-0 opacity-[0.03]" style={{
                    backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
                    backgroundSize: "60px 60px"
                }} />
            </div>

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between px-6 md:px-10 py-6">
                <Link href="/" className="flex items-center gap-4 group">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-lg group-hover:bg-white/15 transition-all">
                        <Image src="/lontara.svg" alt="Logo" width={28} height={28} className="opacity-90" />
                    </div>
                    <div>
                        <h1 className="text-white font-bold text-lg tracking-tight">Lacak Surat</h1>
                        <p className="text-white/50 text-xs">Diskominfo Kota Makassar</p>
                    </div>
                </Link>
                <Link href="/surat" className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/30 hover:-translate-y-0.5 transition-all">
                    Kirim Surat Baru
                </Link>
            </header>

            {/* Main */}
            <main className="relative z-10 max-w-4xl mx-auto px-6 pb-20">
                {/* Search Hero */}
                <div className="mt-12 md:mt-20 text-center">
                    <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-4">
                        Lacak <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400">Surat</span>
                    </h1>
                    <p className="text-white/50 text-lg mb-10">
                        Masukkan Tracking ID untuk melihat status surat Anda
                    </p>

                    <div className="max-w-xl mx-auto">
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={trackingId}
                                onChange={(e) => setTrackingId(e.target.value.toUpperCase())}
                                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                placeholder="TRK-2026-01-0001"
                                className="flex-1 px-6 py-4 bg-white/5 backdrop-blur-xl border-2 border-white/10 rounded-2xl text-white text-lg font-mono placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all"
                            />
                            <button
                                onClick={() => handleSearch()}
                                disabled={isSearching}
                                className="px-6 py-4 bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold rounded-2xl shadow-lg shadow-cyan-500/30 hover:shadow-xl disabled:opacity-50 transition-all"
                            >
                                {isSearching ? (
                                    <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                    </svg>
                                ) : (
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <circle cx="11" cy="11" r="8" />
                                        <path d="m21 21-4.35-4.35" />
                                    </svg>
                                )}
                            </button>
                        </div>

                        {error && (
                            <div className="mt-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                                {error}
                            </div>
                        )}
                    </div>
                </div>

                {/* Results */}
                {hasSearched && surat && (
                    <div className="mt-12 space-y-6 animate-fade-in-up">
                        {/* Status Card */}
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
                            {/* Status Header */}
                            <div className={`p-6 bg-gradient-to-r ${STATUS_CONFIG[surat.status]?.gradient || "from-gray-500 to-gray-600"}`}>
                                <div className="flex items-center gap-4">
                                    <span className="text-4xl">{STATUS_CONFIG[surat.status]?.icon}</span>
                                    <div>
                                        <p className="text-white/80 text-sm font-medium">Status Saat Ini</p>
                                        <p className="text-2xl font-black text-white">
                                            {STATUS_CONFIG[surat.status]?.label || surat.status}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* IDs */}
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-white/10">
                                <div>
                                    <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1">Tracking ID</p>
                                    <p className="text-2xl font-black text-white font-mono">{surat.trackingId}</p>
                                </div>
                                <div>
                                    <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1">Nomor Surat</p>
                                    <p className="text-white/80 font-medium">{surat.nomorSurat}</p>
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="p-6 grid grid-cols-2 gap-6">
                                <div>
                                    <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1">Tanggal Kirim</p>
                                    <p className="text-white/80">{formatDate(surat.date)}</p>
                                </div>
                                <div>
                                    <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1">Pembaruan Terakhir</p>
                                    <p className="text-white/80">{formatDateTime(surat.lastUpdated || surat.date)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Timeline */}
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
                            <h3 className="text-white font-bold text-lg mb-6">Riwayat Status</h3>

                            <div className="relative">
                                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-white/10" />

                                <div className="space-y-6">
                                    {STATUS_ORDER.map((status, index) => {
                                        const currentIndex = getCurrentStatusIndex();
                                        const isCompleted = index <= currentIndex;
                                        const isCurrent = index === currentIndex;
                                        const historyEntry = surat.statusHistory?.find(h => h.status === status);

                                        return (
                                            <div key={status} className="relative flex gap-4 pl-2">
                                                <div className={`relative z-10 w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${isCurrent
                                                        ? `bg-gradient-to-br ${STATUS_CONFIG[status]?.gradient} shadow-lg`
                                                        : isCompleted
                                                            ? "bg-emerald-500/20 text-emerald-400"
                                                            : "bg-white/5 text-white/20"
                                                    }`}>
                                                    {isCompleted && !isCurrent && (
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                                    )}
                                                    {isCurrent && <span className="text-white text-sm">{STATUS_CONFIG[status]?.icon}</span>}
                                                </div>

                                                <div className={`flex-1 pb-2 ${!isCompleted ? "opacity-30" : ""}`}>
                                                    <p className={`font-bold ${isCurrent ? STATUS_CONFIG[status]?.color : isCompleted ? "text-white" : "text-white/30"}`}>
                                                        {STATUS_CONFIG[status]?.label}
                                                    </p>
                                                    {historyEntry && (
                                                        <>
                                                            <p className="text-white/40 text-xs mt-0.5">{formatDateTime(historyEntry.timestamp)}</p>
                                                            {historyEntry.note && <p className="text-white/50 text-sm mt-1">{historyEntry.note}</p>}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Letter Details */}
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
                            <h3 className="text-white font-bold text-lg mb-6">Detail Surat</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div className="p-4 bg-white/5 rounded-xl">
                                    <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Pengirim</p>
                                    <p className="text-white font-bold">{surat.namaPengirim}</p>
                                    <p className="text-white/60 text-sm">{surat.instansiPengirim}</p>
                                </div>
                                <div className="p-4 bg-white/5 rounded-xl">
                                    <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Tujuan</p>
                                    <p className="text-white font-bold">{surat.tujuanUnit}</p>
                                    <p className="text-white/60 text-sm">{surat.jenisSurat}</p>
                                </div>
                            </div>

                            <div className="p-4 bg-white/5 rounded-xl">
                                <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Perihal</p>
                                <p className="text-white font-bold">{surat.perihal}</p>
                            </div>
                        </div>

                        {/* Attachments */}
                        {surat.lampiran && surat.lampiran.length > 0 && (
                            <div className="bg-amber-500/10 backdrop-blur-xl border border-amber-500/20 rounded-3xl p-6">
                                <h3 className="text-amber-400 font-bold text-lg mb-4">📎 Lampiran ({surat.lampiran.length})</h3>

                                <div className="space-y-2">
                                    {surat.lampiran.map((file) => (
                                        <div key={file.id} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
                                            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 text-xl">
                                                📎
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-medium truncate">{file.filename}</p>
                                                <p className="text-white/40 text-xs">{formatFileSize(file.size)}</p>
                                            </div>
                                            <button
                                                onClick={() => downloadAttachment(file)}
                                                className="px-4 py-2 bg-amber-500/20 text-amber-400 font-bold text-sm rounded-xl hover:bg-amber-500/30 transition-colors"
                                            >
                                                Unduh
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Empty State */}
                {!hasSearched && (
                    <div className="mt-20 text-center">
                        <div className="w-24 h-24 mx-auto rounded-3xl bg-white/5 flex items-center justify-center mb-6">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5">
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.35-4.35" />
                            </svg>
                        </div>
                        <p className="text-white/30 text-lg">Masukkan Tracking ID untuk melacak surat</p>
                        <p className="text-white/20 text-sm mt-2">Format: TRK-YYYY-MM-XXXX</p>
                    </div>
                )}
            </main>
        </div>
    );
}

export default function TrackingPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#0a0f1c] flex items-center justify-center">
                <div className="animate-spin w-10 h-10 border-3 border-cyan-500 border-t-transparent rounded-full" />
            </div>
        }>
            <TrackingContent />
        </Suspense>
    );
}
