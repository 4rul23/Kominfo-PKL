import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireRole, writeAuditLog } from "@/lib/server/auth";
import { canTransitionVisitorStatus, getVisitorStatusLabel, getVisitorStatusTransitionError, isVisitorStatus, type VisitorStatus } from "@/lib/visitorWorkflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VISITORS_KEY = "visitors.v1";
const CASES_KEY = "cases.v1";
const CASE_EVENTS_KEY = "case-events.v1";

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "receptionist", "operator"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const body = (await request.json()) as Record<string, unknown>;
  const visitorId = String(body.visitorId || "").trim();
  const toStatus = String(body.toStatus || "").trim();
  const note = String(body.note || "").trim().slice(0, 500);
  const orgUnitId = String(body.orgUnitId || "").trim() || null;
  const orgUnitName = String(body.orgUnitName || "").trim() || null;
  const assignedOperatorName = String(body.assignedOperatorName || "").trim() || null;
  const caseId = String(body.caseId || "").trim() || null;

  if (!visitorId || !isVisitorStatus(toStatus)) {
    return NextResponse.json({ message: "Payload transisi kunjungan tidak valid." }, { status: 400 });
  }

  const [visitorsRow, casesRow, eventsRow] = await Promise.all([
    prisma.appState.findUnique({ where: { key: VISITORS_KEY } }),
    prisma.appState.findUnique({ where: { key: CASES_KEY } }),
    prisma.appState.findUnique({ where: { key: CASE_EVENTS_KEY } }),
  ]);

  const visitors = Array.isArray(visitorsRow?.payload) ? [...(visitorsRow?.payload as Record<string, unknown>[])] : [];
  const visitorIndex = visitors.findIndex((item) => item.id === visitorId);
  if (visitorIndex < 0) {
    return NextResponse.json({ message: "Data kunjungan tidak ditemukan." }, { status: 404 });
  }

  const currentVisitor = visitors[visitorIndex] as Record<string, unknown>;
  const fromStatus = isVisitorStatus(currentVisitor.status) ? currentVisitor.status : "submitted";
  if (!canTransitionVisitorStatus(fromStatus, toStatus)) {
    return NextResponse.json({ message: getVisitorStatusTransitionError(fromStatus, toStatus) }, { status: 409 });
  }

  const nowIso = new Date().toISOString();
  const history = Array.isArray(currentVisitor.statusHistory) ? [...currentVisitor.statusHistory as Record<string, unknown>[]] : [];
  history.push({ status: toStatus, timestamp: nowIso, note: note || `Status kunjungan menjadi ${getVisitorStatusLabel(toStatus)}` });

  visitors[visitorIndex] = {
    ...currentVisitor,
    status: toStatus,
    statusHistory: history,
    forwardedOrgUnitId: orgUnitId ?? currentVisitor.forwardedOrgUnitId ?? null,
    forwardedOrgUnitName: orgUnitName ?? currentVisitor.forwardedOrgUnitName ?? null,
    assignedOperatorName: assignedOperatorName ?? currentVisitor.assignedOperatorName ?? null,
    decisionNote: note || currentVisitor.decisionNote || null,
  };

  const cases = Array.isArray(casesRow?.payload) ? [...(casesRow?.payload as Record<string, unknown>[])] : [];
  const caseIndex = caseId ? cases.findIndex((item) => item.id === caseId) : -1;
  if (caseIndex >= 0) {
    const currentCase = cases[caseIndex] as Record<string, unknown>;
    cases[caseIndex] = {
      ...currentCase,
      status: toStatus === "forwarded_to_unit"
        ? "assigned"
        : toStatus === "accepted_by_unit"
          ? "closed"
          : toStatus === "rejected_by_unit"
            ? "cancelled"
            : currentCase.status,
      orgUnitId: orgUnitId ?? currentCase.orgUnitId ?? null,
      updatedAt: nowIso,
    };
  }

  const caseEvents = Array.isArray(eventsRow?.payload) ? [...(eventsRow?.payload as Record<string, unknown>[])] : [];
  if (caseId) {
    caseEvents.push({
      id: crypto.randomUUID(),
      caseId,
      actorUserId: auth.user.id,
      eventType: toStatus === "forwarded_to_unit" ? "assigned" : toStatus === "accepted_by_unit" ? "closed" : "cancelled",
      payloadJson: { fromStatus, toStatus, note, orgUnitId, orgUnitName, assignedOperatorName },
      createdAt: nowIso,
    });
  }

  await prisma.$transaction([
    prisma.appState.upsert({ where: { key: VISITORS_KEY }, create: { key: VISITORS_KEY, payload: visitors as Prisma.InputJsonValue }, update: { payload: visitors as Prisma.InputJsonValue } }),
    prisma.appState.upsert({ where: { key: CASES_KEY }, create: { key: CASES_KEY, payload: cases as Prisma.InputJsonValue }, update: { payload: cases as Prisma.InputJsonValue } }),
    prisma.appState.upsert({ where: { key: CASE_EVENTS_KEY }, create: { key: CASE_EVENTS_KEY, payload: caseEvents as Prisma.InputJsonValue }, update: { payload: caseEvents as Prisma.InputJsonValue } }),
  ]);

  await writeAuditLog({
    action: "visitor.transition",
    actorUserId: auth.user.id,
    targetType: "visitor",
    targetId: visitorId,
    metadata: { fromStatus, toStatus, caseId, orgUnitId, orgUnitName },
  });

  return NextResponse.json({ visitor: visitors[visitorIndex] });
}
