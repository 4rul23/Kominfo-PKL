import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { ensureDefaultStaffUsers, hashSecret, mapInstansiForClient, mapInstansiFromClient, requireRole, writeAuditLog } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toClientUser(user: {
  id: string;
  username: string;
  name: string;
  nipNik: string;
  instansi: Parameters<typeof mapInstansiForClient>[0];
  role: "admin" | "receptionist" | "operator";
  orgUnitId: string | null;
  whatsapp: string;
  isActive: boolean;
}): Record<string, string | boolean | null> {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    nipNik: user.nipNik,
    instansi: mapInstansiForClient(user.instansi),
    role: user.role,
    orgUnitId: user.orgUnitId,
    whatsapp: user.whatsapp,
    isActive: user.isActive,
    password: "",
    timestamp: "",
    date: "",
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "receptionist", "operator"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  await ensureDefaultStaffUsers();
  const users = await prisma.staffUser.findMany({ orderBy: { username: "asc" } });
  return NextResponse.json({ users: users.map(toClientUser) });
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["admin"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const username = String(body.username || "").trim();
  const name = String(body.name || "").trim();
  const nipNik = String(body.nipNik || "-").trim() || "-";
  const instansi = mapInstansiFromClient(String(body.instansi || "Diskominfo Makassar"));
  const role = String(body.role || "operator").trim() as "admin" | "receptionist" | "operator";
  const orgUnitId = String(body.orgUnitId || "").trim() || null;
  const whatsapp = String(body.whatsapp || "-").trim() || "-";
  const isActive = body.isActive !== false;
  const password = String(body.password || "");

  if (!username || !name || !password) {
    return NextResponse.json({ message: "Username, nama, dan password wajib diisi." }, { status: 400 });
  }

  const user = await prisma.staffUser.create({
    data: {
      username,
      passwordHash: hashSecret(password),
      name,
      nipNik,
      instansi,
      role,
      orgUnitId,
      whatsapp,
      isActive,
    },
  });

  await writeAuditLog({ action: "staff_user.create", actorUserId: auth.user.id, targetType: "staff_user", targetId: user.id });
  return NextResponse.json({ user: toClientUser(user) }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireRole(request, ["admin"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const id = String(body.id || "").trim();
  if (!id) {
    return NextResponse.json({ message: "ID user wajib diisi." }, { status: 400 });
  }

  const existing = await prisma.staffUser.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ message: "User tidak ditemukan." }, { status: 404 });
  }

  const password = String(body.password || "");
  const updated = await prisma.staffUser.update({
    where: { id },
    data: {
      username: body.username !== undefined ? String(body.username || "").trim() : undefined,
      name: body.name !== undefined ? String(body.name || "").trim() : undefined,
      nipNik: body.nipNik !== undefined ? String(body.nipNik || "-").trim() || "-" : undefined,
      instansi: body.instansi !== undefined ? mapInstansiFromClient(String(body.instansi || "Diskominfo Makassar")) : undefined,
      role: body.role !== undefined ? String(body.role || existing.role).trim() as "admin" | "receptionist" | "operator" : undefined,
      orgUnitId: body.orgUnitId !== undefined ? (String(body.orgUnitId || "").trim() || null) : undefined,
      whatsapp: body.whatsapp !== undefined ? String(body.whatsapp || "-").trim() || "-" : undefined,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
      ...(password ? { passwordHash: hashSecret(password) } : {}),
    },
  });

  await writeAuditLog({ action: "staff_user.update", actorUserId: auth.user.id, targetType: "staff_user", targetId: updated.id });
  return NextResponse.json({ user: toClientUser(updated) });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireRole(request, ["admin"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const id = (new URL(request.url).searchParams.get("id") || "").trim();
  if (!id) {
    return NextResponse.json({ message: "ID user wajib diisi." }, { status: 400 });
  }

  await prisma.staffUser.delete({ where: { id } });
  await writeAuditLog({ action: "staff_user.delete", actorUserId: auth.user.id, targetType: "staff_user", targetId: id });
  return NextResponse.json({ ok: true });
}
