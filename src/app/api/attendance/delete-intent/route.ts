import { randomBytes } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { hashSecret, requireRole, writeAuditLog } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INTENT_TTL_MINUTES = 5;

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["admin"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as { reason?: string; confirmationText?: string };
  const reason = (body.reason || "").trim();
  const confirmationText = (body.confirmationText || "").trim();

  if (!reason) {
    return NextResponse.json({ message: "Alasan penghapusan wajib diisi." }, { status: 400 });
  }
  if (confirmationText.toUpperCase() !== "HAPUS") {
    return NextResponse.json({ message: "Konfirmasi wajib mengetik HAPUS." }, { status: 400 });
  }

  const rawToken = randomBytes(24).toString("base64url");
  const tokenHash = hashSecret(rawToken);
  const expiresAt = new Date(Date.now() + INTENT_TTL_MINUTES * 60 * 1000);

  await prisma.attendanceDeleteIntent.create({
    data: {
      tokenHash,
      userId: auth.user.id,
      reason,
      expiresAt,
    },
  });

  await writeAuditLog({
    action: "attendance.delete_intent.created",
    actorUserId: auth.user.id,
    targetType: "attendance",
    metadata: { reason, expiresAt: expiresAt.toISOString() },
  });

  return NextResponse.json({ token: rawToken, expiresAt: expiresAt.toISOString() });
}
