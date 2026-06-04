import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireRole, writeAuditLog } from "@/lib/server/auth";
import { readAppStateFile, writeAppStateFile } from "@/lib/server/appStateStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORG_UNITS_KEY = "org-units.v1";
const ORG_CONTACTS_KEY = "org-unit-contacts.v1";

type OrgUnit = { id: string; code: string; name: string; type: string; parentId: string | null };
type OrgUnitContact = { id: string; orgUnitId: string; contactType: string; userId: string | null; nameOverride: string | null; whatsapp: string };

const defaultUnits: OrgUnit[] = [
  { id: "DISKOMINFO_KOTA_MAKASSAR", code: "DISKOMINFO_KOTA_MAKASSAR", name: "Diskominfo Kota Makassar", type: "root", parentId: null },
  { id: "SEKRETARIAT", code: "SEKRETARIAT", name: "Sekretariat", type: "sekretariat", parentId: "DISKOMINFO_KOTA_MAKASSAR" },
  { id: "SUBBAG_PERENCANAAN_PELAPORAN", code: "SUBBAG_PERENCANAAN_PELAPORAN", name: "Subbagian Perencanaan dan Pelaporan", type: "subbag", parentId: "SEKRETARIAT" },
  { id: "SUBBAG_KEUANGAN", code: "SUBBAG_KEUANGAN", name: "Subbagian Keuangan", type: "subbag", parentId: "SEKRETARIAT" },
  { id: "SUBBAG_UMUM_KEPEGAWAIAN", code: "SUBBAG_UMUM_KEPEGAWAIAN", name: "Subbagian Umum dan Kepegawaian", type: "subbag", parentId: "SEKRETARIAT" },
  { id: "BIDANG_IKP", code: "BIDANG_IKP", name: "Bidang IKP (Humas, Informasi, Komunikasi Publik)", type: "bidang", parentId: "DISKOMINFO_KOTA_MAKASSAR" },
  { id: "BIDANG_APTIKA", code: "BIDANG_APTIKA", name: "Bidang APTIKA (Aplikasi Informatika)", type: "bidang", parentId: "DISKOMINFO_KOTA_MAKASSAR" },
  { id: "BIDANG_PDE_STATISTIK", code: "BIDANG_PDE_STATISTIK", name: "Bidang Pengolahan Data Elektronik dan Statistik", type: "bidang", parentId: "DISKOMINFO_KOTA_MAKASSAR" },
  { id: "BIDANG_PERSANDIAN_KEAMANAN", code: "BIDANG_PERSANDIAN_KEAMANAN", name: "Bidang Persandian dan Keamanan Informasi", type: "bidang", parentId: "DISKOMINFO_KOTA_MAKASSAR" },
  { id: "UPT_WARROOM", code: "UPT_WARROOM", name: "UPT Warroom", type: "upt", parentId: null },
  { id: "JABATAN_FUNGSIONAL_PELAKSANA", code: "JABATAN_FUNGSIONAL_PELAKSANA", name: "Kelompok Jabatan Fungsional dan Pelaksana", type: "pool", parentId: "DISKOMINFO_KOTA_MAKASSAR" },
];
const defaultContacts: OrgUnitContact[] = [
  { id: "kadis-default", orgUnitId: "DISKOMINFO_KOTA_MAKASSAR", contactType: "kadis", userId: null, nameOverride: "Kepala Dinas", whatsapp: "08xxxxxxxxxx" },
  { id: "upt-warroom-lead", orgUnitId: "UPT_WARROOM", contactType: "lead", userId: null, nameOverride: "Koordinator UPT Warroom", whatsapp: "08xxxxxxxxxx" },
  { id: "aptika-lead", orgUnitId: "BIDANG_APTIKA", contactType: "lead", userId: null, nameOverride: "Kepala Bidang APTIKA", whatsapp: "08xxxxxxxxxx" },
  { id: "ikp-lead", orgUnitId: "BIDANG_IKP", contactType: "lead", userId: null, nameOverride: "Kepala Bidang IKP", whatsapp: "08xxxxxxxxxx" },
  { id: "pde-lead", orgUnitId: "BIDANG_PDE_STATISTIK", contactType: "lead", userId: null, nameOverride: "Kepala Bidang PDE Statistik", whatsapp: "08xxxxxxxxxx" },
  { id: "persandian-lead", orgUnitId: "BIDANG_PERSANDIAN_KEAMANAN", contactType: "lead", userId: null, nameOverride: "Kepala Bidang Persandian", whatsapp: "08xxxxxxxxxx" },
  { id: "sekretariat-lead", orgUnitId: "SEKRETARIAT", contactType: "lead", userId: null, nameOverride: "Sekretaris Dinas", whatsapp: "08xxxxxxxxxx" },
];

