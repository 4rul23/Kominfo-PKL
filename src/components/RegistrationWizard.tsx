"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

interface WizardData {
    name: string;
    organization: string;
    unit: string;
    purpose: string;
}

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
        organization: "",
        unit: "",
        purpose: "",
    });
    const [signature, setSignature] = useState<string | null>(null);
    const [selfie, setSelfie] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const isDrawing = useRef(false);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 500);
        }
    }, [step, isOpen]);

    // Camera Logic
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
            setCameraStream(stream);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera error:", err);
            alert("Tidak dapat mengakses kamera. Pastikan izin diberikan.");
        }
    };

    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
    };

    const takeSelfie = () => {
        if (!videoRef.current || !cameraStream) return;

        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;

        const ctx = canvas.getContext("2d");
        if (ctx) {
            // Flip horizontally for mirror effect correction
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            setSelfie(canvas.toDataURL("image/jpeg"));
            stopCamera();
        }
    };

    const retakeSelfie = () => {
        setSelfie(null);
        startCamera();
    };

    // Initialize camera when entering step 5
    useEffect(() => {
        if (step === 5) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [step]);


    // Canvas Logic
    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        isDrawing.current = true;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.strokeStyle = "#0052CC";

        const { offsetX, offsetY } = getCoordinates(e, canvas);
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing.current || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const { offsetX, offsetY } = getCoordinates(e, canvas);
        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (!isDrawing.current || !canvasRef.current) return;
        isDrawing.current = false;
        // Capture data
        setSignature(canvasRef.current.toDataURL());
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext("2d");
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
            setSignature(null);
        }
    };

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        const rect = canvas.getBoundingClientRect();
        return {
            offsetX: clientX - rect.left,
            offsetY: clientY - rect.top
        };
    };


    const handleNext = () => {
        if (step === 1 && !data.name.trim()) return;
        if (step === 2 && !data.organization.trim()) return;
        if (step === 3 && !data.unit) return;
        if (step === 4 && !data.purpose.trim()) return;
        if (step === 5 && !selfie) return; // Require selfie
        setStep((prev) => Math.min(prev + 1, 6));
    };

    const handleBack = () => setStep((prev) => Math.max(prev - 1, 1));

    const handleSubmit = () => {
        if (!signature && step === 6) return; // Require signature
        setIsSubmitting(true);

        setTimeout(() => {
            setIsSubmitting(false);
            setStep(1);
            setData({ name: "", organization: "", unit: "", purpose: "" });
            setSignature(null);
            setSelfie(null);
            onClose();
            alert(`✓ Kunjungan Terkonfirmasi!\n\nTamu: ${data.name}\nFoto & Tanda tangan berhasil direkam.`);
        }, 1500);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            if (step < 6) handleNext();
            // Don't auto-submit on Enter for signature step
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center transition-all duration-500 ease-out">

            {/* Glass Overlay Background - Light Mode */}
            <div className="absolute inset-0 bg-white/60 backdrop-blur-xl transition-all duration-500" />

            {/* Animated Blobs */}
            <div className="absolute inset-0 z-0 overflow-hidden opacity-40 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#0052CC]/10 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#00B8D9]/15 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "2s" }} />
            </div>

            {/* Header / Nav */}
            <div className="absolute top-0 left-0 w-full p-8 flex justify-between items-center z-20">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white shadow-sm border border-gray-100 rounded-xl flex items-center justify-center">
                        <Image src="/lontara.svg" alt="Logo" width={24} height={24} className="opacity-80" />
                    </div>
                    <span className="font-bold text-[#172B4D] tracking-tight text-lg">Buku Tamu</span>
                </div>

                <button
                    onClick={onClose}
                    className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 border border-white/60 hover:bg-white hover:shadow-md transition-all text-[#505F79] hover:text-[#FF5630]"
                >
                    <span className="text-xs font-bold tracking-wider uppercase">Tutup</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Main Content Modal */}
            <div className="relative z-10 w-full max-w-3xl px-6 flex flex-col items-center text-center">

                {/* Step Progress Pills */}
                <div className="flex items-center gap-2 mb-12">
                    {[1, 2, 3, 4, 5, 6].map((s) => (
                        <div
                            key={s}
                            className={`h-1.5 rounded-full transition-all duration-500 ${s === step ? "w-12 bg-[#0052CC]" :
                                s < step ? "w-4 bg-[#36B37E]" : "w-2 bg-gray-200"
                                }`}
                        />
                    ))}
                </div>

                {/* Question & Input Area with Fade Up Animation */}
                <div className="w-full min-h-[400px] flex flex-col items-center justify-center animate-fade-in-up">
                    {step === 1 && (
                        <div className="w-full space-y-6">
                            <span className="inline-block px-3 py-1 bg-blue-50 text-[#0052CC] text-[0.7rem] font-bold uppercase tracking-wider rounded-lg border border-blue-100 mb-2">
                                Langkah 1 dari 6
                            </span>
                            <h2 className="text-4xl md:text-5xl font-extrabold text-[#172B4D] tracking-tight leading-tight">
                                Siapakah nama Anda?
                            </h2>
                            <p className="text-[#505F79] text-lg font-medium">Kami ingin menyapa Anda dengan benar.</p>
                            <input
                                ref={inputRef}
                                type="text"
                                value={data.name}
                                onChange={(e) => setData({ ...data, name: e.target.value })}
                                onKeyDown={handleKeyDown}
                                placeholder="Nama Lengkap..."
                                className="w-full max-w-xl mx-auto bg-transparent border-b-2 border-gray-200 text-3xl md:text-4xl text-center text-[#172B4D] placeholder:text-gray-300 focus:outline-none focus:border-[#0052CC] py-4 transition-colors font-medium mt-8"
                            />
                        </div>
                    )}

                    {step === 2 && (
                        <div className="w-full space-y-6">
                            <span className="inline-block px-3 py-1 bg-purple-50 text-purple-600 text-[0.7rem] font-bold uppercase tracking-wider rounded-lg border border-purple-100 mb-2">
                                Langkah 2 dari 6
                            </span>
                            <h2 className="text-4xl md:text-5xl font-extrabold text-[#172B4D] tracking-tight leading-tight">
                                Dari instansi mana?
                            </h2>
                            <p className="text-[#505F79] text-lg font-medium">Asal organisasi atau Lembaga Anda.</p>
                            <input
                                ref={inputRef}
                                type="text"
                                value={data.organization}
                                onChange={(e) => setData({ ...data, organization: e.target.value })}
                                onKeyDown={handleKeyDown}
                                placeholder="Instansi / Umum..."
                                className="w-full max-w-xl mx-auto bg-transparent border-b-2 border-gray-200 text-3xl md:text-4xl text-center text-[#172B4D] placeholder:text-gray-300 focus:outline-none focus:border-purple-500 py-4 transition-colors font-medium mt-8"
                            />
                        </div>
                    )}

                    {step === 3 && (
                        <div className="w-full space-y-6">
                            <span className="inline-block px-3 py-1 bg-teal-50 text-teal-600 text-[0.7rem] font-bold uppercase tracking-wider rounded-lg border border-teal-100 mb-2">
                                Langkah 3 dari 6
                            </span>
                            <h2 className="text-4xl md:text-5xl font-extrabold text-[#172B4D] tracking-tight leading-tight">
                                Tujuan kedatangan?
                            </h2>
                            <p className="text-[#505F79] text-lg font-medium">Pilih pihak yang ingin Anda temui.</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl mx-auto mt-8">
                                {['Kepala Dinas', 'Sekretaris', 'Kepala Bidang', 'Staf / Umum'].map((opt) => (
                                    <button
                                        key={opt}
                                        onClick={() => {
                                            setData({ ...data, unit: opt });
                                            setTimeout(() => setStep(prev => prev + 1), 150);
                                        }}
                                        className={`p-5 rounded-2xl border transition-all duration-300 group hover:-translate-y-1 hover:shadow-lg ${data.unit === opt
                                            ? 'bg-[#0052CC] text-white border-[#0052CC] shadow-xl shadow-blue-200'
                                            : 'bg-white border-gray-100 text-[#505F79] hover:border-blue-200 hover:text-[#0052CC]'
                                            }`}
                                    >
                                        <span className="text-lg font-bold tracking-tight">{opt}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="w-full space-y-6">
                            <span className="inline-block px-3 py-1 bg-yellow-50 text-yellow-600 text-[0.7rem] font-bold uppercase tracking-wider rounded-lg border border-yellow-100 mb-2">
                                Langkah 4 dari 6
                            </span>
                            <h2 className="text-4xl md:text-5xl font-extrabold text-[#172B4D] tracking-tight leading-tight">
                                Keperluan Anda?
                            </h2>
                            <p className="text-[#505F79] text-lg font-medium">Jelaskan singkat maksud kunjungan Anda.</p>
                            <input
                                ref={inputRef}
                                type="text"
                                value={data.purpose}
                                onChange={(e) => setData({ ...data, purpose: e.target.value })}
                                onKeyDown={handleKeyDown}
                                placeholder="Contoh: Koordinasi..."
                                className="w-full max-w-xl mx-auto bg-transparent border-b-2 border-gray-200 text-3xl md:text-4xl text-center text-[#172B4D] placeholder:text-gray-300 focus:outline-none focus:border-[#FFAB00] py-4 transition-colors font-medium mt-8"
                            />
                        </div>
                    )}

                    {step === 5 && (
                        <div className="w-full space-y-6">
                            <span className="inline-block px-3 py-1 bg-pink-50 text-pink-600 text-[0.7rem] font-bold uppercase tracking-wider rounded-lg border border-pink-100 mb-2">
                                Verifikasi 1/2
                            </span>
                            <h2 className="text-4xl md:text-5xl font-extrabold text-[#172B4D] tracking-tight leading-tight">
                                Ambil Foto Selfie
                            </h2>
                            <p className="text-[#505F79] text-lg font-medium">Untuk keperluan identifikasi visual.</p>

                            <div className="relative w-full max-w-md mx-auto aspect-video bg-black rounded-2xl overflow-hidden shadow-lg my-6 border-4 border-white">
                                {!selfie ? (
                                    <>
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            muted
                                            className="w-full h-full object-cover transform -scale-x-100"
                                        />
                                        <div className="absolute bottom-4 left-0 w-full flex justify-center">
                                            <button
                                                onClick={takeSelfie}
                                                className="w-16 h-16 rounded-full bg-white border-4 border-gray-200/50 flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all"
                                            >
                                                <div className="w-12 h-12 rounded-full bg-red-500 border-2 border-white" />
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={selfie} alt="Captured" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                            <button
                                                onClick={retakeSelfie}
                                                className="px-6 py-2 bg-white/20 backdrop-blur-md border border-white/50 text-white rounded-full hover:bg-white/30 transition-all font-medium text-sm"
                                            >
                                                ↺ Ambil Ulang
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 6 && (
                        <div className="w-full space-y-6">
                            <span className="inline-block px-3 py-1 bg-rose-50 text-rose-600 text-[0.7rem] font-bold uppercase tracking-wider rounded-lg border border-rose-100 mb-2">
                                Verifikasi 2/2
                            </span>
                            <h2 className="text-4xl md:text-5xl font-extrabold text-[#172B4D] tracking-tight leading-tight">
                                Tanda Tangan
                            </h2>
                            <p className="text-[#505F79] text-lg font-medium">Mohon tanda tangan di kotak di bawah.</p>

                            <div className="relative w-full max-w-lg mx-auto h-[200px] bg-white rounded-2xl border-2 border-dashed border-gray-300 hover:border-blue-300 transition-colors shadow-sm overflow-hidden touch-none my-6">
                                <canvas
                                    ref={canvasRef}
                                    width={500}
                                    height={200}
                                    className="w-full h-full cursor-crosshair"
                                    onMouseDown={startDrawing}
                                    onMouseMove={draw}
                                    onMouseUp={stopDrawing}
                                    onMouseLeave={stopDrawing}
                                    onTouchStart={startDrawing}
                                    onTouchMove={draw}
                                    onTouchEnd={stopDrawing}
                                />
                                {!signature && !isDrawing.current && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-400">
                                        <span className="text-sm">Tanda tangan disini</span>
                                    </div>
                                )}
                                <button
                                    onClick={clearSignature}
                                    className="absolute top-2 right-2 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors z-10"
                                    title="Hapus Tanda Tangan"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Navigation */}
                <div className="mt-16 flex items-center justify-center gap-6">
                    {step > 1 && (
                        <button
                            onClick={handleBack}
                            className="flex items-center gap-2 text-[#505F79]/60 hover:text-[#172B4D] transition-colors font-bold uppercase text-xs tracking-widest px-4 py-3 rounded-xl hover:bg-gray-100"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 12H5M12 19l-7-7 7-7" />
                            </svg>
                            Kembali
                        </button>
                    )}

                    <button
                        onClick={step < 6 ? handleNext : handleSubmit}
                        disabled={isSubmitting || (step === 5 && !selfie) || (step === 6 && !signature)}
                        className="group flex items-center justify-center gap-3 px-8 py-4 bg-[#0052CC] text-white rounded-2xl shadow-[0_8px_30px_rgba(0,82,204,0.25)] hover:shadow-[0_15px_40px_rgba(0,82,204,0.35)] hover:-translate-y-1 transition-all active:scale-95 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        <span className="font-bold text-lg tracking-wide">
                            {isSubmitting ? "Mengirim..." : step < 6 ? "Lanjut" : "Simpan Data"}
                        </span>
                        {!isSubmitting && (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
}
