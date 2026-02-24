import { type Attendance as AttendanceRecord } from "@prisma/client";
import { NextResponse } from "next/server";
import {
    getTodayKey,
    createAttendanceEntry,
    type AttendanceEntry,
} from "@/lib/attendanceCore";
import { ATTENDANCE_SOURCE } from "@/lib/meetingParticipants";
import { prisma } from "@/lib/prisma";
import { emitAttendanceUpdated } from "@/lib/attendanceRealtimeHub";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function toAttendanceEntry(row: AttendanceRecord): AttendanceEntry {
    return {
        id: row.id,
        name: row.name,
        jabatan: row.jabatan,
        instansi: row.instansi,
        phoneNumber: row.phoneNumber,
        nip: row.nip,
        participantId: row.participantId,
        participantLabel: row.participantLabel,
        participantRole: row.participantRole,
        selfieDataUrl: row.selfieDataUrl,
        source: ATTENDANCE_SOURCE,
        createdAt: row.createdAt.toISOString(),
    };
}

export async function GET() {
    try {
        const rows = await prisma.attendance.findMany({
            orderBy: {
                createdAt: "desc",
            },
        });
        const entries = rows.map(toAttendanceEntry);
        return NextResponse.json({ entries });
    } catch {
        return NextResponse.json({ message: "Gagal membaca data absensi." }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const payload = (await request.json()) as Omit<AttendanceEntry, "id" | "createdAt">;
        const todayKey = getTodayKey();
        const dayStart = new Date(`${todayKey}T00:00:00.000Z`);
        const nextDay = new Date(dayStart);
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);

        const todayRows = await prisma.attendance.findMany({
            where: {
                source: ATTENDANCE_SOURCE,
                createdAt: {
                    gte: dayStart,
                    lt: nextDay,
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        const existingEntries = todayRows.map(toAttendanceEntry);
        const createdEntry = createAttendanceEntry(payload, existingEntries);
        await prisma.attendance.create({
            data: {
                id: createdEntry.id,
                name: createdEntry.name,
                jabatan: createdEntry.jabatan,
                instansi: createdEntry.instansi,
                phoneNumber: createdEntry.phoneNumber,
                nip: createdEntry.nip,
                participantId: createdEntry.participantId,
                participantLabel: createdEntry.participantLabel,
                participantRole: createdEntry.participantRole,
                selfieDataUrl: createdEntry.selfieDataUrl,
                source: createdEntry.source,
                createdAt: new Date(createdEntry.createdAt),
            },
        });

        emitAttendanceUpdated("created");
        return NextResponse.json({ entry: createdEntry }, { status: 201 });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Gagal menyimpan data absensi.";
        return NextResponse.json({ message }, { status: 400 });
    }
}

export async function DELETE() {
    try {
        const result = await prisma.attendance.deleteMany();
        emitAttendanceUpdated("cleared");
        return NextResponse.json({ ok: true, deleted: result.count });
    } catch {
        return NextResponse.json({ message: "Gagal menghapus data absensi." }, { status: 500 });
    }
}
