import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireRole, writeAuditLog } from "@/lib/server/auth";
import { normalizeAttendanceEventCode } from "@/lib/attendanceEventUtils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type EventPayload = {
  name?: string;
  eventDate?: string | null;
  isActive?: boolean;
};

async function getEventCode(params: Promise<{ eventCode: string }>): Promise<string> {
  const value = await params;
  return normalizeAttendanceEventCode(value.eventCode);
}

export async function GET(_: NextRequest, context: { params: Promise<{ eventCode: string }> }) {
  try {
    const eventCode = await getEventCode(context.params);
    if (!eventCode) {
      return NextResponse.json({ message: "Event code tidak valid." }, { status: 400 });
    }

    const event = await prisma.attendanceEvent.findUnique({ where: { code: eventCode } });
    if (!event) {
      return NextResponse.json({ message: "Event tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ event });
  } catch {
    return NextResponse.json({ message: "Gagal membaca data event." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ eventCode: string }> }) {
  try {
    const auth = await requireRole(request, ["admin"]);
    if (!auth.ok) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    const eventCode = await getEventCode(context.params);
    if (!eventCode) {
      return NextResponse.json({ message: "Event code tidak valid." }, { status: 400 });
    }

    const existing = await prisma.attendanceEvent.findUnique({ where: { code: eventCode } });
    if (!existing) {
      return NextResponse.json({ message: "Event tidak ditemukan." }, { status: 404 });
    }

    const payload = (await request.json()) as EventPayload;
    const data: { name?: string; eventDate?: Date | null; isActive?: boolean } = {};

    if (typeof payload.name === "string") {
      const name = payload.name.trim();
      if (!name) {
        return NextResponse.json({ message: "Nama event tidak boleh kosong." }, { status: 400 });
      }
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
        where: { code: eventCode },
        data,
      });
    });

    await writeAuditLog({
      action: "attendance_event.update",
      actorUserId: auth.user.id,
      targetType: "attendance_event",
      targetId: updated.id,
      metadata: { code: updated.code, isActive: updated.isActive },
    });

    return NextResponse.json({ event: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memperbarui event.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
