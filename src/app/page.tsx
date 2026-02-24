"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ATTENDANCE_UPDATED_EVENT,
  getAttendanceSnapshot,
  type AttendanceEntry,
} from "@/lib/attendanceStore";
import { LONTARA_MEETING_PARTICIPANTS } from "@/lib/meetingParticipants";

function formatTimeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  if (minutes < 60) return `${minutes} menit yang lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam yang lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari yang lalu`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).replace(",", " •");
}

function formatAttendanceUnitLabel(entry: AttendanceEntry): string {
  if (entry.participantRole && entry.participantRole !== "-") {
    return `${entry.participantRole} • ${entry.participantLabel || entry.jabatan}`;
  }
  return entry.participantLabel || entry.jabatan;
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

type GuestListTrigger = "info" | "recent";

function areEntriesEquivalent(current: AttendanceEntry[], next: AttendanceEntry[]): boolean {
  if (current === next) return true;
  if (current.length !== next.length) return false;
  for (let i = 0; i < current.length; i += 1) {
    const a = current[i];
    const b = next[i];
    if (a.id !== b.id || a.createdAt !== b.createdAt) {
      return false;
    }
  }
  return true;
}

export default function Home() {
  const [recentAttendance, setRecentAttendance] = useState<AttendanceEntry[]>([]);
  const [todayAttendanceCount, setTodayAttendanceCount] = useState(0);
  const [isGuestListVisible, setIsGuestListVisible] = useState(false);
  const [activeGuestListTrigger, setActiveGuestListTrigger] = useState<GuestListTrigger | null>(null);
  const [guestListSearch, setGuestListSearch] = useState("");
  const [guestListParticipantFilter, setGuestListParticipantFilter] = useState("ALL");
  const [guestListRoleFilter, setGuestListRoleFilter] = useState("ALL");
  const [transitionState, setTransitionState] = useState({ isVisible: false, message: "" });
  const isLoadingAttendanceRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    const enableAttendanceStream = process.env.NEXT_PUBLIC_ENABLE_ATTENDANCE_STREAM === "true";

    const loadAttendance = async () => {
      if (isLoadingAttendanceRef.current) return;
      isLoadingAttendanceRef.current = true;
      try {
        const snapshot = await getAttendanceSnapshot();
        setRecentAttendance((prev) => (
          areEntriesEquivalent(prev, snapshot.entries) ? prev : snapshot.entries
        ));
        setTodayAttendanceCount((prev) => (
          prev === snapshot.todayCount ? prev : snapshot.todayCount
        ));
      } catch {
        setRecentAttendance([]);
        setTodayAttendanceCount(0);
      } finally {
        isLoadingAttendanceRef.current = false;
      }
    };

    void loadAttendance();
    let stream: EventSource | null = null;
    let reconnectTimer: number | null = null;

    const clearReconnectTimer = () => {
      if (reconnectTimer === null) return;
      window.clearTimeout(reconnectTimer);
      reconnectTimer = null;
    };

    const connectRealtimeStream = () => {
      if (!enableAttendanceStream) return;
      if (!("EventSource" in window)) return;
      stream = new EventSource("/api/attendance/stream");
      stream.addEventListener("attendance-updated", () => {
        void loadAttendance();
      });
      stream.onerror = () => {
        stream?.close();
        stream = null;
        clearReconnectTimer();
        reconnectTimer = window.setTimeout(() => {
          connectRealtimeStream();
        }, 3000);
      };
    };

    connectRealtimeStream();
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void loadAttendance();
    }, 30000);
    const handleStorage = () => {
      void loadAttendance();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        if (enableAttendanceStream && !stream) {
          clearReconnectTimer();
          connectRealtimeStream();
        }
        void loadAttendance();
      } else {
        stream?.close();
        stream = null;
      }
    };

    window.addEventListener(ATTENDANCE_UPDATED_EVENT, handleStorage);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      clearReconnectTimer();
      stream?.close();
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

  const visitorLimit = 3;
  const visitorList = useMemo(() => {
    if (recentAttendance.length === 0) {
      return (
        <div className="py-4 text-sm text-slate-400">
          Belum ada data absensi hari ini.
        </div>
      );
    }

    return recentAttendance.slice(0, visitorLimit).map((visitor, i) => (
      <div
        key={visitor.id}
        className={`flex items-start gap-3 ${isGuestListVisible ? "py-3.5" : "py-2.5"} ${i < Math.min(recentAttendance.length, visitorLimit) - 1 ? "border-b border-slate-100" : ""}`}
      >
        <span className={`font-bold italic tracking-tight text-slate-300 w-5 pt-0.5 ${isGuestListVisible ? "text-[1rem]" : "text-[0.95rem]"}`}>
          {i + 1}.
        </span>
        <div className="flex-1 min-w-0 pr-4">
          <p className={`font-bold text-[#172B4D] leading-tight truncate tracking-tight ${isGuestListVisible ? "text-[1.02rem]" : "text-[0.95rem]"}`}>
            {visitor.name}
          </p>
          <p className={`text-[#6B778C] font-medium leading-relaxed mt-1 ${isGuestListVisible ? "text-[0.82rem] line-clamp-2" : "text-[0.8rem] line-clamp-1"}`}>
            {formatAttendanceUnitLabel(visitor)}
          </p>
        </div>
        <span className={`font-semibold text-slate-400 whitespace-nowrap pt-1 ${isGuestListVisible ? "text-[0.64rem]" : "text-[0.62rem]"}`}>
          {formatTimeAgo(visitor.createdAt)}
        </span>
      </div>
    ));
  }, [recentAttendance, visitorLimit, isGuestListVisible]);

  const unitCountMap = useMemo(() => {
    const countMap = new Map<string, number>();
    for (const entry of recentAttendance) {
      const current = countMap.get(entry.participantId) ?? 0;
      countMap.set(entry.participantId, current + 1);
    }
    return countMap;
  }, [recentAttendance]);

  const participantFilterOptions = useMemo(() => {
    return LONTARA_MEETING_PARTICIPANTS.filter(
      (item) => (unitCountMap.get(item.id) ?? 0) > 0,
    );
  }, [unitCountMap]);

  const roleFilterOptions = useMemo(() => {
    const roleSet = new Set<string>();
    for (const entry of recentAttendance) {
      if (entry.participantRole && entry.participantRole !== "-") {
        roleSet.add(entry.participantRole);
      }
    }
    return Array.from(roleSet).sort((a, b) => a.localeCompare(b, "id-ID"));
  }, [recentAttendance]);

  const filteredGuestAttendance = useMemo(() => {
    const query = guestListSearch.trim().toLowerCase();
    return recentAttendance.filter((entry) => {
      const byParticipant =
        guestListParticipantFilter === "ALL"
        || entry.participantId === guestListParticipantFilter;
      const byRole =
        guestListRoleFilter === "ALL"
        || entry.participantRole === guestListRoleFilter;
      if (!byParticipant || !byRole) return false;

      if (!query) return true;
      const searchTargets = `${entry.name} ${entry.participantLabel} ${entry.participantRole} ${entry.jabatan}`
        .toLowerCase();
      return searchTargets.includes(query);
    });
  }, [recentAttendance, guestListSearch, guestListParticipantFilter, guestListRoleFilter]);

  const closeGuestList = () => {
    if (transitionState.isVisible) return;
    setTransitionState({ isVisible: true, message: "Menyiapkan Beranda" });

    setTimeout(() => {
      setIsGuestListVisible(false);
      setActiveGuestListTrigger(null);
      setGuestListSearch("");
      setGuestListParticipantFilter("ALL");
      setGuestListRoleFilter("ALL");
    }, 600);

    setTimeout(() => {
      setTransitionState({ isVisible: false, message: "" });
    }, 1600);
  };

  const toggleGuestList = (trigger: GuestListTrigger) => {
    if (transitionState.isVisible) return;

    if (isGuestListVisible && activeGuestListTrigger === trigger) {
      closeGuestList();
      return;
    }

    if (isGuestListVisible) {
      setActiveGuestListTrigger(trigger);
      return;
    }

    setActiveGuestListTrigger(trigger);
    setGuestListSearch("");
    setGuestListParticipantFilter("ALL");
    setGuestListRoleFilter("ALL");
    setTransitionState({ isVisible: true, message: "Memuat Daftar Peserta" });

    // Morph the layout while the blur overlay is perfectly opaque
    setTimeout(() => {
      setIsGuestListVisible(true);
    }, 600);

    // Fade out the loader
    setTimeout(() => {
      setTransitionState({ isVisible: false, message: "" });
    }, 1600);
  };

  const handleNavigation = (e: React.MouseEvent<HTMLAnchorElement>, href: string, message: string) => {
    e.preventDefault();
    if (transitionState.isVisible) return;
    setTransitionState({ isVisible: true, message });

    setTimeout(() => {
      router.push(href);
    }, 600);

    setTimeout(() => {
      setTransitionState({ isVisible: false, message: "" });
    }, 1600);
  };

  const handleGuestCardKeyDown = (event: KeyboardEvent<HTMLElement>, trigger: GuestListTrigger) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    toggleGuestList(trigger);
  };

  return (
    <>
      <div className="kiosk-viewport">
        <div id="app" className="relative transition-all duration-[800ms] flex flex-col overflow-hidden" style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}>
          {/* Stunning Loading Overlay */}
          <AnimatePresence>
            {transitionState.isVisible && (
              <motion.div
                initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                animate={{ opacity: 1, backdropFilter: "blur(24px)" }}
                exit={{ opacity: 0, backdropFilter: "blur(0px)", transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-white/60"
                style={{ backgroundImage: "radial-gradient(circle at 50% 50%, rgba(0, 159, 169, 0.08) 0%, transparent 60%)" }}
              >
                <motion.div
                  initial={{ y: 20, opacity: 0, scale: 0.95 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: -20, opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col items-center"
                >
                  <div className="relative w-36 h-36 mb-10 flex items-center justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 rounded-[2.5rem] border-2 border-dashed border-[#009FA9]/50"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.7, 0.4] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute inset-3 rounded-[2rem] bg-gradient-to-tr from-[#009FA9]/20 to-[#36B37E]/20"
                    />
                    <Image src="/kominfos.svg" alt="Kominfo Logo" width={80} height={80} className="relative z-10 drop-shadow-2xl" />
                  </div>

                  <h2 className="text-[2rem] font-extrabold tracking-[-1.5px] text-[#172B4D] mb-3">
                    {transitionState.message}
                  </h2>
                  <div className="flex gap-2.5 items-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#009FA9] animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#009FA9] animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#009FA9] animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <header className="flex justify-between items-center mb-4 px-1 pb-3 border-b relative z-10" style={{ borderColor: "rgba(211, 47, 47, 0.08)" }}>
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

          <main
            className="bento-grid grid grid-cols-4 gap-3 flex-1 overflow-hidden"
            style={{ gridTemplateRows: isGuestListVisible ? "auto minmax(0, 1fr)" : "repeat(2, minmax(0, 1fr))" }}
          >
            <AnimatePresence initial={false}>
              {!isGuestListVisible && (
                <motion.article
                  key="hero-card"
                  layout
                  initial={{ opacity: 0, y: 24, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 24, scale: 0.98, filter: "blur(4px)" }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
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
                        <Link
                          href="/register"
                          onClick={(e) => handleNavigation(e, "/register", "Memuat Portal Lobi")}
                          className="btn-primary !mt-0 inline-flex items-center justify-center">
                          Masuk ke Portal Lobi
                        </Link>
                        <Link
                          href="/surat"
                          onClick={(e) => handleNavigation(e, "/surat", "Memuat Portal Surat")}
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
                        onClick={(e) => handleNavigation(e, "/surat/tracking", "Memuat Lacak Status")}
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
                </motion.article>
              )}
            </AnimatePresence>

            <motion.article
              layout
              role="button"
              tabIndex={0}
              aria-controls="guest-attendance-list"
              aria-expanded={isGuestListVisible}
              aria-label="Lihat daftar lengkap kehadiran"
              onClick={() => toggleGuestList("info")}
              onKeyDown={(event) => handleGuestCardKeyDown(event, "info")}
              className={`bento-card cursor-pointer transition-all duration-300 group overflow-hidden ${isGuestListVisible ? "col-span-1 col-start-4 row-start-1" : "col-start-3 row-start-1"} ${isGuestListVisible && activeGuestListTrigger === "info" ? "ring-2 ring-[#009FA9]/40 border-[#009FA9]/40" : "hover:shadow-2xl hover:shadow-[#009FA9]/10"}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-[#F7FBFD] pointer-events-none" />
              <div className="absolute -right-24 -top-28 w-72 h-72 bg-gradient-to-bl from-[#009FA9]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-[1] h-full flex flex-col p-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#f0fcfc] text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[#009FA9] border border-[#009FA9]/20">
                    Informasi Kunjungan
                  </span>
                  <div className={`w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[#009FA9] transition-all ${isGuestListVisible ? "opacity-0" : "group-hover:border-[#009FA9]/30 group-hover:shadow-sm"}`}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-[#e7eef6] bg-white/80 px-4 py-3">
                  <p className="text-[0.74rem] font-semibold uppercase tracking-[0.12em] text-[#6B778C]">
                    Total Kehadiran
                  </p>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <h3 className={`font-black tracking-[-0.04em] text-[#172B4D] leading-none ${isGuestListVisible ? "text-[clamp(2.5rem,4vw,3.6rem)]" : "text-[clamp(3.5rem,6vw,5.1rem)]"}`}>
                      {todayAttendanceCount.toLocaleString("id-ID")}
                    </h3>
                    <span className="text-[0.85rem] font-semibold text-slate-400 pb-1">
                      peserta
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.74rem] font-bold ${trendInfo.isUp ? "bg-[#e7f6ee] text-[#1f7a46]" : "bg-[#fdecea] text-[#c5221f]"}`}>
                    {trendInfo.isUp ? (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
                    ) : (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                    )}
                    {trendInfo.label.replace("↑ ", "").replace("↓ ", "")}
                  </span>
                </div>

                <div className="mt-auto grid grid-cols-5 items-end gap-1.5 h-12">
                  {attendanceBars.map((bar, index) => (
                    <div
                      key={`bar-${index}`}
                      className="rounded-[6px]"
                      style={{
                        height: `${bar.height}%`,
                        background: bar.isActive ? bar.color : "#dbe8fb",
                        opacity: bar.isActive ? 1 : 0.75,
                      }}
                    />
                  ))}
                </div>
              </div>
            </motion.article>

            <motion.article
              layout
              role="button"
              tabIndex={0}
              aria-controls="guest-attendance-list"
              aria-expanded={isGuestListVisible}
              aria-label="Lihat daftar terbaru pengunjung"
              onClick={() => toggleGuestList("recent")}
              onKeyDown={(event) => handleGuestCardKeyDown(event, "recent")}
              className={`bento-card cursor-pointer transition-all duration-300 group ${isGuestListVisible ? "col-span-1 col-start-4 row-start-2" : "col-start-4 row-start-1"} ${isGuestListVisible && activeGuestListTrigger === "recent" ? "ring-2 ring-[#009FA9]/40 border-[#009FA9]/40" : "hover:shadow-2xl hover:shadow-[#991b1b]/10"}`}
            >
              <div className="relative z-[1] h-full flex flex-col pt-1">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-red-50 text-[0.66rem] font-extrabold uppercase tracking-[0.15em] text-[#991b1b] border border-red-100/50 shadow-sm">
                    Pengunjung Terbaru
                  </span>
                  <div className={`w-8 h-8 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-[#991b1b] transition-transform ${isGuestListVisible ? "opacity-0" : "group-hover:scale-110"}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                  </div>
                </div>
                <div className="mt-1 flex-1 flex flex-col overflow-hidden gap-0.5">
                  {visitorList}
                </div>
              </div>
            </motion.article>

            <AnimatePresence mode="wait" initial={false}>
              {isGuestListVisible ? (
                <motion.article
                  key="guest-list"
                  layout
                  initial={{ opacity: 0, y: 26, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 14, scale: 0.99 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="bento-card col-span-3 col-start-1 row-start-1 row-span-2 !p-0 min-h-0 flex flex-col"
                >
                  <div className="border-b border-slate-100 px-6 py-5 flex items-start justify-between gap-5 relative overflow-hidden bg-white/40">
                    <div className="absolute right-0 top-0 w-64 h-64 bg-gradient-to-bl from-[#0f766e]/5 to-transparent rounded-full blur-3xl pointer-events-none" />
                    <div className="relative z-10 w-full flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-[2rem] font-black tracking-tight text-[#172B4D] leading-none mb-1.5">
                          Semua Tamu yang Sudah Hadir
                        </h3>
                        <p className="text-[1rem] text-[#6B778C] font-semibold">
                          Menampilkan <span className="text-[#0f766e] font-bold">{filteredGuestAttendance.length.toLocaleString("id-ID")} peserta</span> dari total {todayAttendanceCount.toLocaleString("id-ID")} data kehadiran hari ini.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={closeGuestList}
                        className="flex-shrink-0 px-6 py-2.5 rounded-xl text-[0.9rem] font-bold text-[#172B4D] bg-white border border-slate-200 hover:border-[#009FA9]/50 hover:text-[#007A82] hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-sm"
                      >
                        Kembali ke Beranda
                      </button>
                    </div>
                  </div>
                  <div className="border-b border-slate-100 px-6 py-3 bg-white/70">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <input
                        type="text"
                        value={guestListSearch}
                        onChange={(event) => setGuestListSearch(event.target.value)}
                        placeholder="Cari nama atau jabatan..."
                        className="min-w-[240px] flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-[#172B4D] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#009FA9]/20 focus:border-[#009FA9]"
                      />
                      <select
                        value={guestListParticipantFilter}
                        onChange={(event) => setGuestListParticipantFilter(event.target.value)}
                        className="min-w-[260px] rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-[#172B4D] focus:outline-none focus:ring-2 focus:ring-[#009FA9]/20 focus:border-[#009FA9]"
                      >
                        <option value="ALL">Semua Jabatan / Unit</option>
                        {participantFilterOptions.map((participant) => (
                          <option key={participant.id} value={participant.id}>
                            {participant.label} ({unitCountMap.get(participant.id) ?? 0})
                          </option>
                        ))}
                      </select>
                      <select
                        value={guestListRoleFilter}
                        onChange={(event) => setGuestListRoleFilter(event.target.value)}
                        className="min-w-[220px] rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-[#172B4D] focus:outline-none focus:ring-2 focus:ring-[#009FA9]/20 focus:border-[#009FA9]"
                      >
                        <option value="ALL">Semua Peran</option>
                        {roleFilterOptions.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                      {(guestListSearch || guestListParticipantFilter !== "ALL" || guestListRoleFilter !== "ALL") && (
                        <button
                          type="button"
                          onClick={() => {
                            setGuestListSearch("");
                            setGuestListParticipantFilter("ALL");
                            setGuestListRoleFilter("ALL");
                          }}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:text-[#172B4D] hover:border-slate-300 transition-colors"
                        >
                          Reset Filter
                        </button>
                      )}
                    </div>
                  </div>
                  <div id="guest-attendance-list" className="flex-1 overflow-y-auto px-4 py-4">
                    {filteredGuestAttendance.length === 0 ? (
                      <div className="h-full grid place-items-center text-center text-slate-400 font-medium">
                        Tidak ada data yang cocok dengan filter saat ini.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredGuestAttendance.map((visitor, index) => (
                          <div
                            key={visitor.id}
                            className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-start gap-3 rounded-2xl border border-slate-100 bg-white/95 px-4 py-3.5 shadow-[0_8px_18px_-16px_rgba(15,23,42,0.45)]"
                          >
                            <div className="w-10 h-10 rounded-2xl bg-[#F8FAFC] border border-slate-200 text-[#64748B] font-bold text-sm inline-flex items-center justify-center">
                              {index + 1}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[1.03rem] font-bold tracking-tight text-[#172B4D] truncate">
                                {visitor.name}
                              </p>
                              <p className="text-[0.85rem] text-[#6B778C] leading-relaxed mt-1 line-clamp-2">
                                {formatAttendanceUnitLabel(visitor)}
                              </p>
                            </div>
                            <div className="text-right pl-2">
                              <p className="text-[0.72rem] font-semibold text-slate-500">
                                {formatDateTime(visitor.createdAt)}
                              </p>
                              <p className="text-[0.72rem] font-semibold text-slate-300 mt-1">
                                {formatTimeAgo(visitor.createdAt)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.article>
              ) : (
                <motion.article
                  key="ecosystem-card"
                  layout
                  initial={{ opacity: 0, y: 18, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 18, scale: 0.98, filter: "blur(3px)" }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="bento-card ecosystem-card col-span-2 col-start-3 row-start-2 relative overflow-hidden group"
                >
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
                          src="/lontara.svg"
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
                </motion.article>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>

    </>
  );
}
