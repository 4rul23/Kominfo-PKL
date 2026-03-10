import { type Attendance as AttendanceRecord } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import {
    createAttendanceEntry,
    type AttendanceEntry,
} from "@/lib/attendanceCore";
import { ATTENDANCE_SOURCE } from "@/lib/meetingParticipants";
import { prisma } from "@/lib/prisma";
import { emitAttendanceUpdated } from "@/lib/attendanceRealtimeHub";
import { getAppDayUtcRange } from "@/lib/timezone";
import { hashSecret, requireRole, writeAuditLog } from "@/lib/server/auth";

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
        source: row.source,
        createdAt: row.createdAt.toISOString(),
    };
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const sourceFilter = (searchParams.get("source") || "").trim();
        const rows = await prisma.attendance.findMany({
            where: sourceFilter ? { source: sourceFilter } : undefined,
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
        const source = (payload.source || ATTENDANCE_SOURCE).trim();
        payload.source = source;
        const { dayStartUtc, nextDayStartUtc } = getAppDayUtcRange();

        const todayRows = await prisma.attendance.findMany({
            where: {
                source,
                createdAt: {
                    gte: dayStartUtc,
                    lt: nextDayStartUtc,
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

        emitAttendanceUpdated("created", createdEntry.source);
        return NextResponse.json({ entry: createdEntry }, { status: 201 });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Gagal menyimpan data absensi.";
        return NextResponse.json({ message }, { status: 400 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const auth = await requireRole(request, ["admin"]);
        if (!auth.ok) {
            return NextResponse.json({ message: auth.message }, { status: auth.status });
        }

        const intentToken = (request.headers.get("x-attendance-delete-intent") || "").trim();
        if (!intentToken) {
            return NextResponse.json({ message: "Token konfirmasi penghapusan wajib disertakan." }, { status: 400 });
        }

        const tokenHash = hashSecret(intentToken);
        const intent = await prisma.attendanceDeleteIntent.findFirst({
            where: {
                tokenHash,
                userId: auth.user.id,
                consumedAt: null,
                expiresAt: { gt: new Date() },
            },
        });
        if (!intent) {
            return NextResponse.json({ message: "Token konfirmasi tidak valid atau kedaluwarsa." }, { status: 400 });
        }

        const result = await prisma.attendance.deleteMany();
        await prisma.attendanceDeleteIntent.update({
            where: { id: intent.id },
            data: { consumedAt: new Date() },
        });

        await writeAuditLog({
            action: "attendance.delete_all",
            actorUserId: auth.user.id,
            targetType: "attendance",
            metadata: { deleted: result.count, reason: intent.reason },
        });

        emitAttendanceUpdated("cleared");
        return NextResponse.json({ ok: true, deleted: result.count });
    } catch {
        return NextResponse.json({ message: "Gagal menghapus data absensi." }, { status: 500 });
    }
}
