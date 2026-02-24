"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { getSuratByTrackingId, SuratElektronik, Prioritas } from "@/lib/suratStore";
import { QRCodeSVG } from "qrcode.react";

const STATUS_CONFIG: Record<SuratElektronik["status"], { label: string; chip: string; dot: string }> = {
    submitted: { label: "Terkirim", chip: "bg-[#009FA9]/10 text-[#009FA9] border border-[#009FA9]/20", dot: "bg-[#009FA9]" },
    received: { label: "Diterima", chip: "bg-sky-50 text-sky-700 border border-sky-200", dot: "bg-sky-500" },
    processing: { label: "Diproses", chip: "bg-amber-50 text-amber-700 border border-amber-200", dot: "bg-amber-500" },
    completed: { label: "Selesai", chip: "bg-emerald-50 text-emerald-700 border border-emerald-200", dot: "bg-emerald-500" },
    archived: { label: "Diarsipkan", chip: "bg-slate-100 text-slate-600 border border-slate-200", dot: "bg-slate-400" },
};

const PRIORITY_CONFIG: Record<Prioritas, { label: string; chip: string; dot: string }> = {
    tinggi: { label: "Prioritas Tinggi", chip: "bg-red-50 text-red-700 border border-red-200", dot: "bg-red-500" },
    normal: { label: "Prioritas Normal", chip: "bg-slate-100 text-slate-600 border border-slate-200", dot: "bg-slate-400" },
    rendah: { label: "Prioritas Rendah", chip: "bg-emerald-50 text-emerald-700 border border-emerald-200", dot: "bg-emerald-500" },
};

const STATUS_ORDER: SuratElektronik["status"][] = ["submitted", "received", "processing", "completed", "archived"];

const formatDate = (isoStr: string) => {
    return new Date(isoStr).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
};

