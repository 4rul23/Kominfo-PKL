"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const MOBILE_BREAKPOINT = 1024;

function detectMobileUnsupported(): boolean {
    if (typeof window === "undefined") return false;
    const byWidth = window.innerWidth < MOBILE_BREAKPOINT;
    const byPointer = window.matchMedia("(pointer: coarse)").matches;
    const byUserAgent = /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent);
    return byWidth && (byPointer || byUserAgent);
}

export default function MobileUnsupportedOverlay() {
    const [isMobileUnsupported, setIsMobileUnsupported] = useState(false);

    useEffect(() => {
        const sync = () => {
            setIsMobileUnsupported(detectMobileUnsupported());
        };
        sync();
        window.addEventListener("resize", sync);
        window.addEventListener("orientationchange", sync);
        return () => {
            window.removeEventListener("resize", sync);
            window.removeEventListener("orientationchange", sync);
        };
    }, []);

    if (!isMobileUnsupported) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-6">
            <div className="w-full max-w-md rounded-3xl border border-white/20 bg-white/95 shadow-2xl px-7 py-8 text-center">
                <div className="mx-auto mb-6 w-16 h-16 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center justify-center">
                    <Image
                        src="/kominfos.svg"
                        alt="Logo Diskominfo"
                        width={36}
                        height={36}
                        className="opacity-90"
                    />
                </div>
                <p className="text-xs font-extrabold tracking-[0.14em] uppercase text-[#991b1b] mb-2">
                    Diskominfo Kota Makassar
                </p>
                <h2 className="text-2xl font-extrabold tracking-tight text-[#172B4D] mb-3">
                    Untuk sekarang gak ada support Mobile :)
                </h2>
                <p className="text-sm font-medium leading-relaxed text-[#5E6C84]">
                    Silakan akses aplikasi ini melalui laptop atau komputer desktop.
                </p>
            </div>
        </div>
    );
}
