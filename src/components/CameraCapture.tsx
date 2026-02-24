"use client";

import { useEffect, useRef } from "react";

interface CameraCaptureProps {
    onCapture: (image: string) => void;
    onRetake: () => void;
    initialImage?: string | null;
}

export default function CameraCapture({ onCapture, onRetake, initialImage }: CameraCaptureProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const startCamera = async () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera error:", err);
            alert("Tidak dapat mengakses kamera. Pastikan izin diberikan.");
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    const takeSelfie = () => {
        if (!videoRef.current || !streamRef.current) return;

        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;

        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            onCapture(canvas.toDataURL("image/jpeg", 0.75));
            stopCamera();
        }
    };

    useEffect(() => {
        if (!initialImage) {
            startCamera();
        }
        return () => stopCamera();
    }, [initialImage]);

    return (
        <div className="relative w-full max-w-md mx-auto aspect-video bg-black rounded-2xl overflow-hidden shadow-lg my-6 border-4 border-white">
            {!initialImage ? (
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
                            <div className="w-12 h-12 rounded-full bg-[#991b1b] border-2 border-white" />
                        </button>
                    </div>
                </>
            ) : (
                <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={initialImage} alt="Captured" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <button
                            onClick={onRetake}
                            className="px-6 py-2 bg-white/20 backdrop-blur-md border border-white/50 text-white rounded-full hover:bg-white/30 transition-all font-medium text-sm"
                        >
                            ↺ Ambil Ulang
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
