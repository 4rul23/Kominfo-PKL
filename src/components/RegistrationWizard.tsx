"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import SuccessScreen from "./SuccessScreen";
import { addVisitor } from "@/lib/visitorStore";
import { type VisitorStatus } from "@/lib/visitorWorkflow";

interface WizardData {
    name: string;
    nip: string;
    jabatan: string;
    organization: string;
    asalDaerah: string;
    provinsi: string;
    unit: string;
    purpose: string;
    nomorSurat: string;
}

const TOTAL_STEPS = 6;

export default function RegistrationWizard({
    isOpen,
    onClose,
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [data, setData] = useState<WizardData>({
        name: "",
        nip: "",
        jabatan: "",
        organization: "",
        asalDaerah: "",
        provinsi: "",
        unit: "",
        purpose: "",
        nomorSurat: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submittedVisitor, setSubmittedVisitor] = useState<{ trackingId: string; status: VisitorStatus } | null>(null);
    const [formError, setFormError] = useState("");
    const [unitStatuses, setUnitStatuses] = useState<Record<string, { status: "available" | "busy" | "unavailable"; note: string }>>({});
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 500);
            fetch("/api/units/status")
                .then(res => res.json())
                .then(data => setUnitStatuses(data || {}))
                .catch(() => { });
        }
    }, [step, isOpen]);

    const handleNext = () => {
        setFormError("");
        if (step === 1 && data.name.trim().length < 3) {
            setFormError("Nama minimal 3 karakter.");
            return;
        }
        if (step === 2 && data.organization.trim().length < 3) {
            setFormError("Instansi minimal 3 karakter.");
            return;
        }
        if (step === 3) {
            const nip = data.nip.trim();
            if (!/^\d{8,20}$/.test(nip)) {
                setFormError("NIP / NIK harus berupa 8-20 digit angka.");
                return;
            }
        }
        if (step === 4 && !data.unit.trim()) {
            setFormError("Pilih unit tujuan terlebih dahulu.");
            return;
        }
        if (step === 5 && data.asalDaerah.trim() && data.asalDaerah.trim().length < 2) {
            setFormError("Asal daerah minimal 2 karakter jika diisi.");
            return;
        }
        if (step === 6 && data.purpose.trim().length < 6) {
            setFormError("Keperluan minimal 6 karakter.");
            return;
        }
        setStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
    };

    const handleBack = () => setStep((prev) => Math.max(prev - 1, 1));

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setFormError("");

        try {
            const visitor = await addVisitor({
                name: data.name,
                nip: data.nip || "-",
                jabatan: data.jabatan || "-",
                organization: data.organization,
                asalDaerah: data.asalDaerah || "-",
                provinsi: data.provinsi || "-",
                unit: data.unit || "-",
                purpose: data.purpose,
                nomorSurat: data.nomorSurat || "-",
            });
            setSubmittedVisitor({ trackingId: visitor.trackingId, status: visitor.status });
            setTimeout(() => {
                setIsSubmitting(false);
                setStep(TOTAL_STEPS + 1);
            }, 1000);
        } catch (error) {
            setFormError(error instanceof Error ? error.message : "Gagal menyimpan kunjungan.");
            setIsSubmitting(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && step < TOTAL_STEPS) handleNext();
    };

    if (!isOpen) return null;

    const stepColors = [
        { bg: "bg-red-50", text: "text-[#991b1b]", border: "border-red-100", focus: "focus:border-[#991b1b]" },
        { bg: "bg-pink-50", text: "text-pink-600", border: "border-pink-100", focus: "focus:border-pink-500" },
        { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-100", focus: "focus:border-purple-500" },
        { bg: "bg-teal-50", text: "text-teal-600", border: "border-teal-100", focus: "focus:border-[#009FA9]" },
        { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100", focus: "focus:border-blue-500" },
        { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-100", focus: "focus:border-indigo-500" },
        { bg: "bg-yellow-50", text: "text-yellow-600", border: "border-yellow-100", focus: "focus:border-[#FFAB00]" },
        { bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-100", focus: "focus:border-rose-500" },
        { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100", focus: "focus:border-emerald-500" },
    ];

    const currentColor = stepColors[step - 1] || stepColors[0];
    const underlineInputClass = `w-full max-w-3xl mx-auto bg-transparent border-b-2 border-gray-200 text-3xl md:text-4xl text-center text-[#172B4D] placeholder:text-gray-300 ${currentColor.focus} py-3 transition-colors font-medium mt-4 focus:outline-none register-a11y-input`;
    const underlineInputWithIconClass = `w-full bg-transparent border-b-2 border-gray-200 text-2xl md:text-3xl text-left pl-16 pr-4 text-[#172B4D] placeholder:text-gray-300 ${currentColor.focus} py-3 transition-colors font-medium focus:outline-none register-a11y-input`;
    const compactUnderlineInputClass = "w-full max-w-md mx-auto bg-transparent border-b-2 border-gray-200 px-1 py-3 text-[#172B4D] font-bold text-center transition-colors placeholder:text-slate-300 focus:outline-none focus:border-[#FFAB00]";

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center transition-all duration-500 ease-out overflow-y-auto scrollbar-hide pb-12">
            <div className="absolute inset-0 bg-white/80 transition-all duration-500" />
            <div className="absolute inset-0 z-0 overflow-hidden opacity-30 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#991b1b]/5 rounded-full blur-[100px] animate-slow-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#009FA9]/10 rounded-full blur-[100px] animate-slow-pulse delay-700" style={{ animationDelay: '4s' }} />
            </div>

            {/* Header */}
            <div className="absolute top-0 left-0 w-full p-8 flex justify-between items-center z-20">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white shadow-sm border border-gray-100 rounded-xl flex items-center justify-center">
                        <Image src="/kominfos.svg" alt="Logo" width={24} height={24} className="opacity-80" />
                    </div>
                    <span className="font-bold text-[#172B4D] tracking-tight text-lg">Buku Tamu</span>
                </div>
                <button onClick={onClose} className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 border border-white/60 hover:bg-white hover:shadow-md transition-all text-[#505F79] hover:text-[#991b1b]">
                    <span className="text-xs font-bold tracking-wider uppercase">Tutup</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Main Content */}
            <div className={`relative z-10 w-full px-6 flex flex-col items-center text-center ${step === 4 ? 'max-w-5xl pt-16' : 'max-w-3xl pt-32'}`}>
                {/* Progress */}
                {step <= TOTAL_STEPS && (
                    <div className={`flex items-center gap-1.5 ${step === 4 ? 'mb-6' : 'mb-12'}`}>
                        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                            <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i + 1 === step ? "w-10 bg-[#991b1b]" : i + 1 < step ? "w-3 bg-[#36B37E]" : "w-2 bg-gray-200"}`} />
                        ))}
                    </div>
                )}

                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, y: 15, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -15, scale: 0.98 }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className={`w-full flex flex-col items-center relative ${step === 4 ? "min-h-0 justify-start pb-8" : "min-h-[380px] justify-center"}`}
                    >
                        {/* Step 1: Nama */}
                        {step === 1 && (
                            <div className="w-full space-y-6">
                                <span className={`inline-block px-3 py-1 ${currentColor.bg} ${currentColor.text} text-[0.7rem] font-bold uppercase tracking-wider rounded-lg border ${currentColor.border} mb-2`}>
                                    Langkah 1 dari {TOTAL_STEPS}
                                </span>
                                <h2 className="text-4xl md:text-5xl font-extrabold text-[#172B4D] tracking-tight leading-tight">Siapa nama Anda?</h2>
                                <p className="text-[#505F79] text-lg font-medium">Masukkan nama lengkap Anda.</p>
                                <input ref={inputRef} type="text" value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} onKeyDown={handleKeyDown} placeholder="Nama Lengkap..." className={underlineInputClass} />
                                {formError && <p className="text-sm font-semibold text-[#991b1b]">{formError}</p>}
                            </div>
                        )}

                        {/* Step 2: Instansi */}
                        {step === 2 && (
                            <div className="w-full space-y-6">
                                <span className={`inline-block px-3 py-1 ${currentColor.bg} ${currentColor.text} text-[0.7rem] font-bold uppercase tracking-wider rounded-lg border ${currentColor.border} mb-2`}>
                                    Langkah 2 dari {TOTAL_STEPS}
                                </span>
                                <h2 className="text-4xl md:text-5xl font-extrabold text-[#172B4D] tracking-tight leading-tight">Asal Instansi?</h2>
                                <p className="text-[#505F79] text-lg font-medium">Organisasi atau lembaga Anda.</p>
                                <input ref={inputRef} type="text" value={data.organization} onChange={(e) => setData({ ...data, organization: e.target.value })} onKeyDown={handleKeyDown} placeholder="PT / Dinas / Umum..." className={underlineInputClass} />
                                {formError && <p className="text-sm font-semibold text-[#991b1b]">{formError}</p>}
                            </div>
                        )}

                        {/* Step 3: NIP/NIK */}
                        {step === 3 && (
                            <motion.div
                                className="w-full space-y-8 flex flex-col items-center"
                                initial="hidden" animate="visible" exit="exit"
                                variants={{
                                    hidden: { opacity: 0, x: 50 },
                                    visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 250, damping: 25, staggerChildren: 0.1 } },
                                    exit: { opacity: 0, x: -50 }
                                }}
                            >
                                <motion.span variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }} className={`inline-block px-3 py-1 ${currentColor.bg} ${currentColor.text} text-[0.75rem] font-bold uppercase tracking-widest rounded-lg border ${currentColor.border} mb-2 shadow-sm`}>
                                    Langkah 3 dari {TOTAL_STEPS}
                                </motion.span>
                                <motion.h2 variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }} className="text-4xl md:text-5xl font-extrabold text-[#172B4D] tracking-tight leading-tight">Validasi Identitas</motion.h2>
                                <motion.p variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }} className="text-[#505F79] text-lg font-medium">Masukkan NIP untuk ASN, atau NIK untuk Umum.</motion.p>

                                <motion.div variants={{ hidden: { scale: 0.9, opacity: 0 }, visible: { scale: 1, opacity: 1 } }} className="w-full max-w-xl relative mt-4">
                                    <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                            <line x1="16" y1="2" x2="16" y2="6"></line>
                                            <line x1="8" y1="2" x2="8" y2="6"></line>
                                            <line x1="3" y1="10" x2="21" y2="10"></line>
                                        </svg>
                                    </div>
                                    <input ref={inputRef} inputMode="numeric" type="text" value={data.nip} onChange={(e) => setData({ ...data, nip: e.target.value })} onKeyDown={handleKeyDown} placeholder="19700101... atau 7371..." className={underlineInputWithIconClass} />
                                </motion.div>
                                {formError && <p className="text-sm font-semibold text-[#991b1b]">{formError}</p>}
                            </motion.div>
                        )}

                        {/* Step 4: Unit Tujuan */}
                        {step === 4 && (
                            <motion.div
                                className="w-full space-y-4 flex flex-col items-center"
                                initial="hidden" animate="visible" exit="exit"
                                variants={{
                                    hidden: { opacity: 0, scale: 0.95 },
                                    visible: { opacity: 1, scale: 1, transition: { staggerChildren: 0.08 } },
                                    exit: { opacity: 0, scale: 0.95 }
                                }}
                            >
                                <motion.span variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }} className={`inline-block px-3 py-1 ${currentColor.bg} ${currentColor.text} text-[0.75rem] font-bold uppercase tracking-widest rounded-lg border ${currentColor.border} shadow-sm`}>
                                    Langkah 4 dari {TOTAL_STEPS}
                                </motion.span>
                                <motion.h2 variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="text-3xl md:text-4xl font-extrabold text-[#172B4D] tracking-tight leading-tight mt-2">Tujuan Kunjungan?</motion.h2>
                                <motion.p variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="text-[#505F79] text-base font-medium mt-1">Pilih unit yang ingin Anda tuju.</motion.p>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full mt-6">
                                    {[
                                        { label: "UPT Warroom", desc: "Ruang Komando & Pemantauan Kota Makassar", icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 7-7" /></svg> },
                                        { label: "Sekretariat Diskominfo", desc: "Administrasi umum, kepegawaian & perencanaan", icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18" /><path d="M5 21V7l8-4 8 4v14" /><path d="M9 21v-8h6v8" /></svg> },
                                        { label: "Bidang IKP", desc: "Informasi & Komunikasi Publik / Humas", icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg> },
                                        { label: "Bidang APTIKA", desc: "Aplikasi dan Informatika", icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9 9h6v6H9z" /></svg> },
                                        { label: "Bidang PDE Statistik", desc: "Pengolahan Data Elektronik dan Statistik", icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" /></svg> },
                                        { label: "Bidang Persandian dan Keamanan Informasi", desc: "Keamanan informasi & persandian daerah", icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="10" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg> },
                                    ].map((opt) => {
                                        const unitStatus = unitStatuses[opt.label];
                                        const isSelected = data.unit === opt.label;
                                        return (
                                            <motion.button
                                                key={opt.label}
                                                variants={{
                                                    hidden: { opacity: 0, y: 20 },
                                                    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 20 } }
                                                }}
                                                whileHover={{ scale: 1.02, y: -3 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => { setData({ ...data, unit: opt.label }); setTimeout(() => setStep(s => Math.min(s + 1, TOTAL_STEPS)), 200); }}
                                                className={`relative overflow-hidden px-5 py-5 rounded-2xl border-2 text-left transition-all duration-200 flex flex-col h-full ${isSelected ? "bg-gradient-to-r from-[#009FA9] to-[#007A82] text-white border-transparent shadow-lg shadow-[#009FA9]/25" : "bg-white/90 backdrop-blur-sm border-gray-100 text-[#172B4D] hover:border-[#009FA9]/30 hover:shadow-md"}`}
                                            >
                                                <div className="flex flex-col gap-3 relative z-10 h-full">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center ${isSelected ? "bg-white/20 text-white shadow-inner" : "bg-[#009FA9]/10 text-[#009FA9]"}`}>
                                                            {opt.icon}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <h3 className="font-bold text-base leading-tight">{opt.label}</h3>
                                                            <div className="mt-1">
                                                                {unitStatus && unitStatus.status !== "available" ? (
                                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${unitStatus.status === 'busy' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                                                        {unitStatus.status === 'busy' ? '● Sedang Sibuk' : '● Tidak Tersedia'}
                                                                    </span>
                                                                ) : (
                                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-600'}`}>● Tersedia</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <p className={`text-sm mt-1 leading-snug flex-1 ${isSelected ? "text-white/80" : "text-[#505F79]"}`}>{opt.desc}</p>
                                                    {unitStatus?.note && (
                                                        <p className={`text-xs mt-2 font-semibold italic ${isSelected ? 'text-white/90 bg-black/10 p-2 rounded-xl' : (unitStatus.status === 'busy' ? 'text-amber-800 bg-amber-50 p-2 rounded-xl' : 'text-red-800 bg-red-50 p-2 rounded-xl')}`}>
                                                            &ldquo;{unitStatus.note}&rdquo;
                                                        </p>
                                                    )}
                                                </div>
                                            </motion.button>
                                        );
                                    })}
                                </div>
                                {formError && <p className="text-sm font-semibold text-[#991b1b]">{formError}</p>}
                            </motion.div>
                        )}

                        {/* Step 5: Asal Daerah */}
                        {step === 5 && (
                            <div className="w-full space-y-6">
                                <span className={`inline-block px-3 py-1 ${currentColor.bg} ${currentColor.text} text-[0.7rem] font-bold uppercase tracking-wider rounded-lg border ${currentColor.border} mb-2`}>
                                    Langkah 5 dari {TOTAL_STEPS}
                                </span>
                                <h2 className="text-4xl md:text-5xl font-extrabold text-[#172B4D] tracking-tight leading-tight">Asal Daerah?</h2>
                                <p className="text-[#505F79] text-lg font-medium">Kota atau kabupaten asal instansi Anda berada.</p>
                                <input ref={inputRef} type="text" value={data.asalDaerah} onChange={(e) => setData({ ...data, asalDaerah: e.target.value })} onKeyDown={handleKeyDown} placeholder="Makassar, Gowa..." className={underlineInputClass} />
                                {formError && <p className="text-sm font-semibold text-[#991b1b]">{formError}</p>}
                            </div>
                        )}

                        {/* Step 6: Keperluan */}
                        {step === 6 && (
                            <div className="w-full space-y-6">
                                <span className={`inline-block px-3 py-1 ${currentColor.bg} ${currentColor.text} text-[0.7rem] font-bold uppercase tracking-wider rounded-lg border ${currentColor.border} mb-2`}>
                                    Langkah 6 dari {TOTAL_STEPS}
                                </span>
                                <h2 className="text-4xl md:text-5xl font-extrabold text-[#172B4D] tracking-tight leading-tight">Keperluan?</h2>
                                <p className="text-[#505F79] text-lg font-medium">Jelaskan maksud kunjungan Anda.</p>
                                <input ref={inputRef} type="text" value={data.purpose} onChange={(e) => setData({ ...data, purpose: e.target.value })} onKeyDown={handleKeyDown} placeholder="Koordinasi / Konsultasi..." className={underlineInputClass} />
                                <div className="mt-6">
                                    <label className="block text-xs font-bold text-[#505F79] uppercase mb-2">Nomor Surat (Opsional)</label>
                                    <input type="text" value={data.nomorSurat} onChange={(e) => setData({ ...data, nomorSurat: e.target.value })} placeholder="123/DK/2026" className={compactUnderlineInputClass} />
                                </div>
                                {formError && <p className="text-sm font-semibold text-[#991b1b]">{formError}</p>}
                            </div>
                        )}

                        {/* Success Screen */}
                        {step === TOTAL_STEPS + 1 && (
                            <div className="flex items-center justify-center w-full min-h-[inherit]">
                                <SuccessScreen
                                    visitorName={data.name}
                                    unit={data.unit || "-"}
                                    trackingId={submittedVisitor?.trackingId}
                                    photo={null}
                                    unitStatusInfo={data.unit ? unitStatuses[data.unit] : null}
                                    onTrack={() => router.push(`/guest/tracking?id=${encodeURIComponent(submittedVisitor?.trackingId || "")}`)}
                                    onClose={() => {
                                        setStep(1);
                                        setData({ name: "", nip: "", jabatan: "", organization: "", asalDaerah: "", provinsi: "", unit: "", purpose: "", nomorSurat: "" });
                                        setSubmittedVisitor(null);
                                        setFormError("");
                                        onClose();
                                    }}
                                />
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* Footer Navigation */}
                {
                    step <= TOTAL_STEPS && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className={`${step === 4 ? 'mt-8' : 'mt-16'} flex items-center justify-center gap-6`}>
                            {step > 1 && (
                                <motion.button whileHover={{ scale: 1.05, backgroundColor: "rgba(243, 244, 246, 1)" }} whileTap={{ scale: 0.95 }} onClick={handleBack} className="flex items-center gap-2 text-[#505F79]/60 hover:text-[#172B4D] transition-colors font-bold uppercase text-xs tracking-widest px-4 py-3 rounded-xl hover:bg-gray-100">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M19 12H5M12 19l-7-7 7-7" />
                                    </svg>
                                    Kembali
                                </motion.button>
                            )}
                            <motion.button
                                whileHover={{ scale: 1.05, y: -4 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={step < TOTAL_STEPS ? handleNext : handleSubmit}
                                disabled={isSubmitting}
                                className={`group flex items-center justify-center gap-3 px-10 py-4 text-white rounded-3xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${step === TOTAL_STEPS ? "bg-[#991b1b] shadow-[0_8px_30px_rgba(211,47,47,0.25)] hover:bg-[#b91c1c]" : "bg-[#009FA9] shadow-[0_8px_30px_rgba(0,159,169,0.25)] hover:bg-[#007A82]"}`}
                            >
                                <span className="font-extrabold text-lg tracking-wide">
                                    {isSubmitting ? "Memproses..." : step < TOTAL_STEPS ? "Lanjut" : "Simpan Data"}
                                </span>
                                {!isSubmitting && (
                                    <motion.svg initial={{ x: 0 }} animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                    </motion.svg>
                                )}
                            </motion.button>
                        </motion.div>
                    )
                }
            </div >
        </div >
    );
}
