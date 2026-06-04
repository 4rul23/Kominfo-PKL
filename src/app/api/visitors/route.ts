import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireRole, writeAuditLog } from "@/lib/server/auth";
import { createVisitorTrackingId, getVisitorStatusLabel, isVisitorStatus, type VisitorStatus } from "@/lib/visitorWorkflow";
import { readAppStateFile, writeAppStateFile } from "@/lib/server/appStateStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VISITORS_KEY = "visitors.v1";
const CASES_KEY = "cases.v1";
const CASE_EVENTS_KEY = "case-events.v1";

type Visitor = {
  id: string;
  trackingId: string;
  name: string;
  nip: string;
  jabatan: string;
  organization: string;
  asalDaerah: string;
  provinsi: string;
  unit: string;
  purpose: string;
  nomorSurat: string;
  status: VisitorStatus;
  statusHistory: Array<{ status: VisitorStatus; timestamp: string; note?: string }>;
  forwardedOrgUnitId?: string | null;
  forwardedOrgUnitName?: string | null;
  assignedOperatorName?: string | null;
  decisionNote?: string | null;
  timestamp: string;
  date: string;
};

function toPublicVisitorPayload(visitor: Visitor): Pick<Visitor, "id" | "trackingId" | "name" | "jabatan" | "organization" | "unit" | "purpose" | "status" | "statusHistory" | "forwardedOrgUnitName" | "decisionNote" | "timestamp" | "date"> {
  return {
    id: visitor.id,
    trackingId: visitor.trackingId,
    name: visitor.name,
    jabatan: visitor.jabatan,
    organization: visitor.organization,
    unit: visitor.unit,
    purpose: visitor.purpose,
    status: visitor.status,
    statusHistory: visitor.statusHistory,
    forwardedOrgUnitName: visitor.forwardedOrgUnitName || null,
    decisionNote: visitor.decisionNote || null,
    timestamp: visitor.timestamp,
    date: visitor.date,
  };
}

function getTodayTimestamp() {
  const now = new Date();
  return {
    timestamp: now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    date: now.toISOString().split("T")[0],
    iso: now.toISOString(),
  };
}

function mapVisitorRouting(unit: string): { unitTujuan: "UPT_WARROOM" | "DISKOMINFO"; orgUnitId: string | null; orgUnitName: string | null } {
  const normalized = unit.toLowerCase();
  if (normalized.includes("warroom")) {
    return { unitTujuan: "UPT_WARROOM", orgUnitId: "UPT_WARROOM", orgUnitName: "UPT Warroom" };
  }
  if (normalized.includes("sekretariat")) {
    return { unitTujuan: "DISKOMINFO", orgUnitId: "SEKRETARIAT", orgUnitName: "Sekretariat Diskominfo" };
  }
  if (normalized.includes("ikp")) {
    return { unitTujuan: "DISKOMINFO", orgUnitId: "BIDANG_IKP", orgUnitName: "Bidang IKP" };
  }
  if (normalized.includes("aptika")) {
    return { unitTujuan: "DISKOMINFO", orgUnitId: "BIDANG_APTIKA", orgUnitName: "Bidang APTIKA" };
  }
  if (normalized.includes("pde") || normalized.includes("statistik")) {
    return { unitTujuan: "DISKOMINFO", orgUnitId: "BIDANG_PDE_STATISTIK", orgUnitName: "Bidang PDE Statistik" };
  }
  if (normalized.includes("persandian") || normalized.includes("keamanan")) {
    return { unitTujuan: "DISKOMINFO", orgUnitId: "BIDANG_PERSANDIAN_KEAMANAN", orgUnitName: "Bidang Persandian dan Keamanan Informasi" };
  }
  return { unitTujuan: "DISKOMINFO", orgUnitId: null, orgUnitName: unit || null };
}

