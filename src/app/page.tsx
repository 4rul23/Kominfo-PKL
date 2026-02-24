"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ATTENDANCE_UPDATED_EVENT,
  getAttendanceEntries,
  getTodayAttendanceCount,
  type AttendanceEntry,
} from "@/lib/attendanceStore";

function formatTimeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  if (minutes < 60) return `${minutes} menit yang lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam yang lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari yang lalu`;
}

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

export default function Home() {
  const [recentAttendance, setRecentAttendance] = useState<AttendanceEntry[]>([]);
  const [todayAttendanceCount, setTodayAttendanceCount] = useState(0);

  useEffect(() => {
    const loadAttendance = () => {
      setRecentAttendance(getAttendanceEntries());
      setTodayAttendanceCount(getTodayAttendanceCount());
    };

    loadAttendance();
    const interval = setInterval(loadAttendance, 5000);
    const handleStorage = () => loadAttendance();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") loadAttendance();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(ATTENDANCE_UPDATED_EVENT, handleStorage);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(ATTENDANCE_UPDATED_EVENT, handleStorage);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const trendInfo = useMemo(() => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);

    const yesterdayCount = recentAttendance.filter((entry) =>
      entry.createdAt.startsWith(yesterdayKey),
    ).length;

    if (yesterdayCount === 0) {
      if (todayAttendanceCount === 0) {
        return { label: "Belum ada data perbandingan", isUp: true };
      }
      return { label: `↑ ${todayAttendanceCount} data baru dari kemarin`, isUp: true };
    }

    const delta = ((todayAttendanceCount - yesterdayCount) / yesterdayCount) * 100;
    const isUp = delta >= 0;
    return {
      label: `${isUp ? "↑" : "↓"} ${Math.abs(delta).toFixed(1)}% dari kemarin`,
      isUp,
    };
  }, [recentAttendance, todayAttendanceCount]);

  const attendanceBars = useMemo(() => {
    const baseHeights = [40, 60, 85, 50, 95];
    const barPalette = ["#1CA6A9", "#1CA6A9", "#991b1b", "#991b1b", "#1CA6A9"];
    const maxBars = baseHeights.length;
    const activeBars = todayAttendanceCount <= 0
      ? 0
      : Math.min(maxBars, Math.max(1, Math.ceil(Math.log10(todayAttendanceCount + 1) * 2)));

    return baseHeights.map((height, index) => ({
      height,
      color: barPalette[index],
      isActive: index < activeBars,
    }));
  }, [todayAttendanceCount]);

  const visitorList = useMemo(() => {
    if (recentAttendance.length === 0) {
      return (
        <div className="py-4 text-sm text-slate-400">
          Belum ada data absensi hari ini.
        </div>
      );
    }

    return recentAttendance.slice(0, 3).map((visitor, i) => (
      <div
        key={visitor.id}
        className={`flex items-start gap-4 py-3.5 ${i < Math.min(recentAttendance.length, 3) - 1 ? "border-b border-slate-100" : ""}`}
      >
        <span className="text-[1.1rem] font-bold italic tracking-tight text-slate-300 w-5 pt-0.5">
          {i + 1}.
        </span>
        <div className="flex-1 min-w-0 pr-4">
          <p className="text-[1.05rem] font-bold text-[#172B4D] leading-tight truncate tracking-tight">
            {visitor.name}
          </p>
          <p className="text-[0.85rem] text-[#6B778C] font-medium leading-relaxed mt-1 line-clamp-2">
            {visitor.participantLabel || visitor.jabatan}
          </p>
        </div>
        <span className="text-[0.7rem] font-semibold text-slate-300 whitespace-nowrap pt-1">
          {formatTimeAgo(visitor.createdAt)}
        </span>
      </div>
    ));
  }, [recentAttendance]);

  return (
    <>
      <div className="kiosk-viewport">
        <div id="app" className="transition-all duration-[800ms] flex flex-col" style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}>
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
                <span className="text-[0.8rem] font-extrabold uppercase tracking-[1.5px] opacity-70" style={{ color: "#991b1b" }}>
                  Lokasi
                </span>
                <p className="text-lg font-semibold whitespace-nowrap" style={{ color: "#172B4D" }}>
                  MGC Kota Makassar
                </p>
              </div>
              <div className="w-[1.5px] h-10" style={{ background: "rgba(211, 47, 47, 0.1)" }} />
              <div className="flex flex-col gap-1 min-w-[140px]">
                <span className="text-[0.8rem] font-extrabold uppercase tracking-[1.5px] opacity-70" style={{ color: "#991b1b" }}>
                  Current Time
                </span>
                <p className="text-lg font-semibold whitespace-nowrap" style={{ color: "#172B4D" }}>
                  <LiveClock />
                </p>
              </div>
            </div>
          </header>

          <main className="bento-grid grid grid-cols-4 gap-3 flex-1 overflow-hidden" style={{ gridTemplateRows: "repeat(2, 1fr)" }}>
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
                <div className="flex flex-col gap-3 mt-auto">
                  <div className="flex gap-3 flex-wrap">
                    <Link href="/register" className="btn-primary !mt-0 inline-flex items-center justify-center">
                      Masuk ke Portal Lobi
                    </Link>
                    <Link
                      href="/surat"
                      className="btn-secondary inline-flex items-center justify-center gap-2"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                      Kirim Surat Elektronik
                    </Link>
                  </div>
                  <Link
                    href="/surat/tracking"
                    className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors group"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70 group-hover:opacity-100 transition-opacity">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35" />
                    </svg>
                    Sudah kirim surat? <span className="underline underline-offset-2">Lacak status di sini →</span>
                  </Link>
                </div>
              </div>
            </article>

            <article className="bento-card col-start-3 row-start-1">
              <div className="relative z-[1] h-full flex flex-col">
                <span className="tag">Informasi Kunjungan</span>
                <p style={{ color: "#6B778C" }} className="font-medium">
                  Total Pengunjung Hari Ini
                </p>
                <h3 className="stat-value">{todayAttendanceCount.toLocaleString("id-ID")}</h3>
                <p className="text-sm font-semibold" style={{ color: trendInfo.isUp ? "#36B37E" : "#991b1b" }}>
                  {trendInfo.label}
                </p>
                <div className="mt-auto flex gap-1 h-8 items-end">
                  {attendanceBars.map((bar, index) => (
                    <div
                      key={`bar-${index}`}
                      className="flex-1 rounded"
                      style={{
                        height: `${bar.height}%`,
                        background: bar.isActive ? bar.color : "#e0eafc",
                      }}
                    />
                  ))}
                </div>
              </div>
            </article>

            <article className="bento-card col-start-4 row-start-1">
              <div className="relative z-[1] h-full flex flex-col pt-1">
                <div className="mb-4">
                  <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-red-50 text-[0.66rem] font-extrabold uppercase tracking-[0.15em] text-[#991b1b] border border-red-100/50">
                    Pengunjung Terbaru
                  </span>
                </div>
                <div className="mt-2 flex-1 flex flex-col overflow-hidden gap-1">
                  {visitorList}
                </div>
              </div>
            </article>

            <article className="bento-card ecosystem-card col-span-2 col-start-3 row-start-2 relative overflow-hidden group">
              <div className="absolute inset-0 z-0 overflow-hidden">
                <div className="absolute inset-0 bg-[#F4F8FD]" />
                <div className="absolute inset-0 opacity-[0.6] bg-[size:400%_400%]"
                  style={{
                    backgroundImage: "radial-gradient(at 0% 0%, rgba(0, 159, 169, 0.15) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(255, 86, 48, 0.1) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(211, 47, 47, 0.1) 0px, transparent 50%), radial-gradient(at 0% 100%, rgba(54, 179, 126, 0.1) 0px, transparent 50%)",
                    animation: "mesh-gradient 15s ease infinite"
                  }}
                />
                <div className="absolute inset-0 opacity-[0.2]"
                  style={{
                    backgroundImage: "radial-gradient(#991b1b 0.8px, transparent 0.8px)",
                    backgroundSize: "24px 24px",
                    backgroundPosition: "0 0"
                  }}
                />
                <div className="absolute right-0 top-0 w-3/4 h-full mix-blend-multiply opacity-15">
                  <Image
                    src="/lontara-bg.png"
                    alt="Pattern"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-tr from-white/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              </div>

              <div className="flex flex-row h-full relative z-[1]">
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
                    href="https://lontaraplus.makassarkota.go.id/"
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

                <div className="w-[42%] relative flex items-center justify-center perspective-[1000px]">
                  <div
                    className="relative w-[140px] h-[140px] flex items-center justify-center transform transition-transform duration-500 group-hover:scale-110 group-hover:rotate-y-[20deg] group-hover:rotate-x-[2deg]"
                    style={{
                      transformStyle: "preserve-3d",
                      transform: "rotateY(25deg) rotateX(10deg) scale(1.0) translateX(-10px)"
                    }}
                  >
                    <Image
                      src="lontara.svg"
                      alt="Logo Diskominfo"
                      width={130}
                      height={130}
                      className="drop-shadow-2xl relative z-10 rounded-[28px]"
                      style={{ filter: "drop-shadow(0 20px 30px rgba(12, 107, 196, 0.25))" }}
                    />

                    <div className="absolute -inset-10 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                      <div className="absolute top-1/4 right-0 w-24 h-24 bg-[#991b1b]/20 rounded-full blur-2xl animate-pulse" />
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
