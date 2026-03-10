import { NextResponse, type NextRequest } from "next/server";

import { normalizeAttendanceEventCode } from "@/lib/attendanceEventUtils";
import { createEventAccessToken, hasEventTokenSecret } from "@/lib/eventAccessToken";
import { prisma } from "@/lib/prisma";
import { requireRole, writeAuditLog } from "@/lib/server/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TokenPayload = {
    code?: string;
    expiresInHours?: number;
};

const DEFAULT_EXPIRES_IN_HOURS = 72;

export async function POST(request: NextRequest) {
    try {
        const auth = await requireRole(request, ["admin"]);
        if (!auth.ok) {
            return NextResponse.json({ message: auth.message }, { status: auth.status });
        }

        const payload = (await request.json()) as TokenPayload;
        const code = normalizeAttendanceEventCode(payload.code);
        if (!code) {
            return NextResponse.json({ message: "Code event wajib diisi." }, { status: 400 });
        }

        if (!hasEventTokenSecret()) {
            return NextResponse.json(
                { message: "ATTENDANCE_EVENT_TOKEN_SECRET belum diset di environment." },
                { status: 400 },
            );
        }

        const event = await prisma.attendanceEvent.findUnique({
            where: { code },
            select: { id: true, code: true, name: true },
        });
        if (!event) {
            return NextResponse.json({ message: "Event tidak ditemukan." }, { status: 404 });
        }

        const expiresInHours = Number.isFinite(payload.expiresInHours)
            ? Number(payload.expiresInHours)
            : DEFAULT_EXPIRES_IN_HOURS;

        const { token, expiresAt } = createEventAccessToken({
            eventCode: code,
            expiresInHours,
        });

        await writeAuditLog({
            action: "attendance_event.token.create",
            actorUserId: auth.user.id,
            targetType: "attendance_event",
            targetId: event.id,
            metadata: { code, expiresAt },
        });

        return NextResponse.json({
            token,
            expiresAt,
            eventCode: code,
            registerPath: `/e/${code}/register?t=${encodeURIComponent(token)}`,
            dashboardPath: `/?event=${encodeURIComponent(code)}`,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Gagal membuat token event.";
        return NextResponse.json({ message }, { status: 500 });
    }
}
