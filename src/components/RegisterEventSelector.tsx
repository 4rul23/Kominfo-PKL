"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getAttendanceEvents, type AttendanceEvent } from "@/lib/attendanceStore";

function formatEventDate(value: string | null): string {
    if (!value) return "Tanggal menyusul";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Tanggal menyusul";
    return date.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
}

function EventCard({ event }: { event: AttendanceEvent }) {
    return (
        <article className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-[0_18px_45px_-36px_rgba(15,23,42,0.7)]">
            <div className="flex items-center justify-between gap-3">
                <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-slate-500">
                    {event.isActive ? "Event Default Aktif" : "Event Tersedia"}
                </p>
                {event.isActive && (
                    <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[0.68rem] font-bold text-emerald-700">
                        Aktif
                    </span>
                )}
            </div>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-[#172B4D]">
                {event.name}
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
                {formatEventDate(event.eventDate)}
            </p>
            <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                Code: <span className="font-mono text-slate-700">{event.code}</span>
            </p>
            <Link
                href={`/e/${encodeURIComponent(event.code)}/register`}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#009FA9] px-4 py-3 text-sm font-bold text-white transition hover:brightness-110"
            >
                Mulai Absen Event Ini
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                </svg>
            </Link>
        </article>
    );
}

export default function RegisterEventSelector() {
    const [events, setEvents] = useState<AttendanceEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function loadEvents() {
            setIsLoading(true);
            setErrorMessage("");
            try {
                const result = await getAttendanceEvents();
                if (cancelled) return;
                setEvents(result);
            } catch (error) {
                if (cancelled) return;
                setErrorMessage(error instanceof Error ? error.message : "Gagal memuat data event.");
                setEvents([]);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        }

        void loadEvents();
        return () => {
            cancelled = true;
        };
    }, []);

    const sortedEvents = useMemo(
        () => [...events].sort((a, b) => Number(b.isActive) - Number(a.isActive)),
        [events],
    );

    return (
        <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
            <div className="mx-auto w-full max-w-5xl">
                <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-50px_rgba(15,23,42,0.75)]">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#991b1b]">
                        Portal Absensi Event
                    </p>
                    <h1 className="mt-2 text-3xl font-black tracking-tight text-[#172B4D]">
                        Pilih Event untuk Mulai Absensi
                    </h1>
                    <p className="mt-2 text-sm font-medium text-slate-500">
                        Gunakan link event dari panitia. Jika link khusus tidak tersedia, pilih event yang sesuai di bawah ini.
                    </p>
                </header>

                {isLoading && (
                    <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">
                        Memuat daftar event...
                    </div>
                )}

                {!isLoading && errorMessage && (
                    <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center text-sm font-semibold text-rose-600">
                        {errorMessage}
                    </div>
                )}

                {!isLoading && !errorMessage && sortedEvents.length === 0 && (
                    <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">
                        Belum ada event aktif. Hubungi admin untuk membuat event terlebih dahulu.
                    </div>
                )}

                {!isLoading && !errorMessage && sortedEvents.length > 0 && (
                    <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                        {sortedEvents.map((event) => (
                            <EventCard key={event.id} event={event} />
                        ))}
                    </section>
                )}
            </div>
        </main>
    );
}
