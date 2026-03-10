import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ATTENDANCE_SOURCE } from "@/lib/meetingParticipants";
import {
    DEFAULT_ATTENDANCE_EVENT_DATE_ISO,
    DEFAULT_ATTENDANCE_EVENT_NAME,
    fallbackDefaultAttendanceEvent,
    normalizeAttendanceEventCode,
} from "@/lib/attendanceEventUtils";
import { requireRole, writeAuditLog } from "@/lib/server/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type EventPayload = {
    id?: string;
    code?: string;
    name?: string;
    eventDate?: string | null;
    isActive?: boolean;
};

async function ensureDefaultEvent(): Promise<void> {
    await prisma.attendanceEvent.upsert({
        where: { code: ATTENDANCE_SOURCE },
        create: {
            code: ATTENDANCE_SOURCE,
            name: DEFAULT_ATTENDANCE_EVENT_NAME,
            eventDate: new Date(DEFAULT_ATTENDANCE_EVENT_DATE_ISO),
            isActive: true,
        },
        update: {},
    });
}

export async function GET() {
    try {
        await ensureDefaultEvent();
        const events = await prisma.attendanceEvent.findMany({
            orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
        });
        const activeEvent = events.find((event) => event.isActive) ?? null;
        return NextResponse.json({ events, activeEvent });
    } catch {
        const fallback = fallbackDefaultAttendanceEvent();
        return NextResponse.json(
            {
                events: [fallback],
                activeEvent: fallback,
                warning: "attendance_events table belum tersedia. Jalankan prisma db push.",
            },
            { status: 200 },
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const auth = await requireRole(request, ["admin"]);
        if (!auth.ok) {
            return NextResponse.json({ message: auth.message }, { status: auth.status });
        }

        const payload = (await request.json()) as EventPayload;
        const code = normalizeAttendanceEventCode(payload.code);
        const name = typeof payload.name === "string" ? payload.name.trim() : "";
        const requestedActive = Boolean(payload.isActive);

        if (!code) {
            return NextResponse.json({ message: "Code event wajib diisi." }, { status: 400 });
        }
        if (!name) {
            return NextResponse.json({ message: "Nama event wajib diisi." }, { status: 400 });
        }

        const eventDate = payload.eventDate ? new Date(payload.eventDate) : null;
        if (eventDate && Number.isNaN(eventDate.getTime())) {
            return NextResponse.json({ message: "Format tanggal event tidak valid." }, { status: 400 });
        }

        const created = await prisma.$transaction(async (tx) => {
            if (requestedActive) {
                await tx.attendanceEvent.updateMany({ data: { isActive: false } });
            }
            const event = await tx.attendanceEvent.create({
                data: {
                    code,
                    name,
                    eventDate,
                    isActive: requestedActive,
                },
            });
            if (!requestedActive) return event;

            return event;
        });

        await writeAuditLog({
            action: "attendance_event.create",
            actorUserId: auth.user.id,
            targetType: "attendance_event",
            targetId: created.id,
            metadata: { code: created.code, isActive: created.isActive },
        });

        return NextResponse.json({ event: created }, { status: 201 });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Gagal membuat event.";
        if (message.toLowerCase().includes("unique")) {
            return NextResponse.json({ message: "Code event sudah dipakai." }, { status: 400 });
        }
        return NextResponse.json({ message }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const auth = await requireRole(request, ["admin"]);
        if (!auth.ok) {
            return NextResponse.json({ message: auth.message }, { status: auth.status });
        }

        const payload = (await request.json()) as EventPayload;
        const id = typeof payload.id === "string" ? payload.id.trim() : "";
        if (!id) {
            return NextResponse.json({ message: "ID event wajib diisi." }, { status: 400 });
        }

        const data: {
            name?: string;
            eventDate?: Date | null;
            isActive?: boolean;
        } = {};

        if (typeof payload.name === "string") {
            const name = payload.name.trim();
            if (!name) return NextResponse.json({ message: "Nama event tidak boleh kosong." }, { status: 400 });
            data.name = name;
        }

        if (payload.eventDate !== undefined) {
            if (payload.eventDate === null || payload.eventDate === "") {
                data.eventDate = null;
            } else {
                const date = new Date(payload.eventDate);
                if (Number.isNaN(date.getTime())) {
                    return NextResponse.json({ message: "Format tanggal event tidak valid." }, { status: 400 });
                }
                data.eventDate = date;
            }
        }

        const requestActive = payload.isActive === true;
        const updated = await prisma.$transaction(async (tx) => {
            if (requestActive) {
                await tx.attendanceEvent.updateMany({ data: { isActive: false } });
                data.isActive = true;
            }

            return tx.attendanceEvent.update({
                where: { id },
                data,
            });
        });

        await writeAuditLog({
            action: "attendance_event.update",
            actorUserId: auth.user.id,
            targetType: "attendance_event",
            targetId: updated.id,
            metadata: { name: updated.name, isActive: updated.isActive },
        });

        return NextResponse.json({ event: updated });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Gagal memperbarui event.";
        return NextResponse.json({ message }, { status: 500 });
    }
}
