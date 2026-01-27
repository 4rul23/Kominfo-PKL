"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { addSurat, SuratElektronik, Attachment } from "@/lib/suratStore";

interface SuratData {
    namaPengirim: string;
    emailPengirim: string;
    teleponPengirim: string;
    instansiPengirim: string;
    alamatPengirim: string;
    perihal: string;
    jenisSurat: string;
    tujuanUnit: string;
    isiSurat: string;
    lampiran: Attachment[];
}

const TOTAL_STEPS = 7;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg", "image/png"];
const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"];

const UNIT_OPTIONS = [
    { id: "ikp", name: "Bidang IKP", desc: "Informasi dan Komunikasi Publik" },
    { id: "aptika", name: "Bidang Aptika", desc: "Aplikasi dan Informatika" },
    { id: "statistik", name: "Bidang Statistik", desc: "Data dan Statistik" },
    { id: "egov", name: "Bidang E-Government", desc: "Sistem Pemerintahan Elektronik" },
    { id: "sekretariat", name: "Sekretariat", desc: "Administrasi Umum" },
];

const JENIS_SURAT_OPTIONS = [
    { id: "permohonan", label: "Permohonan", desc: "Permintaan data atau layanan" },
    { id: "undangan", label: "Undangan", desc: "Undangan rapat atau kegiatan" },
    { id: "laporan", label: "Laporan", desc: "Laporan hasil kegiatan" },
    { id: "pengaduan", label: "Pengaduan", desc: "Pengaduan terkait layanan" },
    { id: "informasi", label: "Informasi", desc: "Permintaan informasi publik" },
    { id: "lainnya", label: "Lainnya", desc: "Jenis surat lainnya" },
];

const STEP_CONFIG = [
    { title: "Identitas", num: 1 },
    { title: "Instansi", num: 2 },
    { title: "Jenis", num: 3 },
    { title: "Tujuan", num: 4 },
    { title: "Isi Surat", num: 5 },
    { title: "Lampiran", num: 6 },
    { title: "Konfirmasi", num: 7 },
];

