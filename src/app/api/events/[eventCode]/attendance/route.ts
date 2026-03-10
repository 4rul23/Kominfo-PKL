import { type Attendance as AttendanceRecord } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { createAttendanceEntry, type AttendanceEntry } from "@/lib/attendanceCore";
import { normalizeAttendanceEventCode } from "@/lib/attendanceEventUtils";
import { emitAttendanceUpdated } from "@/lib/attendanceRealtimeHub";
import { prisma } from "@/lib/prisma";
import { getAppDayUtcRange } from "@/lib/timezone";

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

async function getEventCode(params: Promise<{ eventCode: string }>): Promise<string> {
  const value = await params;
  return normalizeAttendanceEventCode(value.eventCode);
}

async function ensureEventExists(eventCode: string): Promise<boolean> {
  try {
    const event = await prisma.attendanceEvent.findUnique({ where: { code: eventCode }, select: { id: true } });
    return Boolean(event);
  } catch {
    return true;
  }
}

export async function GET(_: NextRequest, context: { params: Promise<{ eventCode: string }> }) {
  try {
    const eventCode = await getEventCode(context.params);
    if (!eventCode) {
      return NextResponse.json({ message: "Event code tidak valid." }, { status: 400 });
    }

    if (!(await ensureEventExists(eventCode))) {
      return NextResponse.json({ message: "Event tidak ditemukan." }, { status: 404 });
    }

    const rows = await prisma.attendance.findMany({
      where: { source: eventCode },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ entries: rows.map(toAttendanceEntry) });
  } catch {
    return NextResponse.json({ message: "Gagal membaca data absensi event." }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ eventCode: string }> }) {
  try {
    const eventCode = await getEventCode(context.params);
    if (!eventCode) {
      return NextResponse.json({ message: "Event code tidak valid." }, { status: 400 });
    }

    if (!(await ensureEventExists(eventCode))) {
      return NextResponse.json({ message: "Event tidak ditemukan." }, { status: 404 });
    }

    const payload = (await request.json()) as Omit<AttendanceEntry, "id" | "createdAt">;
    payload.source = eventCode;

    const { dayStartUtc, nextDayStartUtc } = getAppDayUtcRange();
    const todayRows = await prisma.attendance.findMany({
      where: {
        source: eventCode,
        createdAt: {
          gte: dayStartUtc,
          lt: nextDayStartUtc,
        },
      },
      orderBy: { createdAt: "desc" },
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

    emitAttendanceUpdated("created", eventCode);
    return NextResponse.json({ entry: createdEntry }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan data absensi.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
