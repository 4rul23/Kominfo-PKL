import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireRole, writeAuditLog } from "@/lib/server/auth";
import { readAppStateFile, writeAppStateFile } from "@/lib/server/appStateStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CASES_KEY = "cases.v1";
const CASE_EVENTS_KEY = "case-events.v1";

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "receptionist", "operator"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const [cases, events] = await Promise.all([
      prisma.appState.findUnique({ where: { key: CASES_KEY } }),
      prisma.appState.findUnique({ where: { key: CASE_EVENTS_KEY } }),
    ]);

    return NextResponse.json({
      cases: Array.isArray(cases?.payload) ? cases?.payload : [],
      events: Array.isArray(events?.payload) ? events?.payload : [],
    });
  } catch {
    const [cases, events] = await Promise.all([
      readAppStateFile(CASES_KEY, [] as unknown[]),
      readAppStateFile(CASE_EVENTS_KEY, [] as unknown[]),
    ]);
    return NextResponse.json({ cases, events });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "receptionist", "operator"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const body = (await request.json()) as { cases?: unknown[]; events?: unknown[] };
  const cases = Array.isArray(body.cases) ? body.cases : [];
  const events = Array.isArray(body.events) ? body.events : [];

  try {
    await prisma.$transaction([
      prisma.appState.upsert({
        where: { key: CASES_KEY },
        create: { key: CASES_KEY, payload: cases as Prisma.InputJsonValue },
        update: { payload: cases as Prisma.InputJsonValue },
      }),
      prisma.appState.upsert({
        where: { key: CASE_EVENTS_KEY },
        create: { key: CASE_EVENTS_KEY, payload: events as Prisma.InputJsonValue },
        update: { payload: events as Prisma.InputJsonValue },
      }),
    ]);
  } catch {
    await Promise.all([
      writeAppStateFile(CASES_KEY, cases),
      writeAppStateFile(CASE_EVENTS_KEY, events),
    ]);
  }

  await writeAuditLog({
    action: "cases_state.sync",
    actorUserId: auth.user.id,
    targetType: "cases",
    metadata: { caseCount: cases.length, eventCount: events.length },
  });

  return NextResponse.json({ ok: true });
}
