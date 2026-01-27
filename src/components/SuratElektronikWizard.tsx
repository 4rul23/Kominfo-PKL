"use client";

import { useState, useEffect } from "react";
import { addSurat, SuratElektronik } from "@/lib/suratStore";

interface SuratWizardData {
    namaPengirim: string;
    emailPengirim: string;
    teleponPengirim: string;
    instansiPengirim: string;
    alamatPengirim: string;
    perihal: string;
    jenisSurat: string;
    tujuanUnit: string;
    isiSurat: string;
}

const TOTAL_STEPS = 5;

const UNIT_OPTIONS = [
    "Bidang IKP",
    "Bidang Aptika",
    "Bidang Statistik",
    "Bidang E-Government",
    "Sekretariat",
];

const JENIS_SURAT_OPTIONS = [
    "Permohonan",
    "Undangan",
    "Laporan",
    "Pengaduan",
    "Informasi",
    "Lainnya",
];

export default function SuratElektronikWizard({
    isOpen,
    onClose,
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
    const [step, setStep] = useState(1);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [submittedSurat, setSubmittedSurat] = useState<SuratElektronik | null>(null);
    const [data, setData] = useState<SuratWizardData>({
        namaPengirim: "",
        emailPengirim: "",
        teleponPengirim: "",
        instansiPengirim: "",
        alamatPengirim: "",
        perihal: "",
        jenisSurat: "",
        tujuanUnit: "",
        isiSurat: "",
    });

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    const handleNext = () => {
        if (step < TOTAL_STEPS) setStep(step + 1);
    };

    const handleBack = () => setStep(Math.max(1, step - 1));

    const handleSubmit = () => {
        const result = addSurat(data);
        setSubmittedSurat(result);
        setIsSubmitted(true);
    };

    const handleClose = () => {
        setStep(1);
        setIsSubmitted(false);
        setSubmittedSurat(null);
        setData({
            namaPengirim: "",
            emailPengirim: "",
            teleponPengirim: "",
            instansiPengirim: "",
            alamatPengirim: "",
            perihal: "",
            jenisSurat: "",
            tujuanUnit: "",
            isiSurat: "",
        });
        onClose();
    };

    const canProceed = () => {
        switch (step) {
            case 1:
                return data.namaPengirim.trim() && data.emailPengirim.trim() && data.teleponPengirim.trim();
            case 2:
                return data.instansiPengirim.trim();
            case 3:
                return data.tujuanUnit && data.jenisSurat;
            case 4:
                return data.perihal.trim() && data.isiSurat.trim();
            case 5:
                return true;
            default:
                return false;
        }
    };

    if (!isOpen) return null;

    // Success Screen
    if (isSubmitted && submittedSurat) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}>
                <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                    <div className="p-8 text-center">
                        {/* Success Icon */}
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </div>

                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Surat Berhasil Dikirim!</h2>
                        <p className="text-slate-500 mb-6">Surat elektronik Anda telah berhasil disubmit ke sistem.</p>

                        {/* Reference Number */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
                            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Nomor Referensi</p>
                            <p className="text-2xl font-bold text-teal-600 tracking-wide">{submittedSurat.nomorSurat}</p>
                        </div>

                        {/* Summary */}
                        <div className="text-left bg-slate-50 rounded-xl p-4 mb-6 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Perihal</span>
                                <span className="text-slate-700 font-medium">{submittedSurat.perihal}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Tujuan</span>
                                <span className="text-slate-700 font-medium">{submittedSurat.tujuanUnit}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Jenis</span>
                                <span className="text-slate-700 font-medium">{submittedSurat.jenisSurat}</span>
                            </div>
                        </div>

                        <p className="text-xs text-slate-400 mb-6">
                            Simpan nomor referensi ini untuk keperluan tracking. Tim kami akan memproses surat Anda dalam 1-3 hari kerja.
                        </p>

                        <button
                            onClick={handleClose}
                            className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold rounded-xl hover:from-teal-600 hover:to-teal-700 transition-all shadow-lg"
                        >
                            Kembali ke Beranda
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Step Content
    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Nama Lengkap *</label>
                            <input
                                type="text"
                                value={data.namaPengirim}
                                onChange={(e) => setData({ ...data, namaPengirim: e.target.value })}
                                placeholder="Masukkan nama lengkap"
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Email *</label>
                            <input
                                type="email"
                                value={data.emailPengirim}
                                onChange={(e) => setData({ ...data, emailPengirim: e.target.value })}
                                placeholder="contoh@email.com"
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Nomor Telepon *</label>
                            <input
                                type="tel"
                                value={data.teleponPengirim}
                                onChange={(e) => setData({ ...data, teleponPengirim: e.target.value })}
                                placeholder="08xxxxxxxxxx"
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                            />
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Instansi / Organisasi *</label>
                            <input
                                type="text"
                                value={data.instansiPengirim}
                                onChange={(e) => setData({ ...data, instansiPengirim: e.target.value })}
                                placeholder="Nama instansi atau organisasi"
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Alamat</label>
                            <textarea
                                value={data.alamatPengirim}
                                onChange={(e) => setData({ ...data, alamatPengirim: e.target.value })}
                                placeholder="Alamat lengkap (opsional)"
                                rows={3}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all resize-none"
                            />
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Unit Tujuan *</label>
                            <select
                                value={data.tujuanUnit}
                                onChange={(e) => setData({ ...data, tujuanUnit: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all bg-white"
                            >
                                <option value="">Pilih unit tujuan</option>
                                {UNIT_OPTIONS.map((unit) => (
                                    <option key={unit} value={unit}>{unit}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Jenis Surat *</label>
                            <div className="grid grid-cols-2 gap-2">
                                {JENIS_SURAT_OPTIONS.map((jenis) => (
                                    <button
                                        key={jenis}
                                        type="button"
                                        onClick={() => setData({ ...data, jenisSurat: jenis })}
                                        className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${data.jenisSurat === jenis
                                                ? "bg-teal-500 border-teal-500 text-white"
                                                : "bg-white border-slate-200 text-slate-600 hover:border-teal-300"
                                            }`}
                                    >
                                        {jenis}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case 4:
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Perihal / Subjek *</label>
                            <input
                                type="text"
                                value={data.perihal}
                                onChange={(e) => setData({ ...data, perihal: e.target.value })}
                                placeholder="Perihal surat"
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Isi Surat / Pesan *</label>
                            <textarea
                                value={data.isiSurat}
                                onChange={(e) => setData({ ...data, isiSurat: e.target.value })}
                                placeholder="Tuliskan isi surat atau pesan Anda..."
                                rows={6}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all resize-none"
                            />
                        </div>
                    </div>
                );
            case 5:
                return (
                    <div className="space-y-4">
                        <p className="text-sm text-slate-500 mb-4">Periksa kembali data surat Anda sebelum mengirim:</p>

                        <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Identitas Pengirim</h4>
                            <div className="space-y-1.5">
                                <p className="text-sm"><span className="text-slate-400">Nama:</span> <span className="font-medium text-slate-700">{data.namaPengirim}</span></p>
                                <p className="text-sm"><span className="text-slate-400">Email:</span> <span className="font-medium text-slate-700">{data.emailPengirim}</span></p>
                                <p className="text-sm"><span className="text-slate-400">Telepon:</span> <span className="font-medium text-slate-700">{data.teleponPengirim}</span></p>
                                <p className="text-sm"><span className="text-slate-400">Instansi:</span> <span className="font-medium text-slate-700">{data.instansiPengirim}</span></p>
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Detail Surat</h4>
                            <div className="space-y-1.5">
                                <p className="text-sm"><span className="text-slate-400">Tujuan:</span> <span className="font-medium text-slate-700">{data.tujuanUnit}</span></p>
                                <p className="text-sm"><span className="text-slate-400">Jenis:</span> <span className="font-medium text-slate-700">{data.jenisSurat}</span></p>
                                <p className="text-sm"><span className="text-slate-400">Perihal:</span> <span className="font-medium text-slate-700">{data.perihal}</span></p>
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-4">
                            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Isi Surat</h4>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{data.isiSurat}</p>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    const stepTitles = ["Identitas", "Instansi", "Tujuan", "Isi Surat", "Konfirmasi"];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}>
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Surat Elektronik</h2>
                        <p className="text-xs text-slate-400">Langkah {step} dari {TOTAL_STEPS} — {stepTitles[step - 1]}</p>
                    </div>
                    <button onClick={handleClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="px-6 py-3 bg-slate-50 border-b border-slate-100">
                    <div className="flex gap-1.5">
                        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                            <div
                                key={i}
                                className={`flex-1 h-1.5 rounded-full transition-all ${i < step ? "bg-teal-500" : "bg-slate-200"
                                    }`}
                            />
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {renderStepContent()}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
                    {step > 1 && (
                        <button
                            onClick={handleBack}
                            className="px-6 py-3 border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50 transition-all"
                        >
                            Kembali
                        </button>
                    )}
                    {step < TOTAL_STEPS ? (
                        <button
                            onClick={handleNext}
                            disabled={!canProceed()}
                            className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold rounded-xl hover:from-teal-600 hover:to-teal-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Lanjutkan
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg"
                        >
                            Kirim Surat
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
