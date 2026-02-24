"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
    addAttendanceEntry,
    type AttendanceEntry,
} from "@/lib/attendanceStore";
import {
    ATTENDANCE_SOURCE,
    LONTARA_MEETING_PARTICIPANTS,
} from "@/lib/meetingParticipants";

const TOTAL_STEPS = 2;
const SUCCESS_STEP = TOTAL_STEPS + 1;
const AUTO_RESET_MS = 4000;

interface AttendanceWizardProps {
    onClose: () => void;
}

interface WizardData {
    name: string;
    participantId: string;
}

export default function AttendanceWizard({ onClose }: AttendanceWizardProps) {
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [submittedEntry, setSubmittedEntry] = useState<AttendanceEntry | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isParticipantPanelOpen, setIsParticipantPanelOpen] = useState(false);
    const [data, setData] = useState<WizardData>({
        name: "",
        participantId: "",
    });

    const nameInputRef = useRef<HTMLInputElement>(null);
    const comboboxRef = useRef<HTMLInputElement>(null);
    const participantStepRef = useRef<HTMLDivElement>(null);
    const successPrimaryButtonRef = useRef<HTMLButtonElement>(null);

    const selectedParticipant = useMemo(
        () => LONTARA_MEETING_PARTICIPANTS.find((item) => item.id === data.participantId) ?? null,
        [data.participantId],
    );

    const filteredParticipants = useMemo(() => {
        if (!searchQuery) return LONTARA_MEETING_PARTICIPANTS;
        const query = searchQuery.toLowerCase();
        return LONTARA_MEETING_PARTICIPANTS.filter((p) => p.label.toLowerCase().includes(query));
    }, [searchQuery]);

    const isNameValid = data.name.trim().length > 1;
    const isParticipantValid = Boolean(selectedParticipant);
    const isCurrentStepValid =
        (step === 1 && isNameValid) ||
        (step === 2 && isParticipantValid);
    const showParticipantResults = step === 2 && isParticipantPanelOpen;
    const isSuccessStep = step === SUCCESS_STEP;

    useEffect(() => {
        if (step === 1) {
            nameInputRef.current?.focus();
        } else if (step === 2) {
            comboboxRef.current?.focus();
            setIsParticipantPanelOpen(false);
        }
    }, [step]);

    useEffect(() => {
        if (step !== 2 || !isParticipantPanelOpen) return undefined;

        const handleOutsidePointerDown = (event: PointerEvent) => {
            const target = event.target as Node | null;
            if (!target) return;
            if (participantStepRef.current?.contains(target)) return;
            setIsParticipantPanelOpen(false);
        };

        window.addEventListener("pointerdown", handleOutsidePointerDown);
        return () => window.removeEventListener("pointerdown", handleOutsidePointerDown);
    }, [step, isParticipantPanelOpen]);

    useEffect(() => {
        if (step !== SUCCESS_STEP) return undefined;
        const timer = setTimeout(() => {
            resetWizard();
        }, AUTO_RESET_MS);
        return () => clearTimeout(timer);
    }, [step]);

    useEffect(() => {
        if (step !== SUCCESS_STEP) return undefined;
        const focusTimer = setTimeout(() => {
            successPrimaryButtonRef.current?.focus();
        }, 60);
        return () => clearTimeout(focusTimer);
    }, [step]);

    function resetWizard() {
        setStep(1);
        setData({
            name: "",
            participantId: "",
        });
        setSearchQuery("");
        setIsParticipantPanelOpen(false);
        setErrorMessage("");
        setSubmittedEntry(null);
        setIsSubmitting(false);
    }

    function handleParticipantSelect(participantId: string, participantLabel: string) {
        setData((prev) => ({ ...prev, participantId }));
        setSearchQuery(participantLabel);
        setIsParticipantPanelOpen(false);
    }

    function handleNext() {
        if (!isCurrentStepValid || step >= TOTAL_STEPS) return;
        setErrorMessage("");
        setStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
    }

    function handleBack() {
        setErrorMessage("");
        setStep((prev) => Math.max(prev - 1, 1));
    }

    function handleSubmit() {
        if (isSubmitting) return;
        if (!isNameValid || !isParticipantValid || !selectedParticipant) {
            setErrorMessage("Lengkapi semua field wajib sebelum menyimpan.");
            return;
        }

        setIsSubmitting(true);
        setErrorMessage("");

        try {
            const created = addAttendanceEntry({
                name: data.name.trim(),
                jabatan: selectedParticipant.label,
                // Instansi now follows selected category from step 2.
                instansi: selectedParticipant.label,
                participantId: selectedParticipant.id,
                participantLabel: selectedParticipant.label,
                source: ATTENDANCE_SOURCE,
            });

            setSubmittedEntry(created);
            setStep(SUCCESS_STEP);
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Gagal menyimpan data absensi.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center transition-all duration-500 ease-out overflow-hidden register-a11y-root">
            <div className="absolute inset-0 bg-white/85 transition-all duration-500" />
            <div className="absolute inset-0 z-0 overflow-hidden opacity-30 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#991b1b]/5 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#009FA9]/10 rounded-full blur-[100px]" />
            </div>

            {!isSuccessStep && (
                <div className="absolute top-0 left-0 w-full p-8 flex justify-between items-center z-20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white shadow-sm border border-gray-100 rounded-xl flex items-center justify-center">
                            <Image src="/kominfos.svg" alt="Logo Diskominfo" width={24} height={24} className="opacity-80" />
                        </div>
                        <div>
                            <p className="text-xs font-bold tracking-wider uppercase text-[#991b1b]">Absensi Rapat</p>
                            <p className="font-bold text-[#172B4D] tracking-tight text-lg">Koordinasi Lontara+</p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 border border-white/60 hover:bg-white hover:shadow-md transition-all text-[#505F79] hover:text-[#991b1b] register-a11y-btn"
                    >
                        <span className="text-xs font-bold tracking-wider uppercase">Tutup</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            <div
                className={`relative z-10 w-full h-full px-6 pb-8 flex flex-col text-center ${isSuccessStep
                        ? "max-w-6xl py-8 md:py-12"
                        : "max-w-5xl pt-24"
                    }`}
            >
                {step <= TOTAL_STEPS && (
                    <div className="shrink-0 mb-6 flex items-center justify-center gap-2">
                        {Array.from({ length: TOTAL_STEPS }, (_, idx) => {
                            const itemStep = idx + 1;
                            return (
                                <span
                                    key={itemStep}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${itemStep === step
                                            ? "w-14 bg-[#991b1b]"
                                            : itemStep < step
                                                ? "w-8 bg-[#36B37E]"
                                                : "w-6 bg-slate-300"
                                        }`}
                                />
                            );
                        })}
                    </div>
                )}

                <div className="flex-1 min-h-0 flex items-center justify-center">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, y: 15, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -15, scale: 0.98 }}
                            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                            className={`w-full min-h-0 flex flex-col items-center relative ${isSuccessStep ? "max-w-5xl justify-center" : "max-w-4xl"} ${step === 2 && showParticipantResults ? "justify-start h-full" : "justify-center"}`}
                        >
                            {step === 1 && (
                                <div className="w-full max-w-3xl mx-auto space-y-5">
                                    <h2 className="text-4xl md:text-5xl font-extrabold text-[#172B4D] tracking-tight leading-tight">
                                        Nama Lengkap Peserta
                                    </h2>
                                    <p className="text-[#505F79] text-lg font-medium">
                                        Isi nama lengkap peserta rapat sesuai daftar hadir.
                                    </p>

                                    <input
                                        ref={nameInputRef}
                                        type="text"
                                        value={data.name}
                                        onChange={(e) => setData((prev) => ({ ...prev, name: e.target.value }))}
                                        onKeyDown={(e) => { if (e.key === "Enter") handleNext(); }}
                                        placeholder="Contoh: Pratama Wijaya"
                                        className="w-full max-w-3xl mx-auto bg-transparent border-b-2 border-gray-200 text-3xl md:text-4xl text-center text-[#172B4D] placeholder:text-gray-300 focus:border-[#991b1b] py-3 transition-colors font-medium mt-4 focus:outline-none register-a11y-input"
                                    />
                                </div>
                            )}

                            {step === 2 && (
                                <motion.div
                                    ref={participantStepRef}
                                    layout
                                    className={`w-full max-w-3xl flex flex-col ${showParticipantResults ? "h-full min-h-0" : "justify-center"}`}
                                >
                                    <AnimatePresence initial={false}>
                                        {!showParticipantResults && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 16 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -14, height: 0, marginBottom: 0 }}
                                                transition={{ duration: 0.25 }}
                                                className="flex flex-col items-center mb-5"
                                            >
                                                <h2 className="text-4xl md:text-5xl font-extrabold text-[#172B4D] tracking-tight leading-tight text-center">
                                                    Jabatan / Unit Peserta
                                                </h2>
                                                <p className="text-[#505F79] text-lg font-medium text-center mt-3">
                                                    Klik kolom pencarian untuk menampilkan daftar jabatan.
                                                </p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <motion.div layout className="w-full shrink-0">
                                        {/* Structured Search Bar */}
                                        <div className="relative flex items-center bg-white rounded-[28px] p-1.5 shadow-sm border-2 border-slate-200 hover:border-slate-300 focus-within:border-[#009FA9] focus-within:ring-4 focus-within:ring-[#009FA9]/10 transition-all duration-300">
                                            <div className="pl-5 text-slate-400 transition-colors duration-300">
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                                            </div>
                                            <input
                                                ref={comboboxRef}
                                                type="text"
                                                value={searchQuery}
                                                onFocus={() => setIsParticipantPanelOpen(true)}
                                                onChange={(e) => {
                                                    if (!isParticipantPanelOpen) setIsParticipantPanelOpen(true);
                                                    setSearchQuery(e.target.value);
                                                    if (data.participantId) setData(prev => ({ ...prev, participantId: "" }));
                                                }}
                                                placeholder="Ketik untuk mencari jabatan / unit..."
                                                className="w-full bg-transparent text-lg md:text-xl text-[#172B4D] placeholder:text-slate-400 py-4 px-4 font-semibold focus:outline-none"
                                            />
                                            <AnimatePresence>
                                                {searchQuery && (
                                                    <motion.button
                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.8 }}
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            setSearchQuery("");
                                                            setData((prev) => ({ ...prev, participantId: "" }));
                                                            setIsParticipantPanelOpen(true);
                                                            comboboxRef.current?.focus();
                                                        }}
                                                        className="pr-5 pl-2 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                                                    >
                                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                                    </motion.button>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </motion.div>

                                    <AnimatePresence initial={false}>
                                        {showParticipantResults && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 12 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 10 }}
                                                className="mt-3 h-[46vh] w-full rounded-[30px] border border-slate-200 bg-white p-2 shadow-sm"
                                            >
                                                <div className="h-full overflow-y-auto flex flex-col gap-2 pr-1">
                                                    <AnimatePresence mode="wait">
                                                        {filteredParticipants.length > 0 ? (
                                                            filteredParticipants.map((item) => {
                                                                const isSelected = data.participantId === item.id;
                                                                return (
                                                                    <button
                                                                        key={item.id}
                                                                        onPointerDown={(e) => {
                                                                            e.preventDefault();
                                                                            handleParticipantSelect(item.id, item.label);
                                                                        }}
                                                                        className={`w-full text-left px-4 py-3 rounded-[24px] border transition-all duration-200 ${isSelected
                                                                            ? "border-[#009FA9] bg-[#009FA9]/10"
                                                                            : "border-slate-200 bg-white hover:border-[#009FA9]/40 hover:bg-slate-50"
                                                                            }`}
                                                                    >
                                                                        <div className="flex items-start gap-3">
                                                                            <div className={`w-10 h-10 mt-0.5 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? "border-[#009FA9]/40 bg-[#009FA9]/15 text-[#009FA9]" : "border-slate-200 bg-slate-50 text-slate-400"}`}>
                                                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                                                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                                                                                    <circle cx="12" cy="7" r="4" />
                                                                                </svg>
                                                                            </div>
                                                                            <span className="block text-base md:text-lg font-semibold leading-snug text-[#172B4D]">
                                                                                {item.label}
                                                                            </span>
                                                                        </div>
                                                                    </button>
                                                                );
                                                            })
                                                        ) : (
                                                            <motion.div
                                                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                                                className="w-full flex flex-col items-center justify-center py-12 text-slate-400 bg-white/50 rounded-2xl border border-dashed border-slate-200"
                                                            >
                                                                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                                                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                                                                </div>
                                                                <span className="text-xl font-extrabold text-slate-500 tracking-tight">Tidak ada jabatan yang sesuai</span>
                                                                <span className="text-sm font-medium mt-1">Coba gunakan kata kunci lain.</span>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            )}

                            {step === SUCCESS_STEP && submittedEntry && (
                                <motion.div
                                    initial={{ scale: 0.95, opacity: 0, y: 12 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                                    className="completion-shell"
                                >
                                    <section className="completion-card" aria-live="polite" aria-atomic="true">
                                        <div className="completion-header">
                                            <div className="completion-seal" aria-hidden="true">
                                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M20 6 9 17l-5-5" />
                                                </svg>
                                            </div>
                                            <span className="completion-ribbon">Absensi tersimpan</span>
                                        </div>

                                        <h2 className="completion-name">{submittedEntry.name}</h2>
                                        <p className="completion-role">{submittedEntry.participantLabel}</p>

                                        <div className="completion-countdown" aria-hidden="true">
                                            <div className="completion-countdown-rail">
                                                <span
                                                    className="completion-countdown-fill"
                                                    style={{ animationDuration: `${AUTO_RESET_MS}ms` }}
                                                />
                                            </div>
                                        </div>
                                        <p className="completion-note">
                                            Form akan kembali otomatis dalam {Math.round(AUTO_RESET_MS / 1000)} detik.
                                        </p>

                                        <div className="completion-actions">
                                            <button
                                                ref={successPrimaryButtonRef}
                                                type="button"
                                                onClick={resetWizard}
                                                className="completion-primary-btn register-a11y-btn"
                                            >
                                                Peserta Berikutnya
                                            </button>
                                            <button
                                                type="button"
                                                onClick={onClose}
                                                className="completion-secondary-btn register-a11y-btn"
                                            >
                                                Tutup
                                            </button>
                                        </div>
                                    </section>
                                </motion.div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {step <= TOTAL_STEPS && (
                    <div className="shrink-0 pt-4 flex items-center justify-center gap-4 flex-wrap">
                        {step > 1 && (
                            <button
                                onClick={handleBack}
                                className="flex items-center gap-2 text-[#505F79] hover:text-[#172B4D] transition-colors font-bold uppercase text-xs tracking-widest px-5 py-3 rounded-xl hover:bg-gray-100 register-a11y-btn"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M19 12H5M12 19l-7-7 7-7" />
                                </svg>
                                Kembali
                            </button>
                        )}

                        <button
                            onClick={step < TOTAL_STEPS ? handleNext : handleSubmit}
                            disabled={!isCurrentStepValid || isSubmitting}
                            className={`group flex items-center justify-center gap-3 px-8 py-4 text-white rounded-2xl transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed register-a11y-btn ${step < TOTAL_STEPS
                                ? "bg-[#009FA9] shadow-[0_8px_30px_rgba(0,159,169,0.25)] hover:shadow-[0_15px_40px_rgba(0,159,169,0.35)]"
                                : "bg-[#991b1b] shadow-[0_8px_30px_rgba(153,27,27,0.25)] hover:shadow-[0_15px_40px_rgba(153,27,27,0.35)]"
                                } hover:-translate-y-1`}
                        >
                            <span className="font-bold tracking-wide">
                                {isSubmitting ? "Menyimpan..." : step < TOTAL_STEPS ? "Lanjut" : "Simpan Kehadiran"}
                            </span>
                            {!isSubmitting && (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform">
                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                            )}
                        </button>
                    </div>
                )}

                {errorMessage && (
                    <p className="mt-4 text-sm font-semibold text-[#991b1b]">{errorMessage}</p>
                )}
            </div>
        </div>
    );
}