export async function GET(request: NextRequest) {
  let visitors: Visitor[] = [];
  try {
    const row = await prisma.appState.findUnique({ where: { key: VISITORS_KEY } });
    visitors = Array.isArray(row?.payload) ? (row?.payload as Visitor[]) : [];
  } catch {
    visitors = await readAppStateFile(VISITORS_KEY, [] as Visitor[]);
  }
  const trackingId = (new URL(request.url).searchParams.get("trackingId") || "").trim();

  if (trackingId) {
    const visitor = visitors.find((item) => item.trackingId === trackingId) || null;
    if (!visitor) {
      return NextResponse.json({ visitor: null }, { status: 404 });
    }
    const auth = await requireRole(request, ["admin", "receptionist", "operator"]);
    if (auth.ok) return NextResponse.json({ visitor });
    return NextResponse.json({ visitor: toPublicVisitorPayload(visitor) });
  }

  const auth = await requireRole(request, ["admin", "receptionist", "operator"]);
  if (auth.ok) {
    return NextResponse.json({ visitors });
  }

  return NextResponse.json({ visitors: visitors.map(toPublicVisitorPayload) });
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
  const trackingId = createVisitorTrackingId(new Date());
  const routing = mapVisitorRouting(unit);
  const visitor: Visitor = {
    id: String(body.id || crypto.randomUUID()),
    trackingId,
    name,
    nip: String(body.nip || "-").trim() || "-",
    jabatan: String(body.jabatan || "-").trim() || "-",
    organization,
    asalDaerah: String(body.asalDaerah || "-").trim() || "-",
    provinsi: String(body.provinsi || "-").trim() || "-",
    unit,
    purpose,
    nomorSurat: String(body.nomorSurat || "-").trim() || "-",
    status: "submitted",
    statusHistory: [{ status: "submitted", timestamp: iso, note: "Data kunjungan berhasil dikirim" }],
    forwardedOrgUnitId: null,
    forwardedOrgUnitName: null,
    assignedOperatorName: null,
    decisionNote: null,
    timestamp,
    date,
  };

  let visitors: Visitor[] = [];
  let cases: Record<string, unknown>[] = [];
  let caseEvents: Record<string, unknown>[] = [];
  try {
    const [visitorsRow, casesRow, eventsRow] = await Promise.all([
      prisma.appState.findUnique({ where: { key: VISITORS_KEY } }),
      prisma.appState.findUnique({ where: { key: CASES_KEY } }),
      prisma.appState.findUnique({ where: { key: CASE_EVENTS_KEY } }),
    ]);
    visitors = Array.isArray(visitorsRow?.payload) ? [...(visitorsRow?.payload as Visitor[])] : [];
    cases = Array.isArray(casesRow?.payload) ? [...(casesRow?.payload as Record<string, unknown>[])] : [];
    caseEvents = Array.isArray(eventsRow?.payload) ? [...(eventsRow?.payload as Record<string, unknown>[])] : [];
  } catch {
    const state = await Promise.all([
      readAppStateFile(VISITORS_KEY, [] as Visitor[]),
      readAppStateFile(CASES_KEY, [] as Record<string, unknown>[]),
      readAppStateFile(CASE_EVENTS_KEY, [] as Record<string, unknown>[]),
    ]);
    visitors = [...state[0]];
    cases = [...state[1]];
    caseEvents = [...state[2]];
  }
  visitors.unshift(visitor);

  const caseId = crypto.randomUUID();
  cases.unshift({
    id: caseId,
    caseType: "visitor",
    status: "new",
    priority: "normal",
    unitTujuan: routing.unitTujuan,
    orgUnitId: routing.orgUnitId,
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

  caseEvents.push({
    id: crypto.randomUUID(),
    caseId,
    actorUserId: null,
    eventType: "created",
    payloadJson: { source: "register" },
    createdAt: iso,
  });

  try {
    await prisma.$transaction([
      prisma.appState.upsert({ where: { key: VISITORS_KEY }, create: { key: VISITORS_KEY, payload: visitors as Prisma.InputJsonValue }, update: { payload: visitors as Prisma.InputJsonValue } }),
      prisma.appState.upsert({ where: { key: CASES_KEY }, create: { key: CASES_KEY, payload: cases as Prisma.InputJsonValue }, update: { payload: cases as Prisma.InputJsonValue } }),
      prisma.appState.upsert({ where: { key: CASE_EVENTS_KEY }, create: { key: CASE_EVENTS_KEY, payload: caseEvents as Prisma.InputJsonValue }, update: { payload: caseEvents as Prisma.InputJsonValue } }),
    ]);
  } catch {
    await Promise.all([
      writeAppStateFile(VISITORS_KEY, visitors),
      writeAppStateFile(CASES_KEY, cases),
      writeAppStateFile(CASE_EVENTS_KEY, caseEvents),
    ]);
  }

  try {
    const targets = await prisma.staffUser.findMany({
      where: { role: { in: ["admin", "receptionist"] }, isActive: true }
    });

    if (targets.length > 0) {
      await prisma.webNotification.createMany({
        data: targets.map(t => ({
          toUserId: t.id,
          type: "status_update",
          title: `Tamu Baru Lobi: ${visitor.name}`,
          body: `Tujuan: ${visitor.unit} - ${visitor.purpose}`,
          link: `/admin/cases/${caseId}`,
        }))
      });
    }
  } catch {
    // silently fail notifications
  }

  await writeAuditLog({ action: "visitor.submit", targetType: "visitor", targetId: visitor.id, metadata: { caseId } });
  return NextResponse.json({ visitor }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireRole(request, ["admin"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const id = request.nextUrl.searchParams.get("id");

  if (id) {
    try {
      let visitors: Visitor[] = [];
      const row = await prisma.appState.findUnique({ where: { key: VISITORS_KEY } });
      visitors = Array.isArray(row?.payload) ? (row?.payload as Visitor[]) : [];

      const newVisitors = visitors.filter((v) => v.id !== id && v.trackingId !== id);

      await prisma.appState.upsert({
        where: { key: VISITORS_KEY },
        create: { key: VISITORS_KEY, payload: newVisitors as Prisma.InputJsonValue },
        update: { payload: newVisitors as Prisma.InputJsonValue }
      });

      await writeAuditLog({ action: "visitor.delete", actorUserId: auth.user.id, targetType: "visitor", targetId: id });
      return NextResponse.json({ ok: true });
    } catch {
      return NextResponse.json({ message: "Gagal menghapus data pengunjung." }, { status: 500 });
    }
  }

  try {
    await prisma.appState.upsert({ where: { key: VISITORS_KEY }, create: { key: VISITORS_KEY, payload: [] as Prisma.InputJsonValue }, update: { payload: [] as Prisma.InputJsonValue } });
  } catch {
    await writeAppStateFile(VISITORS_KEY, []);
  }
  await writeAuditLog({ action: "visitor.clear", actorUserId: auth.user.id, targetType: "visitor" });
  return NextResponse.json({ ok: true });
}
