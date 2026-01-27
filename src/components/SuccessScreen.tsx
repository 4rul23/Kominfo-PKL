"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

interface SuccessScreenProps {
    visitorName: string;
    unit: string;
    photo?: string | null;
    onClose: () => void;
}

export default function SuccessScreen({ visitorName, unit, photo, onClose }: SuccessScreenProps) {
    const [currentTime, setCurrentTime] = useState("");

    useEffect(() => {
        const now = new Date();
        setCurrentTime(now.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' }));
    }, []);

    return (
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center animate-fade-in-up">
            {/* Show only the card as requested */}


            {/* Digital Visitor Badge Card */}
            <div className="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-100 transform transition-transform hover:scale-[1.02] duration-500">
                {/* Badge Header */}
                <div className="bg-[#009FA9] p-5 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white shadow-md rounded-xl flex items-center justify-center">
                            <Image src="/lontara.svg" alt="Lontara" width={22} height={22} />
                        </div>
                        <div>
                            <p className="text-white/70 text-[0.6rem] font-bold uppercase tracking-widest leading-none mb-1">DISKOMINFO MAKASSAR</p>
                            <span className="text-white font-bold text-sm tracking-widest uppercase">KARTU AKSES TAMU</span>
                        </div>
                    </div>
                </div>

                {/* Badge Content */}
                <div className="p-8 flex flex-col items-center">
                    {/* Visitor Photo Frame */}
                    <div className="relative w-36 h-36 rounded-2xl overflow-hidden border-4 border-gray-50 shadow-inner mb-8 bg-gray-50 flex items-center justify-center">
                        {photo ? (
                            <Image src={photo} alt="Visitor" fill className="object-cover" />
                        ) : (
                            <div className="flex flex-col items-center gap-2 text-gray-200">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                                <span className="text-[0.6rem] font-bold uppercase tracking-widest">No Preview</span>
                            </div>
                        )}
                        <div className="absolute top-3 right-3 w-3 h-3 bg-[#36B37E] rounded-full border-2 border-white shadow-sm" />
                    </div>

                    <div className="text-center space-y-1 mb-10 w-full px-4">
                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                            <p className="text-[#505F79] font-bold text-[0.65rem] uppercase tracking-widest">NAMA TAMU</p>
                            <h3 className="text-lg font-bold text-[#172B4D] tracking-tight">{visitorName}</h3>
                        </div>
                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                            <p className="text-[#505F79] font-bold text-[0.65rem] uppercase tracking-widest">UNIT TUJUAN</p>
                            <div className="px-2 py-1 bg-teal-50 text-[#009FA9] font-bold text-[0.65rem] uppercase tracking-widest rounded-lg">
                                {unit}
                            </div>
                        </div>
                        <div className="flex items-center justify-between py-3">
                            <p className="text-[#505F79] font-bold text-[0.65rem] uppercase tracking-widest">WAKTU MASUK</p>
                            <p className="text-sm font-bold text-[#172B4D]">{currentTime} WIB</p>
                        </div>
                    </div>

                    {/* QR Mockup */}
                    <div className="w-full py-4 border-t border-gray-50 flex justify-between items-center opacity-70">
                        <div className="text-left">
                            <p className="text-[0.6rem] text-gray-400 font-bold uppercase tracking-widest">Guest Access</p>
                            <p className="text-xs font-bold text-[#172B4D]">DISKOMINFO MAKASSAR</p>
                        </div>
                        <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100">
                            {/* Simple SVG QR Grid pattern */}
                            <div className="grid grid-cols-3 gap-0.5 opacity-30">
                                {[...Array(9)].map((_, i) => (
                                    <div key={i} className={`w-2 h-2 ${i % 2 === 0 ? 'bg-[#172B4D]' : 'bg-gray-200'} rounded-[1px]`} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Red Accent Decor */}
                <div className="h-2 w-full flex">
                    <div className="flex-[3] bg-[#009FA9]" />
                    <div className="flex-1 bg-[#d02b29]" />
                </div>
            </div>

            {/* card is the focus */}
        </div>
    );
}
