import Link from "next/link";
import { notFound } from "next/navigation";

import RegisterPageShell from "@/components/RegisterPageShell";
import { normalizeAttendanceEventCode, normalizeSearchParamValue } from "@/lib/attendanceEventUtils";
import { verifyEventAccessToken } from "@/lib/eventAccessToken";
import { ATTENDANCE_SOURCE } from "@/lib/meetingParticipants";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface EventRegisterPageProps {
    params: Promise<{ eventCode: string }>;
    searchParams?: Promise<{ t?: string | string[] }>;
}

async function resolveEventByCode(eventCode: string): Promise<{ name: string; eventDate: string | null } | null> {
    try {
        const event = await prisma.attendanceEvent.findUnique({
            where: { code: eventCode },
            select: { name: true, eventDate: true },
        });
        if (!event) return null;
        return {
            name: event.name,
            eventDate: event.eventDate ? event.eventDate.toISOString() : null,
        };
    } catch {
        if (eventCode === ATTENDANCE_SOURCE) {
            return { name: "Rapat Koordinasi Lontara+", eventDate: null };
        }
        return null;
    }
}

function isEventAttendanceClosed(eventDate: string | null): boolean {
    if (!eventDate) return false;
    const parsed = new Date(`${eventDate.slice(0, 10)}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) return false;
    parsed.setHours(23, 59, 59, 999);
    return Date.now() > parsed.getTime();
}

function shouldRequireEventToken(): boolean {
    return process.env.ATTENDANCE_REQUIRE_EVENT_TOKEN === "true";
}

function AccessDeniedState({
    eventCode,
    eventName,
    message,
}: {
    eventCode: string;
    eventName: string;
    message: string;
}) {
    return (
        <main className="min-h-screen bg-slate-50 px-6 py-10">
            <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-[0_30px_70px_-55px_rgba(15,23,42,0.85)]">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#991b1b]">
                    Akses Register Dibatasi
                </p>
                <h1 className="mt-2 text-2xl font-black tracking-tight text-[#172B4D]">
                    Link Event Tidak Valid
                </h1>
                <p className="mt-2 text-sm font-medium text-slate-500">
                    Event: <span className="font-bold text-slate-700">{eventName}</span>
                </p>
                <p className="mt-1 text-xs font-mono text-slate-400">{eventCode}</p>
                <p className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                    {message}
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <Link
                        href="/register"
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-slate-300"
                    >
                        Lihat Daftar Event
                    </Link>
                    <Link
                        href={`/?event=${encodeURIComponent(eventCode)}`}
                        className="rounded-2xl bg-[#009FA9] px-4 py-2.5 text-sm font-bold text-white hover:brightness-110"
                    >
                        Buka Dashboard Event
                    </Link>
                </div>
            </div>
        </main>
    );
}

export default async function EventRegisterPage({ params, searchParams }: EventRegisterPageProps) {
    const routeParams = await params;
    const query = searchParams ? await searchParams : {};
    const eventCode = normalizeAttendanceEventCode(routeParams.eventCode);
    if (!eventCode) {
        notFound();
    }

    const eventMeta = await resolveEventByCode(eventCode);
    if (!eventMeta) {
        notFound();
    }

    const eventName = eventMeta.name;

    if (isEventAttendanceClosed(eventMeta.eventDate)) {
        return (
            <AccessDeniedState
                eventCode={eventCode}
                eventName={eventName}
                message="Masa absensi untuk event ini sudah ditutup. Hubungi panitia jika membutuhkan akses lanjutan."
            />
        );
    }

    if (shouldRequireEventToken()) {
        const token = normalizeSearchParamValue(query.t);
        const verification = verifyEventAccessToken(token, eventCode);
        if (!verification.isValid) {
            return (
                <AccessDeniedState
                    eventCode={eventCode}
                    eventName={eventName}
                    message={verification.reason}
                />
            );
        }
    }

    return <RegisterPageShell preferredEventCode={eventCode} />;
}
