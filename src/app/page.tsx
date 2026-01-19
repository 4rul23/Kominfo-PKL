"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";

// Static visitor data - moved outside component to avoid recreation
const RECENT_VISITORS = [
  { name: "Pratama Wijaya", unit: "Bidang IKP", time: "2 menit yang lalu", faded: false },
  { name: "Larasati Putri", unit: "Bidang Aptika", time: "14 menit yang lalu", faded: false },
  { name: "Hendra Kurnia", unit: "Sekretariat", time: "45 menit yang lalu", faded: true },
] as const;

// Live Clock - memoized options object
const CLOCK_OPTIONS: Intl.DateTimeFormatOptions = {
  weekday: "long",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
};

function LiveClock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(now.toLocaleString("id-ID", CLOCK_OPTIONS).replace(",", " •"));
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return <>{time || "Loading..."}</>;
}


// Main Page - EXACT structure from original
export default function Home() {

  // Visitor list - functional design
  const visitorList = useMemo(() => RECENT_VISITORS.map((visitor, i) => (
    <div key={i} className={`flex items-start gap-3 py-2.5 ${i < RECENT_VISITORS.length - 1 ? "border-b border-slate-100" : ""} ${visitor.faded ? "opacity-50" : ""}`}>
      <span className="text-sm text-slate-300 font-medium w-5 pt-0.5">{i + 1}.</span>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-slate-700 leading-tight truncate">{visitor.name}</p>
        <p className="text-[13px] text-slate-400 leading-tight mt-1">{visitor.unit}</p>
      </div>
      <span className="text-xs text-slate-300 whitespace-nowrap pt-0.5">{visitor.time}</span>
    </div>
  )), []);

  return (
    <>
      <div className="kiosk-viewport">
        {/* Main App Container - Standardized dimensions */}
        <div id="app" className="transition-all duration-[800ms] flex flex-col" style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}>
          {/* Header */}
          <header className="flex justify-between items-center mb-4 px-1 pb-3 border-b" style={{ borderColor: "rgba(211, 47, 47, 0.08)" }}>
            <div>
              <h1 className="text-[clamp(1.8rem,4vw,2.8rem)] font-extrabold tracking-[-1.5px] leading-none text-gradient-ink relative">
                Diskominfo Kota Makassar
                <sup className="text-base absolute -top-6 ml-0.5" style={{ color: "#6B778C", WebkitTextFillColor: "#6B778C" }}>
                  ®
                </sup>
              </h1>
            </div>
            <div className="flex gap-8 items-center text-right">
              <div className="flex flex-col gap-1 min-w-[140px]">
                <span className="text-[0.8rem] font-extrabold uppercase tracking-[1.5px] opacity-70" style={{ color: "#D32F2F" }}>
                  Lokasi
                </span>
                <p className="text-lg font-semibold whitespace-nowrap" style={{ color: "#172B4D" }}>
                  MGC Kota Makassar
                </p>
              </div>
              <div className="w-[1.5px] h-10" style={{ background: "rgba(211, 47, 47, 0.1)" }} />
              <div className="flex flex-col gap-1 min-w-[140px]">
                <span className="text-[0.8rem] font-extrabold uppercase tracking-[1.5px] opacity-70" style={{ color: "#D32F2F" }}>
                  Current Time
                </span>
                <p className="text-lg font-semibold whitespace-nowrap" style={{ color: "#172B4D" }}>
                  <LiveClock />
                </p>
              </div>
            </div>
          </header>

          {/* Bento Grid - Fixed Height Fill */}
          <main className="bento-grid grid grid-cols-4 gap-3 flex-1 overflow-hidden" style={{ gridTemplateRows: "repeat(2, 1fr)" }}>
            {/* Main Entrance Card (Spans 2x2) */}
            <article
              className="bento-card col-span-2 row-span-2 text-white !border-none"
              style={{ background: "linear-gradient(145deg, #009FA9, #007A82)" }}
            >
              <Image
                src="/photo_6237802285450857792_w.jpg"
                alt="Lobby Background"
                fill
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                className="card-image-bg"
              />
              <div className="relative z-[1] h-full flex flex-col">
                <span className="tag tag-light">Akses Digital Diskominfo</span>
                <h2 className="text-[clamp(1.5rem,3vw,2.5rem)] text-white leading-tight mb-4 font-bold tracking-[-1.5px]">
                  Membangun Pelayanan Publik Digital yang Unggul.
                </h2>
                <p className="text-base opacity-90 max-w-[90%]">
                  Silakan lakukan registrasi kunjungan Anda. Sistem kami siap membantu Anda
                  mengakses berbagai layanan di lingkungan Diskominfo.
                </p>
                <Link href="/register" className="btn-primary inline-flex items-center justify-center">
                  Masuk ke Portal Lobi
                </Link>
              </div>
            </article>

            {/* Stats Card */}
            <article className="bento-card col-start-3 row-start-1">
              <div className="relative z-[1] h-full flex flex-col">
                <span className="tag">Informasi Kunjungan</span>
                <p style={{ color: "#6B778C" }} className="font-medium">
                  Total Pengunjung Hari Ini
                </p>
                <h3 className="stat-value">1,284</h3>
                <p className="text-sm font-semibold" style={{ color: "#36B37E" }}>
                  ↑ 12.4% dari minggu lalu
                </p>
                <div className="mt-auto flex gap-1 h-8 items-end">
                  <div className="flex-1 h-[40%] bg-[#e0eafc] rounded" />
                  <div className="flex-1 h-[60%] bg-[#e0eafc] rounded" />
                  <div className="flex-1 h-[85%] rounded" style={{ background: "#D32F2F" }} />
                  <div className="flex-1 h-[50%] bg-[#e0eafc] rounded" />
                  <div className="flex-1 h-[95%] rounded" style={{ background: "#009FA9" }} />
                </div>
              </div>
            </article>

            {/* Live Activity Card */}
            <article className="bento-card col-start-4 row-start-1">
              <div className="relative z-[1] h-full flex flex-col">
                <span className="tag">
                  Pengunjung Terbaru
                </span>
                <div className="mt-2">
                  {visitorList}
                </div>
              </div>
            </article>

            {/* Ecosystem Card - REDESIGNED */}
            {/* Ecosystem Card - Clean & Premium */}
            <article className="bento-card ecosystem-card col-span-2 col-start-3 row-start-2 relative overflow-hidden group">
              {/* Background with Animated Mesh Gradient & Image */}
              <div className="absolute inset-0 z-0 overflow-hidden">
                {/* Base Color */}
                <div className="absolute inset-0 bg-[#F4F8FD]" />

                {/* Animated Mesh Gradient */}
                <div className="absolute inset-0 opacity-[0.6] bg-[size:400%_400%]"
                  style={{
                    backgroundImage: "radial-gradient(at 0% 0%, rgba(0, 159, 169, 0.15) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(255, 86, 48, 0.1) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(211, 47, 47, 0.1) 0px, transparent 50%), radial-gradient(at 0% 100%, rgba(54, 179, 126, 0.1) 0px, transparent 50%)",
                    animation: "mesh-gradient 15s ease infinite"
                  }}
                />

                {/* Pattern Overlay */}
                <div className="absolute inset-0 opacity-[0.2]"
                  style={{
                    backgroundImage: "radial-gradient(#D32F2F 0.8px, transparent 0.8px)",
                    backgroundSize: "24px 24px",
                    backgroundPosition: "0 0"
                  }}
                />

                {/* User's Background Image blended */}
                <div className="absolute right-0 top-0 w-3/4 h-full mix-blend-multiply opacity-15">
                  <Image
                    src="/lontara-bg.png"
                    alt="Pattern"
                    fill
                    className="object-cover"
                  />
                </div>

                {/* Shine Effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              </div>

              <div className="flex flex-row h-full relative z-[1]">
                {/* Left Content Area */}
                <div className="flex-1 p-8 flex flex-col justify-center relative">
                  <h4
                    className="text-[2.8rem] font-extrabold tracking-[-2px] mb-4 leading-none relative z-10"
                    style={{ color: "#172B4D" }}
                  >
                    Lontara
                    <span
                      className="inline-block ml-2 bg-clip-text text-transparent bg-gradient-to-tr from-[#009FA9] to-[#36B37E] drop-shadow-sm"
                      style={{ fontSize: "3rem", verticalAlign: "middle" }}
                    >
                      +
                    </span>
                  </h4>

                  <p className="text-[1.05rem] leading-relaxed mb-8 max-w-[90%] text-[#505F79] font-medium tracking-tight">
                    Integrasi seluruh layanan publik Kota Makassar dalam satu ekosistem digital.
                  </p>

                  <a
                    href="https://lontara.makassar.go.id/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative overflow-hidden group flex items-center gap-3 pl-6 pr-6 py-3 bg-[#009FA9] text-white rounded-2xl shadow-[0_4px_20px_rgba(0,159,169,0.25)] hover:shadow-[0_8px_30px_rgba(0,159,169,0.35)] hover:-translate-y-0.5 transition-all duration-300 w-fit"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-700 ease-in-out" />

                    <span className="font-bold text-[0.95rem] tracking-wide">Jelajahi Ekosistem</span>
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    >
                      <path d="M5 12h14" />
                      <path d="M12 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>

                {/* Right Visual Area */}
                <div className="w-[42%] relative flex items-center justify-center perspective-[1000px]">
                  {/* Floating Logo - Minimal & Tilted Right */}
                  <div
                    className="relative w-[140px] h-[140px] flex items-center justify-center transform transition-transform duration-500 group-hover:scale-110 group-hover:rotate-y-[20deg] group-hover:rotate-x-[2deg]"
                    style={{
                      transformStyle: "preserve-3d",
                      transform: "rotateY(25deg) rotateX(10deg) scale(1.0) translateX(-10px)"
                    }}
                  >
                    <Image
                      src="/lontara.svg"
                      alt="Logo Lontara"
                      width={130}
                      height={130}
                      className="drop-shadow-2xl relative z-10"
                      style={{ filter: "drop-shadow(0 20px 30px rgba(211, 47, 47, 0.25))" }}
                    />

                    {/* Subtle Glows */}
                    <div className="absolute -inset-10 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                      <div className="absolute top-1/4 right-0 w-24 h-24 bg-[#FF5630]/20 rounded-full blur-2xl animate-pulse" />
                      <div className="absolute bottom-0 left-10 w-32 h-32 bg-[#009FA9]/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </main>
        </div>
      </div>

    </>
  );
}