async function ensureOrgState() {
  try {
    const [units, contacts] = await Promise.all([
      prisma.appState.findUnique({ where: { key: ORG_UNITS_KEY } }),
      prisma.appState.findUnique({ where: { key: ORG_CONTACTS_KEY } }),
    ]);
    if (!units) {
      await prisma.appState.create({ data: { key: ORG_UNITS_KEY, payload: defaultUnits as Prisma.InputJsonValue } });
    }
    if (!contacts) {
      await prisma.appState.create({ data: { key: ORG_CONTACTS_KEY, payload: defaultContacts as Prisma.InputJsonValue } });
    }
  } catch {
    const [units, contacts] = await Promise.all([
      readAppStateFile(ORG_UNITS_KEY, null as unknown as OrgUnit[] | null),
      readAppStateFile(ORG_CONTACTS_KEY, null as unknown as OrgUnitContact[] | null),
    ]);
    if (!units) await writeAppStateFile(ORG_UNITS_KEY, defaultUnits);
    if (!contacts) await writeAppStateFile(ORG_CONTACTS_KEY, defaultContacts);
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "receptionist", "operator"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  await ensureOrgState();
  try {
    const [units, contacts] = await Promise.all([
      prisma.appState.findUnique({ where: { key: ORG_UNITS_KEY } }),
      prisma.appState.findUnique({ where: { key: ORG_CONTACTS_KEY } }),
    ]);
    return NextResponse.json({
      units: Array.isArray(units?.payload) ? units?.payload : [],
      contacts: Array.isArray(contacts?.payload) ? contacts?.payload : [],
    });
  } catch {
    const [units, contacts] = await Promise.all([
      readAppStateFile(ORG_UNITS_KEY, defaultUnits),
      readAppStateFile(ORG_CONTACTS_KEY, defaultContacts),
    ]);
    return NextResponse.json({ units, contacts });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireRole(request, ["admin"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const body = (await request.json()) as { units?: unknown[]; contacts?: unknown[] };
  const units = Array.isArray(body.units) ? body.units : defaultUnits;
  const contacts = Array.isArray(body.contacts) ? body.contacts : defaultContacts;

  try {
    await prisma.$transaction([
      prisma.appState.upsert({ where: { key: ORG_UNITS_KEY }, create: { key: ORG_UNITS_KEY, payload: units as Prisma.InputJsonValue }, update: { payload: units as Prisma.InputJsonValue } }),
      prisma.appState.upsert({ where: { key: ORG_CONTACTS_KEY }, create: { key: ORG_CONTACTS_KEY, payload: contacts as Prisma.InputJsonValue }, update: { payload: contacts as Prisma.InputJsonValue } }),
    ]);
  } catch {
    await Promise.all([
      writeAppStateFile(ORG_UNITS_KEY, units),
      writeAppStateFile(ORG_CONTACTS_KEY, contacts),
    ]);
  }

  await writeAuditLog({ action: "org_units.sync", actorUserId: auth.user.id, targetType: "org_units" });
  return NextResponse.json({ ok: true });
}
