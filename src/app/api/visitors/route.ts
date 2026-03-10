import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireRole, writeAuditLog } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VISITORS_KEY = "visitors.v1";
const CASES_KEY = "cases.v1";
const CASE_EVENTS_KEY = "case-events.v1";

type Visitor = {
  id: string;
  name: string;
  nip: string;
  jabatan: string;
  organization: string;
  asalDaerah: string;
  provinsi: string;
  unit: string;
  purpose: string;
  nomorSurat: string;
  timestamp: string;
  date: string;
};

function getTodayTimestamp() {
  const now = new Date();
  return {
    timestamp: now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    date: now.toISOString().split("T")[0],
    iso: now.toISOString(),
  };
}

function mapVisitorUnitTujuan(unit: string): "UPT_WARROOM" | "DISKOMINFO" {
  return unit.toLowerCase().includes("warroom") ? "UPT_WARROOM" : "DISKOMINFO";
}

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "receptionist", "operator"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const row = await prisma.appState.findUnique({ where: { key: VISITORS_KEY } });
  return NextResponse.json({ visitors: Array.isArray(row?.payload) ? row?.payload : [] });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const name = String(body.name || "").trim();
  const organization = String(body.organization || "").trim();
  const purpose = String(body.purpose || "").trim();
  const unit = String(body.unit || "-").trim() || "-";

  if (!name || !organization || !purpose) {
    return NextResponse.json({ message: "Nama, instansi, dan keperluan wajib diisi." }, { status: 400 });
  }

  const { timestamp, date, iso } = getTodayTimestamp();
  const visitor: Visitor = {
    id: String(body.id || crypto.randomUUID()),
    name,
    nip: String(body.nip || "-").trim() || "-",
    jabatan: String(body.jabatan || "-").trim() || "-",
    organization,
    asalDaerah: String(body.asalDaerah || "-").trim() || "-",
    provinsi: String(body.provinsi || "-").trim() || "-",
    unit,
    purpose,
    nomorSurat: String(body.nomorSurat || "-").trim() || "-",
    timestamp,
    date,
  };

  const [visitorsRow, casesRow, eventsRow] = await Promise.all([
    prisma.appState.findUnique({ where: { key: VISITORS_KEY } }),
    prisma.appState.findUnique({ where: { key: CASES_KEY } }),
    prisma.appState.findUnique({ where: { key: CASE_EVENTS_KEY } }),
  ]);
  const visitors = Array.isArray(visitorsRow?.payload) ? [...(visitorsRow?.payload as Visitor[])] : [];
  visitors.unshift(visitor);

  const caseId = crypto.randomUUID();
  const cases = Array.isArray(casesRow?.payload) ? [...(casesRow?.payload as Record<string, unknown>[])] : [];
  cases.unshift({
    id: caseId,
    caseType: "visitor",
    status: "new",
    priority: "normal",
    unitTujuan: mapVisitorUnitTujuan(unit),
    orgUnitId: null,
    assignedToUserId: null,
    subject: `Kunjungan: ${visitor.name}`,
    description: visitor.purpose || "-",
    createdByUserId: null,
    source: "register",
    relatedVisitorId: visitor.id,
    relatedSuratId: null,
    slaDueAt: null,
    createdAt: iso,
    updatedAt: iso,
  });

  const caseEvents = Array.isArray(eventsRow?.payload) ? [...(eventsRow?.payload as Record<string, unknown>[])] : [];
  caseEvents.push({
    id: crypto.randomUUID(),
    caseId,
    actorUserId: null,
    eventType: "created",
    payloadJson: { source: "register" },
    createdAt: iso,
  });

  await prisma.$transaction([
    prisma.appState.upsert({ where: { key: VISITORS_KEY }, create: { key: VISITORS_KEY, payload: visitors as Prisma.InputJsonValue }, update: { payload: visitors as Prisma.InputJsonValue } }),
    prisma.appState.upsert({ where: { key: CASES_KEY }, create: { key: CASES_KEY, payload: cases as Prisma.InputJsonValue }, update: { payload: cases as Prisma.InputJsonValue } }),
    prisma.appState.upsert({ where: { key: CASE_EVENTS_KEY }, create: { key: CASE_EVENTS_KEY, payload: caseEvents as Prisma.InputJsonValue }, update: { payload: caseEvents as Prisma.InputJsonValue } }),
  ]);

  await writeAuditLog({ action: "visitor.submit", targetType: "visitor", targetId: visitor.id, metadata: { caseId } });
  return NextResponse.json({ visitor }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "receptionist"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  await prisma.appState.upsert({ where: { key: VISITORS_KEY }, create: { key: VISITORS_KEY, payload: [] as Prisma.InputJsonValue }, update: { payload: [] as Prisma.InputJsonValue } });
  await writeAuditLog({ action: "visitor.clear", actorUserId: auth.user.id, targetType: "visitor" });
  return NextResponse.json({ ok: true });
}
