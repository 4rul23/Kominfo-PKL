"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import SuccessScreen from "./SuccessScreen";
import { addVisitor } from "@/lib/visitorStore";
import { createCaseFromVisitor } from "@/lib/caseStore";

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

const TOTAL_STEPS = 9;

export default function RegistrationWizard({
    isOpen,
    onClose,
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
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
    const [signature, setSignature] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawing = useRef(false);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 500);
        }
    }, [step, isOpen]);

    // Canvas Logic
    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        isDrawing.current = true;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.strokeStyle = "#009FA9";
        const { offsetX, offsetY } = getCoordinates(e, canvas);
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!ctx || !canvas) return;
        const { offsetX, offsetY } = getCoordinates(e, canvas);
        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (isDrawing.current) {
            isDrawing.current = false;
            const canvas = canvasRef.current;
            if (canvas) setSignature(canvas.toDataURL());
        }
    };

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
        let clientX: number, clientY: number;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }
        const rect = canvas.getBoundingClientRect();
        return { offsetX: clientX - rect.left, offsetY: clientY - rect.top };
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            setSignature(null);
        }
    };

    const handleNext = () => {
        // Only require name, instansi asal, unit tujuan, dan keperluan
        if (step === 1 && !data.name.trim()) return;
        if (step === 2 && !data.organization.trim()) return;
        if (step === 4 && !data.nip.trim()) return;
        if (step === 5 && !data.unit.trim()) return;
        if (step === 8 && !data.purpose.trim()) return;
        setStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
    };

    const handleBack = () => setStep((prev) => Math.max(prev - 1, 1));

    const handleSubmit = () => {
        if (!signature && step === TOTAL_STEPS) return;
        setIsSubmitting(true);

        const v = addVisitor({
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
        // Dummy flow: create a case so Resepsionis can triage/assign it.
        createCaseFromVisitor(v);

        setTimeout(() => {
            setIsSubmitting(false);
            setStep(TOTAL_STEPS + 1); // Success screen
        }, 1500);
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
            <div className="relative z-10 w-full max-w-3xl px-6 flex flex-col items-center text-center pt-32">
                {/* Progress */}
                {step <= TOTAL_STEPS && (
                    <div className="flex items-center gap-1.5 mb-12">
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
                        className="w-full min-h-[380px] flex flex-col items-center justify-center relative"
                    >
                        {/* Step 1: Nama */}
                        {step === 1 && (
                            <div className="w-full space-y-6">
                                <span className={`inline-block px-3 py-1 ${currentColor.bg} ${currentColor.text} text-[0.7rem] font-bold uppercase tracking-wider rounded-lg border ${currentColor.border} mb-2`}>
                                    Langkah 1 dari {TOTAL_STEPS}
                                </span>
                                <h2 className="text-4xl md:text-5xl font-extrabold text-[#172B4D] tracking-tight leading-tight">Siapa nama Anda?</h2>
                                <p className="text-[#505F79] text-lg font-medium">Masukkan nama lengkap Anda.</p>
                                <input ref={inputRef} type="text" value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} onKeyDown={handleKeyDown} placeholder="Nama Lengkap..." className={`w-full max-w-xl mx-auto bg-slate-50/50 backdrop-blur-sm border-2 border-slate-200 rounded-2xl text-3xl md:text-3xl lg:text-4xl text-center text-[#172B4D] placeholder:text-slate-300 ${currentColor.focus} py-5 px-6 transition-all duration-300 font-bold mt-8 focus:outline-none focus:bg-white focus:shadow-xl focus:shadow-slate-200/40 focus:-translate-y-1`} />
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
                                <input ref={inputRef} type="text" value={data.organization} onChange={(e) => setData({ ...data, organization: e.target.value })} onKeyDown={handleKeyDown} placeholder="PT / Dinas / Umum..." className={`w-full max-w-xl mx-auto bg-slate-50/50 backdrop-blur-sm border-2 border-slate-200 rounded-2xl text-3xl md:text-3xl lg:text-4xl text-center text-[#172B4D] placeholder:text-slate-300 ${currentColor.focus} py-5 px-6 transition-all duration-300 font-bold mt-8 focus:outline-none focus:bg-white focus:shadow-xl focus:shadow-slate-200/40 focus:-translate-y-1`} />
                            </div>
                        )}

                        {/* Step 3: Jabatan */}
                        {step === 3 && (
                            <motion.div
                                className="w-full space-y-8 flex flex-col items-center"
                                initial="hidden" animate="visible" exit="exit"
                                variants={{
                                    hidden: { opacity: 0, y: 30, scale: 0.9 },
                                    visible: {
                                        opacity: 1, y: 0, scale: 1,
                                        transition: { staggerChildren: 0.1, delayChildren: 0.2, type: "spring", stiffness: 200, damping: 20 }
                                    },
                                    exit: { opacity: 0, y: -20, scale: 0.95 }
                                }}
                            >
                                <motion.span variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className={`inline-block px-3 py-1 ${currentColor.bg} ${currentColor.text} text-[0.75rem] font-bold uppercase tracking-widest rounded-lg border ${currentColor.border} mb-2 shadow-sm`}>
                                    Langkah 3 dari {TOTAL_STEPS}
                                </motion.span>
                                <motion.h2 variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="text-4xl md:text-5xl font-extrabold text-[#172B4D] tracking-tight leading-tight">Posisi Anda?</motion.h2>
                                <motion.p variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="text-[#505F79] text-lg font-medium">Ketik jabatan atau peran Anda saat ini.</motion.p>

                                <motion.div variants={{ hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1 } }} className="w-full max-w-xl relative mt-4">
                                    <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="12" cy="7" r="4"></circle>
                                        </svg>
                                    </div>
                                    <input ref={inputRef} type="text" value={data.jabatan} onChange={(e) => setData({ ...data, jabatan: e.target.value })} onKeyDown={handleKeyDown} placeholder="Kepala Bidang / Staff..." className={`w-full bg-white/70 backdrop-blur-md border-2 border-white/80 rounded-3xl text-2xl md:text-3xl lg:text-3xl text-left pl-16 pr-6 text-[#172B4D] placeholder:text-slate-300 ${currentColor.focus} py-6 transition-all duration-300 font-bold shadow-[0_8px_30px_rgba(23,43,77,0.06)] focus:outline-none focus:bg-white focus:shadow-xl focus:shadow-slate-200/50 focus:-translate-y-1 focus:border-[#009FA9]`} />
                                </motion.div>

                                <motion.div variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }} className="flex flex-wrap items-center justify-center gap-2 mt-4 max-w-lg">
                                    {["Kepala Dinas", "Sekretaris", "Kepala Bidang", "Staff APIP", "Tamu Umum"].map((sugg) => (
                                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} key={sugg} onClick={() => setData({ ...data, jabatan: sugg })} className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors border-2 ${data.jabatan === sugg ? "bg-[#009FA9] text-white border-[#009FA9]" : "bg-white/50 text-slate-500 border-white hover:border-[#009FA9]/30"}`}>
                                            {sugg}
                                        </motion.button>
                                    ))}
                                </motion.div>
                            </motion.div>
                        )}

                        {/* Step 4: NIP/NIK */}
                        {step === 4 && (
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
                                    Langkah 4 dari {TOTAL_STEPS}
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
                                    <input ref={inputRef} inputMode="numeric" type="text" value={data.nip} onChange={(e) => setData({ ...data, nip: e.target.value })} onKeyDown={handleKeyDown} placeholder="19700101... atau 7371..." className={`w-full bg-white/70 backdrop-blur-md border-2 border-white/80 rounded-3xl text-2xl tracking-wider text-left pl-16 pr-6 text-[#172B4D] placeholder:text-slate-300 ${currentColor.focus} py-6 transition-all duration-300 font-bold shadow-[0_8px_30px_rgba(23,43,77,0.06)] focus:outline-none focus:bg-white focus:shadow-xl focus:shadow-slate-200/50 focus:-translate-y-1 focus:border-red-400`} />
                                </motion.div>
                            </motion.div>
                        )}

                        {/* Step 5: Unit Tujuan */}
                        {step === 5 && (
                            <motion.div
                                className="w-full space-y-6 flex flex-col items-center"
                                initial="hidden" animate="visible" exit="exit"
                                variants={{
                                    hidden: { opacity: 0, scale: 0.95 },
                                    visible: { opacity: 1, scale: 1, transition: { staggerChildren: 0.15 } },
                                    exit: { opacity: 0, scale: 0.95 }
                                }}
                            >
                                <motion.span variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }} className={`inline-block px-3 py-1 ${currentColor.bg} ${currentColor.text} text-[0.75rem] font-bold uppercase tracking-widest rounded-lg border ${currentColor.border} mb-2 shadow-sm`}>
                                    Langkah 5 dari {TOTAL_STEPS}
                                </motion.span>
                                <motion.h2 variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="text-4xl md:text-5xl font-extrabold text-[#172B4D] tracking-tight leading-tight">Tujuan Kunjungan?</motion.h2>
                                <motion.p variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="text-[#505F79] text-lg font-medium">Pilih unit yang ingin Anda tuju.</motion.p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl mx-auto mt-8 perspective-1000">
                                    {[
                                        {
                                            label: "UPT Warroom", desc: "Ruang Komando dan Pemantauan Kota Makassar", icon: (
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 7-7" /></svg>
                                            )
                                        },
                                        {
                                            label: "Diskominfo Makassar", desc: "Layanan Persuratan dan Administrasi Publik", icon: (
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18" /><path d="M5 21V7l8-4 8 4v14" /><path d="M9 21v-8h6v8" /></svg>
                                            )
                                        },
                                    ].map((opt) => (
                                        <motion.button
                                            key={opt.label}
                                            variants={{
                                                hidden: { opacity: 0, y: 30, rotateX: 20 },
                                                visible: { opacity: 1, y: 0, rotateX: 0, transition: { type: "spring", stiffness: 200 } }
                                            }}
                                            whileHover={{ scale: 1.03, y: -4, rotateY: 2 }}
                                            whileTap={{ scale: 0.97 }}
                                            onClick={() => { setData({ ...data, unit: opt.label }); setTimeout(() => setStep(s => Math.min(s + 1, TOTAL_STEPS)), 200); }}
                                            className={`relative overflow-hidden p-6 rounded-3xl border-2 text-left transition-all duration-300 ${data.unit === opt.label ? "bg-gradient-to-br from-[#009FA9] to-[#007A82] text-white border-transparent shadow-xl shadow-[#009FA9]/30" : "bg-white/80 backdrop-blur-sm border-white text-[#172B4D] shadow-[0_8px_30px_rgba(23,43,77,0.06)] hover:border-[#009FA9]/30 hover:shadow-[0_12px_40px_rgba(0,159,169,0.15)]"}`}
                                        >
                                            {/* Selection Indicator */}
                                            {data.unit === opt.label && (
                                                <motion.div layoutId="unit-selection" className="absolute inset-0 bg-white/10 pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
                                            )}
                                            <div className="flex flex-col gap-4 relative z-10">
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${data.unit === opt.label ? "bg-white/20 text-white shadow-inner" : "bg-[#009FA9]/10 text-[#009FA9]"}`}>
                                                    {opt.icon}
                                                </div>
                                                <div>
                                                    <p className="text-xl font-extrabold tracking-tight mb-1">{opt.label}</p>
                                                    <p className={`text-sm leading-relaxed ${data.unit === opt.label ? "text-white/80" : "text-[#505F79]"}`}>{opt.desc}</p>
                                                </div>
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* Step 6: Asal Daerah */}
                        {step === 6 && (
                            <div className="w-full space-y-6">
                                <span className={`inline-block px-3 py-1 ${currentColor.bg} ${currentColor.text} text-[0.7rem] font-bold uppercase tracking-wider rounded-lg border ${currentColor.border} mb-2`}>
                                    Langkah 6 dari {TOTAL_STEPS}
                                </span>
                                <h2 className="text-4xl md:text-5xl font-extrabold text-[#172B4D] tracking-tight leading-tight">Asal Daerah?</h2>
                                <p className="text-[#505F79] text-lg font-medium">Kota atau kabupaten asal.</p>
                                <input ref={inputRef} type="text" value={data.asalDaerah} onChange={(e) => setData({ ...data, asalDaerah: e.target.value })} onKeyDown={handleKeyDown} placeholder="Makassar, Gowa..." className={`w-full max-w-xl mx-auto bg-slate-50/50 backdrop-blur-sm border-2 border-slate-200 rounded-2xl text-3xl md:text-3xl lg:text-4xl text-center text-[#172B4D] placeholder:text-slate-300 ${currentColor.focus} py-5 px-6 transition-all duration-300 font-bold mt-8 focus:outline-none focus:bg-white focus:shadow-xl focus:shadow-slate-200/40 focus:-translate-y-1`} />
                            </div>
                        )}

                        {/* Step 7: Provinsi */}
                        {step === 7 && (
                            <div className="w-full space-y-6">
                                <span className={`inline-block px-3 py-1 ${currentColor.bg} ${currentColor.text} text-[0.7rem] font-bold uppercase tracking-wider rounded-lg border ${currentColor.border} mb-2`}>
                                    Langkah 7 dari {TOTAL_STEPS}
                                </span>
                                <h2 className="text-4xl md:text-5xl font-extrabold text-[#172B4D] tracking-tight leading-tight">Provinsi?</h2>
                                <p className="text-[#505F79] text-lg font-medium">Pilih provinsi asal Anda.</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 w-full max-w-3xl mx-auto mt-6 max-h-[320px] overflow-y-auto p-2">
                                    {[
                                        "Aceh", "Sumatera Utara", "Sumatera Barat", "Riau", "Jambi", "Sumatera Selatan", "Bengkulu", "Lampung",
                                        "Kepulauan Bangka Belitung", "Kepulauan Riau", "DKI Jakarta", "Jawa Barat", "Jawa Tengah", "DI Yogyakarta", "Jawa Timur", "Banten",
                                        "Bali", "Nusa Tenggara Barat", "Nusa Tenggara Timur", "Kalimantan Barat", "Kalimantan Tengah", "Kalimantan Selatan", "Kalimantan Timur", "Kalimantan Utara",
                                        "Sulawesi Utara", "Sulawesi Tengah", "Sulawesi Selatan", "Sulawesi Tenggara", "Gorontalo", "Sulawesi Barat",
                                        "Maluku", "Maluku Utara", "Papua Barat", "Papua", "Papua Tengah", "Papua Pegunungan", "Papua Selatan", "Papua Barat Daya"
                                    ].map((prov) => (
                                        <button key={prov} onClick={() => { setData({ ...data, provinsi: prov }); setTimeout(() => setStep(s => Math.min(s + 1, TOTAL_STEPS)), 150); }} className={`p-3 rounded-xl border-2 transition-all duration-300 hover:-translate-y-1 text-left ${data.provinsi === prov ? "bg-[#009FA9] text-white border-[#009FA9] shadow-lg shadow-[#009FA9]/20 scale-[1.02]" : "bg-white border-slate-200 text-[#505F79] hover:border-[#009FA9] hover:shadow-md hover:shadow-slate-200/50"}`}>
                                            <span className="text-xs font-semibold">{prov}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Step 8: Keperluan */}
                        {step === 8 && (
                            <div className="w-full space-y-6">
                                <span className={`inline-block px-3 py-1 ${currentColor.bg} ${currentColor.text} text-[0.7rem] font-bold uppercase tracking-wider rounded-lg border ${currentColor.border} mb-2`}>
                                    Langkah 8 dari {TOTAL_STEPS}
                                </span>
                                <h2 className="text-4xl md:text-5xl font-extrabold text-[#172B4D] tracking-tight leading-tight">Keperluan?</h2>
                                <p className="text-[#505F79] text-lg font-medium">Jelaskan maksud kunjungan Anda.</p>
                                <input ref={inputRef} type="text" value={data.purpose} onChange={(e) => setData({ ...data, purpose: e.target.value })} onKeyDown={handleKeyDown} placeholder="Koordinasi / Konsultasi..." className={`w-full max-w-xl mx-auto bg-slate-50/50 backdrop-blur-sm border-2 border-slate-200 rounded-2xl text-3xl md:text-3xl lg:text-4xl text-center text-[#172B4D] placeholder:text-slate-300 ${currentColor.focus} py-5 px-6 transition-all duration-300 font-bold mt-8 focus:outline-none focus:bg-white focus:shadow-xl focus:shadow-slate-200/40 focus:-translate-y-1`} />
                                <div className="mt-6">
                                    <label className="block text-xs font-bold text-[#505F79] uppercase mb-2">Nomor Surat (Opsional)</label>
                                    <input type="text" value={data.nomorSurat} onChange={(e) => setData({ ...data, nomorSurat: e.target.value })} placeholder="123/DK/2026" className="w-full max-w-md mx-auto px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-[#172B4D] font-bold text-center transition-all focus:outline-none focus:border-[#FFAB00] focus:shadow-md focus:-translate-y-0.5" />
                                </div>
                            </div>
                        )}

                        {/* Step 9: Tanda Tangan */}
                        {step === 9 && (
                            <div className="w-full space-y-6">
                                <span className={`inline-block px-3 py-1 ${currentColor.bg} ${currentColor.text} text-[0.7rem] font-bold uppercase tracking-wider rounded-lg border ${currentColor.border} mb-2`}>
                                    Langkah {TOTAL_STEPS} dari {TOTAL_STEPS}
                                </span>
                                <h2 className="text-4xl md:text-5xl font-extrabold text-[#172B4D] tracking-tight leading-tight">Tanda Tangan</h2>
                                <p className="text-[#505F79] text-lg font-medium">Tanda tangan di kotak berikut.</p>
                                <div className="relative w-full max-w-lg mx-auto h-[200px] bg-white rounded-2xl border-2 border-dashed border-gray-300 hover:border-teal-300 transition-colors shadow-sm overflow-hidden touch-none my-6">
                                    <canvas ref={canvasRef} width={500} height={200} className="w-full h-full cursor-crosshair" onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />
                                    {!signature && !isDrawing.current && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-400">
                                            <span className="text-sm">Tanda tangan disini</span>
                                        </div>
                                    )}
                                    <button onClick={clearSignature} className="absolute top-2 right-2 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors z-10" title="Hapus">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Success Screen */}
                        {step === TOTAL_STEPS + 1 && (
                            <div className="flex items-center justify-center w-full min-h-[inherit]">
                                <SuccessScreen
                                    visitorName={data.name}
                                    unit={data.unit || "-"}
                                    photo={null}
                                    onClose={() => {
                                        setStep(1);
                                        setData({ name: "", nip: "", jabatan: "", organization: "", asalDaerah: "", provinsi: "", unit: "", purpose: "", nomorSurat: "" });
                                        setSignature(null);
                                        onClose();
                                    }}
                                />
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* Footer Navigation */}
                {step <= TOTAL_STEPS && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-16 flex items-center justify-center gap-6">
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
                            disabled={isSubmitting || (step === TOTAL_STEPS && !signature)}
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
                )}
            </div>
        </div>
    );
}
