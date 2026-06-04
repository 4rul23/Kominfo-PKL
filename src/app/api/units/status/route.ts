import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireRole, writeAuditLog } from "@/lib/server/auth";
import { readAppStateFile, writeAppStateFile } from "@/lib/server/appStateStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UNIT_STATUS_KEY = "unit-status.v1";

export type UnitStatusData = Record<string, { status: "available" | "busy" | "unavailable"; note: string }>;

export async function GET(request: NextRequest) {
    let statusData: UnitStatusData = {};
    try {
        const row = await prisma.appState.findUnique({ where: { key: UNIT_STATUS_KEY } });
        statusData = (row?.payload as unknown as UnitStatusData) || {};
    } catch {
        statusData = await readAppStateFile(UNIT_STATUS_KEY, {} as UnitStatusData);
    }

    return NextResponse.json(statusData);
}

export async function POST(request: NextRequest) {
    const auth = await requireRole(request, ["admin", "operator", "receptionist"]);
    if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

    try {
        const body = (await request.json()) as UnitStatusData;

        // Validate body structure
        if (!body || typeof body !== "object") {
            return NextResponse.json({ message: "Invalid payload mapping." }, { status: 400 });
        }

        try {
            await prisma.appState.upsert({
                where: { key: UNIT_STATUS_KEY },
                create: { key: UNIT_STATUS_KEY, payload: body as unknown as Prisma.InputJsonValue },
                update: { payload: body as unknown as Prisma.InputJsonValue },
            });
        } catch {
            await writeAppStateFile(UNIT_STATUS_KEY, body);
        }

        await writeAuditLog({ action: "unit.status.update", actorUserId: auth.user.id, targetType: "unit" });
        return NextResponse.json(body, { status: 200 });

    } catch (error) {
        return NextResponse.json({ message: "Invalid JSON format." }, { status: 400 });
    }
}
