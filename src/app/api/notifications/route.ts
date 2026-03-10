import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireRole, writeAuditLog } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "operator", "receptionist"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const userId = (new URL(request.url).searchParams.get("userId") || "").trim();
  const targetUserId = userId || auth.user.id;
  if (targetUserId !== auth.user.id && auth.user.role !== "admin") {
    return NextResponse.json({ message: "Tidak memiliki akses ke notifikasi user lain." }, { status: 403 });
  }

  const list = await prisma.webNotification.findMany({
    where: { toUserId: targetUserId },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return NextResponse.json({ notifications: list.map((item) => ({ ...item, createdAt: item.createdAt.toISOString(), readAt: item.readAt?.toISOString() || null })) });
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "operator", "receptionist"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const body = (await request.json()) as {
    toUserId?: string;
    type?: string;
    title?: string;
    body?: string;
    link?: string;
  };

  const toUserId = (body.toUserId || "").trim();
  const type = (body.type || "").trim();
  const title = (body.title || "").trim();
  const content = (body.body || "").trim();
  const link = (body.link || "").trim() || null;
  if (!toUserId || !type || !title || !content) {
    return NextResponse.json({ message: "Payload notifikasi tidak lengkap." }, { status: 400 });
  }

  const created = await prisma.webNotification.create({
    data: {
      toUserId,
      type,
      title,
      body: content,
      link,
    },
  });

  await writeAuditLog({
    action: "notification.created",
    actorUserId: auth.user.id,
    targetType: "web_notification",
    targetId: created.id,
    metadata: { toUserId, type },
  });

  return NextResponse.json({
    notification: {
      ...created,
      createdAt: created.createdAt.toISOString(),
      readAt: created.readAt?.toISOString() || null,
    },
  }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "operator", "receptionist"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const body = (await request.json()) as {
    id?: string;
    userId?: string;
    markAllRead?: boolean;
    clearAll?: boolean;
  };

  const id = (body.id || "").trim();
  const userId = (body.userId || auth.user.id).trim();
  const isOwnScope = userId === auth.user.id;
  if (!isOwnScope && auth.user.role !== "admin") {
    return NextResponse.json({ message: "Tidak memiliki akses ke notifikasi user lain." }, { status: 403 });
  }

  if (body.clearAll) {
    const deleted = await prisma.webNotification.deleteMany({ where: { toUserId: userId } });
    return NextResponse.json({ ok: true, deleted: deleted.count });
  }

  if (body.markAllRead) {
    const now = new Date();
    const updated = await prisma.webNotification.updateMany({
      where: { toUserId: userId, readAt: null },
      data: { readAt: now },
    });
    return NextResponse.json({ ok: true, updated: updated.count });
  }

  if (!id) {
    return NextResponse.json({ message: "ID notifikasi wajib diisi." }, { status: 400 });
  }

  const item = await prisma.webNotification.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ message: "Notifikasi tidak ditemukan." }, { status: 404 });
  }
  if (item.toUserId !== auth.user.id && auth.user.role !== "admin") {
    return NextResponse.json({ message: "Tidak memiliki akses ke notifikasi ini." }, { status: 403 });
  }

  const updated = await prisma.webNotification.update({
    where: { id },
    data: { readAt: new Date() },
  });

  return NextResponse.json({
    notification: {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      readAt: updated.readAt?.toISOString() || null,
    },
  });
}
