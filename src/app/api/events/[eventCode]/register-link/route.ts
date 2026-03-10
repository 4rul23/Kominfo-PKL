import { NextResponse, type NextRequest } from "next/server";

import { normalizeAttendanceEventCode } from "@/lib/attendanceEventUtils";
import { createEventAccessToken, hasEventTokenSecret } from "@/lib/eventAccessToken";
import { prisma } from "@/lib/prisma";
import { requireRole, writeAuditLog } from "@/lib/server/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_EXPIRES_IN_HOURS = 72;

async function getEventCode(params: Promise<{ eventCode: string }>): Promise<string> {
  const value = await params;
  return normalizeAttendanceEventCode(value.eventCode);
}

export async function POST(request: NextRequest, context: { params: Promise<{ eventCode: string }> }) {
  try {
    const auth = await requireRole(request, ["admin"]);
    if (!auth.ok) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    const eventCode = await getEventCode(context.params);
    if (!eventCode) {
      return NextResponse.json({ message: "Event code tidak valid." }, { status: 400 });
    }

    if (!hasEventTokenSecret()) {
      return NextResponse.json(
        { message: "ATTENDANCE_EVENT_TOKEN_SECRET belum diset di environment." },
        { status: 400 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as { expiresInHours?: number };
    const expiresInHours = Number.isFinite(body.expiresInHours)
      ? Number(body.expiresInHours)
      : DEFAULT_EXPIRES_IN_HOURS;

    const event = await prisma.attendanceEvent.findUnique({
      where: { code: eventCode },
      select: { id: true, code: true, name: true },
    });
    if (!event) {
      return NextResponse.json({ message: "Event tidak ditemukan." }, { status: 404 });
    }

    const { token, expiresAt } = createEventAccessToken({
      eventCode,
      expiresInHours,
    });

    await writeAuditLog({
      action: "attendance_event.token.create",
      actorUserId: auth.user.id,
      targetType: "attendance_event",
      targetId: event.id,
      metadata: { code: eventCode, expiresAt },
    });

    return NextResponse.json({
      token,
      expiresAt,
      eventCode,
      registerPath: `/e/${eventCode}/register?t=${encodeURIComponent(token)}`,
      dashboardPath: `/?event=${encodeURIComponent(eventCode)}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membuat token event.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