export default function SuratPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [submittedSurat, setSubmittedSurat] = useState<SuratElektronik | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [uploadError, setUploadError] = useState<string>("");
    const inputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [data, setData] = useState<SuratData>({
        namaPengirim: "",
        emailPengirim: "",
        teleponPengirim: "",
        instansiPengirim: "",
        alamatPengirim: "",
        perihal: "",
        jenisSurat: "",
        tujuanUnit: "",
        isiSurat: "",
        lampiran: [],
    });

    useEffect(() => {
        setTimeout(() => {
            if (step === 5) textareaRef.current?.focus();
            else if (step !== 3 && step !== 4 && step !== 6) inputRef.current?.focus();
        }, 400);
    }, [step]);

    const handleFileUpload = useCallback(async (files: FileList | null) => {
        if (!files) return;
        setUploadError("");
        const newAttachments: Attachment[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (data.lampiran.length + newAttachments.length >= 3) {
                setUploadError("Maksimal 3 file lampiran");
                break;
            }
            if (!ALLOWED_TYPES.includes(file.type)) {
                setUploadError(`Format ${file.name} tidak didukung`);
                continue;
            }
            if (file.size > MAX_FILE_SIZE) {
                setUploadError(`${file.name} terlalu besar (max 5MB)`);
                continue;
            }

            const reader = new FileReader();
            const base64 = await new Promise<string>((resolve) => {
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });

            newAttachments.push({
                id: crypto.randomUUID(),
                filename: file.name,
                type: file.type,
                size: file.size,
                data: base64,
                uploadedAt: new Date().toISOString(),
            });
        }

        if (newAttachments.length > 0) {
            setData(prev => ({ ...prev, lampiran: [...prev.lampiran, ...newAttachments] }));
        }
    }, [data.lampiran.length]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        handleFileUpload(e.dataTransfer.files);
    }, [handleFileUpload]);

    const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); }, []);
    const handleDragLeave = useCallback(() => setIsDragOver(false), []);
    const removeAttachment = (id: string) => setData(prev => ({ ...prev, lampiran: prev.lampiran.filter(a => a.id !== id) }));

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    const handleNext = () => {
        if (step === 1 && !data.namaPengirim.trim()) return;
        if (step === 2 && !data.instansiPengirim.trim()) return;
        if (step === 3 && !data.jenisSurat) return;
        if (step === 4 && !data.tujuanUnit) return;
        if (step === 5 && (!data.perihal.trim() || !data.isiSurat.trim())) return;
        setStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
    };

    const handleBack = () => setStep((prev) => Math.max(prev - 1, 1));

    const handleSubmit = () => {
        setIsSubmitting(true);
        const result = addSurat(data);
        setTimeout(() => {
            setSubmittedSurat(result);
            setIsSubmitting(false);
            setStep(TOTAL_STEPS + 1);
        }, 1500);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && step < TOTAL_STEPS && step !== 5 && step !== 6) handleNext();
    };

    const handleClose = () => router.push("/");



    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center transition-all duration-500 ease-out overflow-y-auto scrollbar-hide pb-12 bg-[#f8fafc]">
            <div className="absolute inset-0 bg-white/80 transition-all duration-500" />
            <div className="absolute inset-0 z-0 overflow-hidden opacity-30 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#009FA9]/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#d02b29]/5 rounded-full blur-[100px]" />
            </div>

            {/* Header */}
            <header className="absolute top-0 left-0 w-full p-8 flex justify-between items-center z-20">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white shadow-sm border border-gray-100 rounded-xl flex items-center justify-center">
                        <Image src="/lontara.svg" alt="Logo" width={24} height={24} className="opacity-80" />
                    </div>
                    <div>
                        <span className="font-bold text-[#172B4D] tracking-tight text-lg block">Surat Elektronik</span>
                        <span className="text-xs text-[#6B778C]">Diskominfo Kota Makassar</span>
                    </div>
                </div>
                <button onClick={handleClose} className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 border border-white/60 hover:bg-white hover:shadow-md transition-all text-[#505F79] hover:text-[#d02b29]">
                    <span className="text-xs font-bold tracking-wider uppercase">Tutup</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>
            </header>

            {/* Main Content */}
            <main className="relative z-10 w-full max-w-3xl px-6 flex flex-col items-center text-center pt-32">
                {/* Progress */}
                {step <= TOTAL_STEPS && (
                    <div className="flex items-center gap-1.5 mb-12">
                        {STEP_CONFIG.map((s, i) => (
                            <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i + 1 === step ? "w-10 bg-[#009FA9]" : i + 1 < step ? "w-3 bg-[#36B37E]" : "w-2 bg-gray-200"}`} />
                        ))}
                    </div>
                )}

                <div className="w-full min-h-[400px] flex flex-col items-center justify-center animate-fade-in-up">
                    {/* Step 1: Identity */}
                    {step === 1 && (
                        <div className="w-full space-y-6">
                            <span className="inline-block px-3 py-1 bg-[#009FA9]/10 text-[#009FA9] text-[0.7rem] font-bold uppercase tracking-wider rounded-lg border border-[#009FA9]/20 mb-2">
                                Langkah 1 dari {TOTAL_STEPS}
                            </span>
                            <h2 className="text-4xl md:text-5xl font-extrabold text-[#172B4D] tracking-tight leading-tight">
                                Siapa nama <span className="text-[#009FA9]">Anda</span>?
                            </h2>
                            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4 text-left">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={data.namaPengirim}
                                    onChange={(e) => setData({ ...data, namaPengirim: e.target.value })}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Nama Lengkap"
                                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-5 py-4 text-[#172B4D] text-xl font-medium placeholder:text-gray-400 focus:outline-none focus:border-[#009FA9] focus:bg-white transition-all"
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="email"
                                        value={data.emailPengirim}
                                        onChange={(e) => setData({ ...data, emailPengirim: e.target.value })}
                                        placeholder="Email"
                                        className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[#172B4D] placeholder:text-gray-400 focus:outline-none focus:border-[#009FA9] transition-all"
                                    />
                                    <input
                                        type="tel"
                                        value={data.teleponPengirim}
                                        onChange={(e) => setData({ ...data, teleponPengirim: e.target.value })}
                                        placeholder="No. Telepon"
                                        className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[#172B4D] placeholder:text-gray-400 focus:outline-none focus:border-[#009FA9] transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Institution */}
                    {step === 2 && (
                        <div className="w-full space-y-6">
                            <span className="inline-block px-3 py-1 bg-[#009FA9]/10 text-[#009FA9] text-[0.7rem] font-bold uppercase tracking-wider rounded-lg border border-[#009FA9]/20 mb-2">
                                Langkah 2 dari {TOTAL_STEPS}
                            </span>
                            <h2 className="text-4xl md:text-5xl font-extrabold text-[#172B4D] tracking-tight leading-tight">
                                Asal <span className="text-[#009FA9]">Instansi</span>?
                            </h2>
                            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4 text-left">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={data.instansiPengirim}
                                    onChange={(e) => setData({ ...data, instansiPengirim: e.target.value })}
                                    onKeyDown={handleKeyDown}
                                    placeholder="PT / Dinas / Organisasi"
                                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-5 py-4 text-[#172B4D] text-xl font-medium placeholder:text-gray-400 focus:outline-none focus:border-[#009FA9] focus:bg-white transition-all"
                                />
                                <textarea
                                    value={data.alamatPengirim}
                                    onChange={(e) => setData({ ...data, alamatPengirim: e.target.value })}
                                    placeholder="Alamat lengkap (opsional)"
                                    rows={2}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[#172B4D] placeholder:text-gray-400 focus:outline-none focus:border-[#009FA9] transition-all resize-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 3: Letter Type */}
                    {step === 3 && (
                        <div className="w-full space-y-6">
                            <span className="inline-block px-3 py-1 bg-[#009FA9]/10 text-[#009FA9] text-[0.7rem] font-bold uppercase tracking-wider rounded-lg border border-[#009FA9]/20 mb-2">
                                Langkah 3 dari {TOTAL_STEPS}
                            </span>
                            <h2 className="text-4xl md:text-5xl font-extrabold text-[#172B4D] tracking-tight leading-tight">
                                Jenis <span className="text-[#009FA9]">Surat</span>?
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {JENIS_SURAT_OPTIONS.map((jenis) => (
                                    <button
                                        key={jenis.id}
                                        onClick={() => { setData({ ...data, jenisSurat: jenis.label }); setTimeout(() => setStep(s => s + 1), 200); }}
                                        className={`group p-5 rounded-2xl border-2 transition-all duration-200 text-left hover:-translate-y-1 ${data.jenisSurat === jenis.label
                                            ? "bg-[#009FA9] text-white border-[#009FA9] shadow-lg shadow-[#009FA9]/20"
                                            : "bg-white border-gray-200 text-[#505F79] hover:border-[#009FA9] hover:shadow-md"
                                            }`}
                                    >
                                        <span className={`font-bold block ${data.jenisSurat === jenis.label ? "text-white" : "text-[#172B4D]"}`}>
                                            {jenis.label}
                                        </span>
                                        <span className={`text-xs ${data.jenisSurat === jenis.label ? "text-white/80" : "text-gray-400"}`}>
                                            {jenis.desc}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 4: Target Unit */}
                    {step === 4 && (
                        <div className="w-full space-y-6">
                            <span className="inline-block px-3 py-1 bg-[#009FA9]/10 text-[#009FA9] text-[0.7rem] font-bold uppercase tracking-wider rounded-lg border border-[#009FA9]/20 mb-2">
                                Langkah 4 dari {TOTAL_STEPS}
                            </span>
                            <h2 className="text-4xl md:text-5xl font-extrabold text-[#172B4D] tracking-tight leading-tight">
                                Unit <span className="text-[#009FA9]">Tujuan</span>?
                            </h2>
                            <div className="space-y-3">
                                {UNIT_OPTIONS.map((unit) => (
                                    <button
                                        key={unit.id}
                                        onClick={() => { setData({ ...data, tujuanUnit: unit.name }); setTimeout(() => setStep(s => s + 1), 200); }}
                                        className={`w-full group flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-200 text-left hover:-translate-y-0.5 ${data.tujuanUnit === unit.name
                                            ? "border-[#009FA9] bg-[#009FA9]/5 shadow-md"
                                            : "border-gray-200 bg-white hover:border-[#009FA9]/50 hover:shadow-md"
                                            }`}
                                    >
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${data.tujuanUnit === unit.name ? "bg-[#009FA9] text-white" : "bg-gray-100 text-gray-500"
                                            }`}>
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" /><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" /><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" /><path d="M10 6h4" /><path d="M10 10h4" /><path d="M10 14h4" /><path d="M10 18h4" /></svg>
                                        </div>
                                        <div className="flex-1">
                                            <span className="text-[#172B4D] font-bold block">{unit.name}</span>
                                            <span className="text-gray-400 text-sm">{unit.desc}</span>
                                        </div>
                                        {data.tujuanUnit === unit.name && (
                                            <div className="w-8 h-8 rounded-full bg-[#36B37E] flex items-center justify-center text-white">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 5: Letter Content */}
                    {step === 5 && (
                        <div className="w-full space-y-6">
                            <span className="inline-block px-3 py-1 bg-[#009FA9]/10 text-[#009FA9] text-[0.7rem] font-bold uppercase tracking-wider rounded-lg border border-[#009FA9]/20 mb-2">
                                Langkah 5 dari {TOTAL_STEPS}
                            </span>
                            <h2 className="text-4xl md:text-5xl font-extrabold text-[#172B4D] tracking-tight leading-tight">
                                Isi <span className="text-[#009FA9]">Surat</span>
                            </h2>
                            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4 text-left">
                                <div>
                                    <label className="block text-[#6B778C] text-sm font-medium mb-2">Perihal / Subjek</label>
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={data.perihal}
                                        onChange={(e) => setData({ ...data, perihal: e.target.value })}
                                        placeholder="Perihal surat Anda..."
                                        className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-[#172B4D] font-semibold placeholder:text-gray-400 focus:outline-none focus:border-[#009FA9] focus:bg-white transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[#6B778C] text-sm font-medium mb-2">Isi Surat</label>
                                    <textarea
                                        ref={textareaRef}
                                        value={data.isiSurat}
                                        onChange={(e) => setData({ ...data, isiSurat: e.target.value })}
                                        placeholder="Tuliskan isi surat atau pesan Anda di sini..."
                                        rows={6}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[#172B4D] placeholder:text-gray-400 focus:outline-none focus:border-[#009FA9] transition-all resize-none"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 6: Attachments */}
                    {step === 6 && (
                        <div className="w-full space-y-6">
                            <span className="inline-block px-3 py-1 bg-[#009FA9]/10 text-[#009FA9] text-[0.7rem] font-bold uppercase tracking-wider rounded-lg border border-[#009FA9]/20 mb-2">
                                Langkah 6 dari {TOTAL_STEPS}
                            </span>
                            <h2 className="text-4xl md:text-5xl font-extrabold text-[#172B4D] tracking-tight leading-tight">
                                <span className="text-[#009FA9]">Lampiran</span>
                            </h2>
                            <p className="text-[#6B778C]">Unggah dokumen pendukung (opsional)</p>

                            {/* Drop Zone */}
                            <div
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onClick={() => fileInputRef.current?.click()}
                                className={`p-10 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300 ${isDragOver
                                    ? "border-[#009FA9] bg-[#009FA9]/5 scale-[1.02]"
                                    : "border-gray-300 bg-white hover:border-[#009FA9]/50 hover:bg-gray-50"
                                    }`}
                            >
                                <input ref={fileInputRef} type="file" multiple accept={ALLOWED_EXTENSIONS.join(",")} onChange={(e) => handleFileUpload(e.target.files)} className="hidden" />
                                <div className="flex flex-col items-center gap-4">
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${isDragOver ? "bg-[#009FA9] text-white" : "bg-[#009FA9]/10 text-[#009FA9]"}`}>
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                            <polyline points="17 8 12 3 7 8" />
                                            <line x1="12" y1="3" x2="12" y2="15" />
                                        </svg>
                                    </div>
                                    <div className="text-center">
                                        <p className="font-bold text-[#172B4D]">Seret file atau klik untuk memilih</p>
                                        <p className="text-gray-400 text-sm mt-1">PDF, DOC, JPG, PNG • Max 5MB • Max 3 file</p>
                                    </div>
                                </div>
                            </div>

                            {/* Error */}
                            {uploadError && (
                                <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                                    {uploadError}
                                </div>
                            )}

                            {/* Files */}
                            {data.lampiran.length > 0 && (
                                <div className="space-y-2">
                                    {data.lampiran.map((file) => (
                                        <div key={file.id} className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl">
                                            <div className="w-10 h-10 rounded-lg bg-[#009FA9]/10 flex items-center justify-center text-[#009FA9]">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
                                            </div>
                                            <div className="flex-1 text-left min-w-0">
                                                <p className="font-medium text-[#172B4D] truncate">{file.filename}</p>
                                                <p className="text-gray-400 text-xs">{formatFileSize(file.size)}</p>
                                            </div>
                                            <button onClick={() => removeAttachment(file.id)} className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 7: Confirmation */}
                    {step === 7 && (
                        <div className="w-full space-y-6">
                            <span className="inline-block px-3 py-1 bg-[#36B37E]/10 text-[#36B37E] text-[0.7rem] font-bold uppercase tracking-wider rounded-lg border border-[#36B37E]/20 mb-2">
                                Langkah Terakhir
                            </span>
                            <h2 className="text-4xl md:text-5xl font-extrabold text-[#172B4D] tracking-tight leading-tight">
                                <span className="text-[#36B37E]">Konfirmasi</span>
                            </h2>

                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden text-left">
                                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                                    <div className="p-6">
                                        <h4 className="text-[#6B778C] text-xs font-bold uppercase tracking-wider mb-3">Pengirim</h4>
                                        <p className="text-[#172B4D] font-bold text-lg">{data.namaPengirim}</p>
                                        <p className="text-[#505F79]">{data.instansiPengirim}</p>
                                        <div className="flex flex-wrap gap-2 mt-2 text-sm text-gray-400">
                                            {data.emailPengirim && <span>{data.emailPengirim}</span>}
                                            {data.teleponPengirim && <span>• {data.teleponPengirim}</span>}
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <h4 className="text-[#6B778C] text-xs font-bold uppercase tracking-wider mb-3">Detail Surat</h4>
                                        <div className="flex gap-2">
                                            <span className="px-3 py-1 bg-[#009FA9]/10 text-[#009FA9] text-sm font-medium rounded-lg">{data.jenisSurat}</span>
                                            <span className="px-3 py-1 bg-blue-50 text-blue-600 text-sm font-medium rounded-lg">{data.tujuanUnit}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="border-t border-gray-100 p-6">
                                    <h4 className="text-[#6B778C] text-xs font-bold uppercase tracking-wider mb-2">Perihal</h4>
                                    <p className="text-[#172B4D] font-bold mb-4">{data.perihal}</p>
                                    <h4 className="text-[#6B778C] text-xs font-bold uppercase tracking-wider mb-2">Isi Surat</h4>
                                    <p className="text-[#505F79] text-sm whitespace-pre-wrap">{data.isiSurat}</p>
                                </div>
                                {data.lampiran.length > 0 && (
                                    <div className="border-t border-gray-100 p-6">
                                        <h4 className="text-[#6B778C] text-xs font-bold uppercase tracking-wider mb-3">Lampiran ({data.lampiran.length})</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {data.lampiran.map((file) => (
                                                <span key={file.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-[#505F79] text-sm rounded-lg">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
                                                    {file.filename}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Success Screen */}
                    {step === TOTAL_STEPS + 1 && submittedSurat && (
                        <div className="text-center space-y-8 animate-fade-in-up">
                            <div className="w-24 h-24 mx-auto rounded-3xl bg-[#36B37E] flex items-center justify-center shadow-lg">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-4xl md:text-5xl font-extrabold text-[#172B4D] tracking-tight">Surat Terkirim!</h2>
                                <p className="text-[#6B778C] mt-2">Surat elektronik Anda berhasil disubmit</p>
                            </div>

                            <div className="bg-[#36B37E]/5 border-2 border-[#36B37E]/20 rounded-2xl p-8 max-w-md mx-auto">
                                <p className="text-[#36B37E] text-xs font-bold uppercase tracking-wider mb-2">Tracking ID</p>
                                <p className="text-4xl font-black text-[#172B4D] tracking-wider font-mono">{submittedSurat.trackingId}</p>
                                <div className="mt-6 pt-6 border-t border-[#36B37E]/10">
                                    <p className="text-[#36B37E] text-xs font-bold uppercase tracking-wider mb-1">Nomor Surat</p>
                                    <p className="text-[#505F79] font-medium">{submittedSurat.nomorSurat}</p>
                                </div>
                            </div>

                            <p className="text-gray-400 text-sm max-w-md mx-auto">
                                Simpan <strong className="text-[#172B4D]">Tracking ID</strong> untuk melacak status surat Anda. Tim kami akan memproses dalam 1-3 hari kerja.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <button onClick={() => router.push("/surat/tracking?id=" + submittedSurat.trackingId)} className="px-8 py-4 bg-white border-2 border-gray-200 text-[#505F79] font-bold rounded-2xl hover:border-[#009FA9] hover:text-[#009FA9] transition-all">
                                    Lacak Surat
                                </button>
                                <button onClick={handleClose} className="px-8 py-4 bg-[#009FA9] text-white font-bold rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
                                    Kembali ke Beranda
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                {step <= TOTAL_STEPS && (
                    <div className="mt-12 flex items-center gap-6">
                        {step > 1 && (
                            <button onClick={handleBack} className="flex items-center gap-2 px-6 py-3 text-[#505F79] hover:text-[#172B4D] transition-colors font-bold uppercase text-xs tracking-widest rounded-xl hover:bg-gray-100">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M19 12H5M12 19l-7-7 7-7" />
                                </svg>
                                Kembali
                            </button>
                        )}
                        {(step === 1 || step === 2 || step === 5 || step === 6 || step === 7) && (
                            <button
                                onClick={step < TOTAL_STEPS ? handleNext : handleSubmit}
                                disabled={isSubmitting}
                                className="group flex items-center gap-3 px-10 py-4 bg-[#009FA9] text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50"
                            >
                                <span>
                                    {isSubmitting ? "Mengirim..." : step < TOTAL_STEPS ? (step === 6 ? (data.lampiran.length > 0 ? "Lanjut" : "Lewati") : "Lanjut") : "Kirim Surat"}
                                </span>
                                {!isSubmitting && (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform">
                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                )}
                            </button>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