const formatDateTime = (isoStr: string) => {
    return new Date(isoStr).toLocaleString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isTrackingIdValid = (value: string) => /^TRK-\d{4}-\d{2}-\d{4}$/i.test(value);

const getSlaInfo = (deadline?: string) => {
    if (!deadline) {
        return { label: "SLA belum tersedia", tone: "bg-slate-100 text-slate-600 border border-slate-200" };
    }

    const diffMs = new Date(deadline).getTime() - Date.now();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > 1) {
        return { label: `Sisa ${diffDays} hari`, tone: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
    }

    if (diffDays === 1) {
        return { label: "Sisa 1 hari", tone: "bg-amber-50 text-amber-700 border border-amber-200" };
    }

    if (diffDays === 0) {
        return { label: "Jatuh tempo hari ini", tone: "bg-amber-50 text-amber-700 border border-amber-200" };
    }

    const overdue = Math.abs(diffDays);
    return { label: `Terlambat ${overdue} hari`, tone: "bg-red-50 text-red-700 border border-red-200" };
};

function TrackingContent() {
    const searchParams = useSearchParams();
    const [trackingId, setTrackingId] = useState(searchParams.get("id") || "");
    const [surat, setSurat] = useState<SuratElektronik | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [error, setError] = useState("");
    const [copyNotice, setCopyNotice] = useState("");

    useEffect(() => {
        const id = searchParams.get("id");
        if (id) {
            setTrackingId(id);
            handleSearch(id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSearch = (id?: string) => {
        const searchId = (id ?? trackingId).trim();
        if (!searchId) {
            setError("Masukkan ID tracking terlebih dahulu");
            setHasSearched(false);
            return;
        }
        if (!isTrackingIdValid(searchId)) {
            setError("Format Tracking ID tidak valid. Contoh: TRK-2026-02-0004");
            setHasSearched(false);
            return;
        }

        setIsSearching(true);
        setError("");
        setHasSearched(true);
        setSurat(null);

        setTimeout(() => {
            const result = getSuratByTrackingId(searchId);
            setSurat(result);
            if (!result) setError("Data tidak ditemukan");
            setIsSearching(false);
        }, 500);
    };

    const currentStatusIndex = surat ? STATUS_ORDER.indexOf(surat.status) : -1;
    const slaInfo = surat ? getSlaInfo(surat.slaDeadline) : null;
    const contactInfo = surat ? [surat.emailPengirim, surat.teleponPengirim].filter(Boolean).join(" | ") : "";
    const trackingLink = surat
        ? `${typeof window !== "undefined" ? window.location.origin : ""}/surat/tracking?id=${surat.trackingId}`
        : "";
    const progressPercent = surat ? Math.max(0, Math.min(100, (currentStatusIndex / (STATUS_ORDER.length - 1)) * 100)) : 0;
    const isOverdue = surat ? new Date(surat.slaDeadline).getTime() - Date.now() < 0 : false;

    const copyToClipboard = async (value: string, label: string) => {
        try {
            if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(value);
            } else {
                const textarea = document.createElement("textarea");
                textarea.value = value;
                textarea.setAttribute("readonly", "");
                textarea.style.position = "absolute";
                textarea.style.left = "-9999px";
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand("copy");
                document.body.removeChild(textarea);
            }
            setCopyNotice(label);
        } catch {
            setCopyNotice("Gagal menyalin");
        } finally {
            setTimeout(() => setCopyNotice(""), 1800);
        }
    };

    const downloadAttachment = (file: { filename: string; data: string }) => {
        const link = document.createElement("a");
        link.href = file.data;
        link.download = file.filename;
        link.click();
    };

    const handleDownloadAll = () => {
        if (!surat || surat.lampiran.length === 0) return;
        surat.lampiran.forEach(downloadAttachment);
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] text-[#172B4D] relative overflow-hidden">
            <div className="absolute inset-0 bg-white/70" />
            <div className="absolute inset-0 z-0 overflow-hidden opacity-40 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#009FA9]/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#991b1b]/10 rounded-full blur-[120px]" />
            </div>

            <header className="relative z-10 w-full px-6 md:px-10 pt-8 flex flex-wrap items-center justify-between gap-4">
                <Link href="/" className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-white shadow-sm border border-gray-100 rounded-xl flex items-center justify-center">
                        <Image src="/kominfos.svg" alt="Logo" width={26} height={26} className="opacity-80" />
                    </div>
                    <div>
                        <span className="font-bold text-[#172B4D] tracking-tight text-lg block">Surat Elektronik</span>
                        <span className="text-xs text-[#6B778C]">Tracking status surat</span>
                    </div>
                </Link>
                <div className="flex flex-wrap items-center gap-3">
                    <Link href="/surat" className="px-4 py-2 rounded-full border border-white/60 bg-white/70 text-[#505F79] text-xs font-bold uppercase tracking-wider hover:text-[#009FA9] hover:border-[#009FA9]/40 transition-all">
                        Buat Surat
                    </Link>
                    <Link href="/" className="px-4 py-2 rounded-full border border-white/60 bg-white/70 text-[#505F79] text-xs font-bold uppercase tracking-wider hover:text-[#991b1b] hover:border-[#991b1b]/40 transition-all">
                        Kembali
                    </Link>
                </div>
            </header>

            <main className="relative z-10 max-w-6xl mx-auto px-6 pb-20 pt-10">
                <section className="text-center max-w-3xl mx-auto">
                    <span className="inline-block px-3 py-1 bg-[#009FA9]/10 text-[#009FA9] text-[0.7rem] font-bold uppercase tracking-wider rounded-lg border border-[#009FA9]/20 mb-3">
                        Tracking Surat
                    </span>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-[#172B4D] tracking-tight leading-tight">
                        Lacak status surat elektronik Anda
                    </h1>
                    <p className="text-[#6B778C] mt-3 text-sm md:text-base">
                        Masukkan Tracking ID dari halaman konfirmasi untuk melihat progres, disposisi, dan dokumen terkait.
                    </p>

                    <div className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-left" aria-busy={isSearching}>
                        <label className="block text-xs font-bold text-[#6B778C] uppercase tracking-wider">Tracking ID</label>
                        <div className="mt-3 flex flex-col md:flex-row gap-3">
                            <input
                                type="text"
                                value={trackingId}
                                onChange={(e) => {
                                    setTrackingId(e.target.value.toUpperCase());
                                    if (error) setError("");
                                }}
                                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                placeholder="Contoh: TRK-2026-02-0004"
                                autoComplete="off"
                                spellCheck={false}
                                inputMode="text"
                                className="flex-1 bg-gray-50 border-2 border-gray-200 rounded-2xl px-5 py-4 text-[#172B4D] text-lg font-semibold placeholder:text-gray-400 focus:outline-none focus:border-[#009FA9] focus:bg-white transition-all"
                            />
                            <button
                                onClick={() => handleSearch()}
                                disabled={isSearching}
                                className="px-8 py-4 bg-[#009FA9] text-white font-bold text-sm uppercase tracking-wider rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-60"
                            >
                                {isSearching ? "Mencari..." : "Lacak Sekarang"}
                            </button>
                        </div>
                        <p className="text-xs text-slate-400 mt-2">
                            Format ID: TRK-YYYY-MM-XXXX. Contoh: TRK-2026-02-0004.
                        </p>
                        {error && (
                            <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm font-medium" role="alert" aria-live="polite">
                                {error}
                            </div>
                        )}
                    </div>
                </section>

                {!hasSearched && (
                    <section className="mt-12 grid gap-6 md:grid-cols-3">
                        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                            <p className="text-xs font-bold text-[#6B778C] uppercase tracking-wider">Langkah 1</p>
                            <h3 className="mt-2 text-lg font-bold text-[#172B4D]">Masukkan Tracking ID</h3>
                            <p className="text-sm text-[#6B778C] mt-2">
                                ID dikirim setelah surat berhasil disubmit. Formatnya TRK-YYYY-MM-XXXX.
                            </p>
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                            <p className="text-xs font-bold text-[#6B778C] uppercase tracking-wider">Langkah 2</p>
                            <h3 className="mt-2 text-lg font-bold text-[#172B4D]">Pantau Progres</h3>
                            <p className="text-sm text-[#6B778C] mt-2">
                                Timeline menampilkan status, disposisi, dan catatan admin secara real time.
                            </p>
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                            <p className="text-xs font-bold text-[#6B778C] uppercase tracking-wider">Langkah 3</p>
                            <h3 className="mt-2 text-lg font-bold text-[#172B4D]">Unduh Lampiran</h3>
                            <p className="text-sm text-[#6B778C] mt-2">
                                Dokumen pendukung dapat diunduh langsung dari halaman hasil pencarian.
                            </p>
                        </div>
                    </section>
                )}

                {hasSearched && isSearching && (
                    <section className="mt-12 grid gap-6 lg:grid-cols-[1.1fr,1.4fr]">
                        <div className="space-y-6">
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 animate-pulse">
                                <div className="h-4 w-28 bg-slate-200 rounded-full" />
                                <div className="mt-5 h-10 w-3/4 bg-slate-200 rounded-xl" />
                                <div className="mt-4 h-4 w-2/3 bg-slate-100 rounded-full" />
                                <div className="mt-6 grid sm:grid-cols-3 gap-3">
                                    <div className="h-20 bg-slate-100 rounded-2xl" />
                                    <div className="h-20 bg-slate-100 rounded-2xl" />
                                    <div className="h-20 bg-slate-100 rounded-2xl" />
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 animate-pulse">
                                <div className="h-4 w-40 bg-slate-200 rounded-full" />
                                <div className="mt-4 h-24 bg-slate-100 rounded-2xl" />
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 animate-pulse">
                                <div className="h-4 w-32 bg-slate-200 rounded-full" />
                                <div className="mt-6 space-y-4">
                                    <div className="h-16 bg-slate-100 rounded-2xl" />
                                    <div className="h-16 bg-slate-100 rounded-2xl" />
                                    <div className="h-16 bg-slate-100 rounded-2xl" />
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {hasSearched && !surat && !isSearching && (
                    <section className="mt-12">
                        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
                            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-4">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M12 9v3m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <h3 className="text-xl font-bold text-[#172B4D]">ID tidak ditemukan</h3>
                            <p className="text-sm text-[#6B778C] mt-2 max-w-xl mx-auto">
                                Periksa kembali format Tracking ID atau hubungi admin jika surat sudah disubmit lebih dari 1 hari kerja.
                            </p>
                            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                                <Link href="/surat" className="px-8 py-4 bg-[#009FA9] text-white font-bold rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
                                    Buat Surat Baru
                                </Link>
                                <Link href="/" className="px-8 py-4 bg-white border-2 border-gray-200 text-[#505F79] font-bold rounded-2xl hover:border-[#009FA9] hover:text-[#009FA9] transition-all">
                                    Kembali ke Beranda
                                </Link>
                            </div>
                        </div>
                    </section>
                )}

                {hasSearched && surat && (
                    <section className="mt-12 grid gap-6 lg:grid-cols-[1.1fr,1.4fr]">
                        <div className="space-y-6">
                            {/* Tracking Result Card */}
                            <div className="bg-[#009FA9]/5 rounded-2xl border-2 border-[#009FA9]/20 shadow-sm p-8 lg:p-10 animate-fade-in-up relative overflow-hidden">
                                <div className="flex flex-col lg:flex-row gap-8 items-start">
                                    <div className="flex-1 min-w-0 space-y-6">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold ${STATUS_CONFIG[surat.status].chip}`}>
                                                <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[surat.status].dot}`} />
                                                {STATUS_CONFIG[surat.status].label}
                                            </span>
                                            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold ${PRIORITY_CONFIG[surat.prioritas].chip}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_CONFIG[surat.prioritas].dot}`} />
                                                {PRIORITY_CONFIG[surat.prioritas].label}
                                            </span>
                                            {slaInfo && (
                                                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold border ${slaInfo.tone}`}>
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    {slaInfo.label}
                                                </span>
                                            )}
                                        </div>

                                        <div>
                                            <p className="text-[0.7rem] font-bold uppercase tracking-wider text-[#009FA9] mb-2">Tracking ID</p>
                                            <div className="flex flex-wrap items-center gap-3">
                                                <p className="text-3xl sm:text-4xl font-black tracking-wider font-mono text-[#172B4D] select-all">
                                                    {surat.trackingId}
                                                </p>
                                                <button
                                                    onClick={() => copyToClipboard(surat.trackingId, "Tracking ID disalin")}
                                                    className="px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border-2 border-gray-200 text-[#505F79] hover:border-[#009FA9] hover:text-[#009FA9] transition-all"
                                                >
                                                    Salin ID
                                                </button>
                                                <button
                                                    onClick={() => copyToClipboard(trackingLink, "Link tracking disalin")}
                                                    className="px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border-2 border-gray-200 text-[#505F79] hover:border-[#009FA9] hover:text-[#009FA9] transition-all"
                                                >
                                                    Salin Link
                                                </button>
                                            </div>
                                            {copyNotice && (
                                                <p className="mt-2 text-xs font-semibold text-[#36B37E]" aria-live="polite">
                                                    {copyNotice}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <h2 className="text-slate-900 text-xl lg:text-2xl font-semibold leading-relaxed line-clamp-2">
                                                "{surat.perihal}"
                                            </h2>
                                        </div>

                                        <div className="grid sm:grid-cols-3 gap-3">
                                            <div className="rounded-2xl border border-gray-200 bg-white p-4">
                                                <p className="text-xs text-[#6B778C] uppercase tracking-wider font-bold">Tanggal Kirim</p>
                                                <p className="text-sm font-semibold text-[#172B4D] mt-2">{formatDate(surat.date)}</p>
                                            </div>
                                            <div className="rounded-2xl border border-gray-200 bg-white p-4">
                                                <p className="text-xs text-[#6B778C] uppercase tracking-wider font-bold">Tujuan</p>
                                                <p className="text-sm font-semibold text-[#172B4D] mt-2">{surat.tujuanUnit}</p>
                                            </div>
                                            <div className="rounded-2xl border border-gray-200 bg-white p-4">
                                                <p className="text-xs text-[#6B778C] uppercase tracking-wider font-bold">Update Terakhir</p>
                                                <p className="text-sm font-semibold text-[#172B4D] mt-2">{formatDateTime(surat.lastUpdated || surat.date)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-shrink-0">
                                        <div className="bg-white border border-gray-200 p-4 rounded-2xl shadow-sm">
                                            <QRCodeSVG
                                                value={trackingLink}
                                                size={150}
                                                bgColor="#FFFFFF"
                                                fgColor="#0f172a"
                                                level="Q"
                                                includeMargin={false}
                                            />
                                        </div>
                                        <p className="text-xs text-slate-400 uppercase tracking-widest font-bold text-center mt-3">
                                            Scan untuk verifikasi
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in-up">
                                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-[#6B778C] uppercase tracking-wider">Rincian Surat</p>
                                        <h3 className="text-lg font-bold text-[#172B4D] mt-1">Informasi Utama</h3>
                                    </div>
                                    <span className="text-xs text-slate-400">Dikirim {formatDate(surat.date)}</span>
                                </div>
                                <div className="p-6 space-y-6">
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pengirim</p>
                                            <p className="text-base font-semibold text-slate-900 mt-2">{surat.namaPengirim}</p>
                                            <p className="text-sm text-slate-500 mt-1">{surat.instansiPengirim}</p>
                                            {contactInfo && <p className="text-xs text-slate-400 mt-2">{contactInfo}</p>}
                                            {surat.alamatPengirim && (
                                                <p className="text-xs text-slate-400 mt-2">{surat.alamatPengirim}</p>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tujuan</p>
                                            <p className="text-base font-semibold text-slate-900 mt-2">{surat.tujuanUnit}</p>
                                            <p className="text-sm text-slate-500 mt-1">{surat.jenisSurat}</p>
                                            <div className="flex flex-wrap gap-2 mt-3">
                                                <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-[#009FA9]/10 text-[#009FA9]">Kode {surat.kodeSurat}</span>
                                                <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600">Klasifikasi {surat.klasifikasi}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Perihal</p>
                                        <p className="text-base font-semibold text-slate-900 mt-2">{surat.perihal}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Isi Surat</p>
                                        <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap leading-relaxed">{surat.isiSurat}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in-up">
                                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-[#172B4D]">Lampiran Dokumen</h3>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-slate-400">{surat.lampiran.length} file</span>
                                        {surat.lampiran.length > 1 && (
                                            <button
                                                onClick={handleDownloadAll}
                                                className="px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#009FA9]/10 text-[#009FA9] hover:bg-[#009FA9]/15 transition-all"
                                            >
                                                Unduh Semua
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {surat.lampiran.length > 0 ? (
                                    <div className="divide-y divide-gray-100">
                                        {surat.lampiran.map((file) => (
                                            <div key={file.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                                                <div className="w-10 h-10 rounded-2xl bg-[#009FA9]/10 text-[#009FA9] flex items-center justify-center">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-slate-900 truncate">{file.filename}</p>
                                                    <p className="text-xs text-slate-500 mt-1">{formatFileSize(file.size)}{file.uploadedAt ? ` | ${formatDate(file.uploadedAt)}` : ""}</p>
                                                </div>
                                                <button
                                                    onClick={() => downloadAttachment(file)}
                                                    className="px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-600 hover:bg-[#009FA9]/10 hover:text-[#009FA9] transition-all"
                                                >
                                                    Unduh
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-6 text-sm text-slate-500">
                                        Tidak ada lampiran yang disertakan pada surat ini.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in-up">
                                <div className="p-5 border-b border-gray-100 bg-slate-50/50 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-700">Timeline Aktivitas</h3>
                                        <p className="text-xs text-slate-400 mt-1">Update status hingga selesai</p>
                                    </div>
                                    <span className="text-xs text-slate-400">Update: {formatDate(surat.lastUpdated || surat.date)}</span>
                                </div>
                                <div className="p-6 md:p-8">
                                    <div className="relative">
                                        <div className="absolute top-2 bottom-0 left-[7px] w-px bg-slate-200"></div>
                                        <div
                                            className="absolute top-2 left-[7px] w-px bg-[#009FA9] rounded-full transition-all duration-500"
                                            style={{ height: `${progressPercent}%` }}
                                        />
                                        <div className="space-y-8">
                                            {STATUS_ORDER.map((status, index) => {
                                                const isCompleted = index <= currentStatusIndex;
                                                const isCurrent = index === currentStatusIndex;
                                                const historyEntry = surat.statusHistory?.find((entry) => entry.status === status);

                                                return (
                                                    <div key={status} className={`relative flex gap-5 ${isCompleted ? "opacity-100" : "opacity-40"}`}>
                                                        <div
                                                            className={`relative z-10 w-4 h-4 rounded-full border-[2px] mt-1 shrink-0 ${isCurrent
                                                                ? "bg-white border-[#991b1b] ring-4 ring-[#991b1b]/10"
                                                                : isCompleted
                                                                    ? "bg-[#009FA9] border-[#009FA9]"
                                                                    : "bg-white border-slate-300"
                                                                }`}
                                                        />
                                                        <div className="flex-1">
                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                                                                <h4 className={`text-sm font-bold ${isCurrent ? "text-[#991b1b]" : "text-slate-900"}`}>
                                                                    {STATUS_CONFIG[status].label}
                                                                </h4>
                                                                <div className="flex items-center gap-2">
                                                                    {isCurrent && (
                                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#991b1b]">
                                                                            Saat ini
                                                                        </span>
                                                                    )}
                                                                    {historyEntry && (
                                                                        <span className="text-xs font-medium text-slate-400 tabular-nums">
                                                                            {formatDateTime(historyEntry.timestamp)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {historyEntry?.note ? (
                                                                <div className="text-sm bg-slate-50 text-slate-600 border border-slate-100 rounded-xl p-3 mt-1.5 leading-relaxed">
                                                                    {historyEntry.note}
                                                                </div>
                                                            ) : (
                                                                <p className="text-xs text-slate-400 mt-1">
                                                                    {isCompleted ? "Status diperbarui" : "Menunggu proses berikutnya"}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {isOverdue && (
                                <div className="bg-[#991b1b]/5 rounded-2xl border-2 border-[#991b1b]/20 shadow-sm overflow-hidden animate-fade-in-up">
                                    <div className="p-5 border-b border-[#991b1b]/10">
                                        <h3 className="text-sm font-bold text-red-700">Butuh Bantuan?</h3>
                                        <p className="text-xs text-red-500 mt-1">SLA terlewati. Hubungi admin untuk percepatan.</p>
                                    </div>
                                    <div className="p-6">
                                        <p className="text-sm text-slate-600 leading-relaxed">
                                            Sertakan Tracking ID saat menghubungi admin agar proses lebih cepat.
                                        </p>
                                        <div className="mt-4 flex flex-wrap gap-3">
                                            <a
                                                href="mailto:info@makassar.go.id"
                                                className="px-4 py-3 rounded-2xl bg-[#991b1b] text-white text-xs font-bold uppercase tracking-wider shadow-lg hover:shadow-xl transition-all"
                                            >
                                                Hubungi Admin
                                            </a>
                                            <button
                                                onClick={() => copyToClipboard(surat.trackingId, "Tracking ID disalin")}
                                                className="px-4 py-3 rounded-2xl border-2 border-gray-200 text-xs font-bold uppercase tracking-wider text-[#505F79] hover:border-[#991b1b] hover:text-[#991b1b] transition-all"
                                            >
                                                Salin Tracking ID
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {(surat.disposisi || surat.responseNote) && (
                                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in-up">
                                    <div className="p-5 border-b border-gray-100">
                                        <h3 className="text-sm font-bold text-slate-700">Arahan dan Respon</h3>
                                        <p className="text-xs text-slate-400 mt-1">Catatan internal dari admin</p>
                                    </div>
                                    <div className="p-6 space-y-5">
                                        {surat.disposisi && (
                                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Disposisi</p>
                                                <p className="text-sm font-semibold text-slate-900 mt-2">{surat.disposisi.assignedTo}</p>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    Oleh {surat.disposisi.disposisiOleh} | {formatDateTime(surat.disposisi.tanggalDisposisi)}
                                                </p>
                                                {surat.disposisi.instruksi.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mt-3">
                                                        {surat.disposisi.instruksi.map((instruksi) => (
                                                            <span key={instruksi} className="px-3 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-600">
                                                                {instruksi}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                {surat.disposisi.catatan && (
                                                    <p className="text-sm text-slate-600 mt-3">{surat.disposisi.catatan}</p>
                                                )}
                                            </div>
                                        )}
                                        {surat.responseNote && (
                                            <div className="rounded-2xl border border-[#009FA9]/20 bg-[#009FA9]/5 p-4">
                                                <p className="text-xs font-bold text-[#009FA9] uppercase tracking-wider">Respon Admin</p>
                                                <p className="text-sm text-slate-600 mt-2">{surat.responseNote}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}

export default function TrackingPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-[#009FA9] animate-spin" />
                </div>
            }
        >
            <TrackingContent />
        </Suspense>
    );
}
