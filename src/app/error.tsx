"use client";

import { useEffect } from "react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("App Error:", error);
    }, [error]);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-md text-center shadow-sm">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                </div>
                <h2 className="text-lg font-semibold text-slate-800 mb-2">Terjadi Kesalahan</h2>
                <p className="text-sm text-slate-500 mb-6">
                    Maaf, terjadi kesalahan pada aplikasi. Silakan coba lagi.
                </p>
                <div className="flex gap-3 justify-center">
                    <button
                        onClick={() => window.location.href = "/"}
                        className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                    >
                        Kembali
                    </button>
                    <button
                        onClick={reset}
                        className="px-5 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                    >
                        Coba Lagi
                    </button>
                </div>
            </div>
        </div>
    );
}
