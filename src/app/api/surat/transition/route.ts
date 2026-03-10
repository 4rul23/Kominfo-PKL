import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireRole, writeAuditLog } from "@/lib/server/auth";
import {
  canRolePerformTransition,
  canTransitionSuratStatus,
  getAllowedRolesForTransition,
  getStatusLabel,
  getSuratTransitionError,
  normalizeSuratStatus,
  type WorkflowActorRole,
} from "@/lib/suratWorkflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StatusHistoryEntry = {
  status: string;
  timestamp: string;
  note?: string;
};

type ApprovalTrailEntry = {
  id: string;
  fromStatus: string;
  toStatus: string;
  actorUserId: string;
  actorName: string;
  actorRole: string;
  note?: string;
  timestamp: string;
};

function parseStatusHistory(raw: unknown): StatusHistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  const result: StatusHistoryEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const status = normalizeSuratStatus(row.status);
    if (!status) continue;
    result.push({
      status,
      timestamp: typeof row.timestamp === "string" && row.timestamp ? row.timestamp : new Date().toISOString(),
      note: typeof row.note === "string" ? row.note : undefined,
    });
  }
  return result;
}

function parseApprovalTrail(raw: unknown): ApprovalTrailEntry[] {
  if (!Array.isArray(raw)) return [];
  const result: ApprovalTrailEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const fromStatus = normalizeSuratStatus(row.fromStatus);
    const toStatus = normalizeSuratStatus(row.toStatus);
    if (!fromStatus || !toStatus) continue;
    result.push({
      id: typeof row.id === "string" && row.id ? row.id : crypto.randomUUID(),
      fromStatus,
      toStatus,
      actorUserId: typeof row.actorUserId === "string" ? row.actorUserId : "-",
      actorName: typeof row.actorName === "string" ? row.actorName : "-",
      actorRole: typeof row.actorRole === "string" ? row.actorRole : "-",
      note: typeof row.note === "string" ? row.note : undefined,
      timestamp: typeof row.timestamp === "string" && row.timestamp ? row.timestamp : new Date().toISOString(),
    });
  }
  return result;
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "receptionist", "operator"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const body = (await request.json()) as { id?: string; toStatus?: string; note?: string };
    const id = (body.id || "").trim();
    const toStatus = normalizeSuratStatus(body.toStatus);
    const note = (body.note || "").trim().slice(0, 500);

    if (!id || !toStatus) {
      return NextResponse.json({ message: "Payload transisi tidak lengkap." }, { status: 400 });
    }

    if (["paraf", "approved", "archived"].includes(toStatus) && !note) {
      return NextResponse.json({ message: `Catatan wajib diisi saat status berubah ke ${getStatusLabel(toStatus)}.` }, { status: 400 });
    }

    const existing = await prisma.suratSubmission.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: "Surat tidak ditemukan." }, { status: 404 });
    }

    const payload = existing.payload as Record<string, unknown>;
    const fromStatus = normalizeSuratStatus(payload.status) || "submitted";

    if (!canTransitionSuratStatus(fromStatus, toStatus)) {
      return NextResponse.json({ message: getSuratTransitionError(fromStatus, toStatus) }, { status: 409 });
    }

    const actorRole = auth.user.role as WorkflowActorRole;
    if (!canRolePerformTransition(actorRole, fromStatus, toStatus)) {
      const allowedRoles = getAllowedRolesForTransition(fromStatus, toStatus);
      return NextResponse.json(
        { message: `Role ${actorRole} tidak berwenang untuk transisi ini. Role diizinkan: ${allowedRoles.join(", ")}.` },
        { status: 403 }
      );
    }

    const nowIso = new Date().toISOString();
    const statusHistory = parseStatusHistory(payload.statusHistory);
    statusHistory.push({
      status: toStatus,
      timestamp: nowIso,
      note: note || `Status diubah menjadi ${getStatusLabel(toStatus)} oleh ${auth.user.name}`,
    });

    const approvalTrail = parseApprovalTrail(payload.approvalTrail);
    approvalTrail.push({
      id: crypto.randomUUID(),
      fromStatus,
      toStatus,
      actorUserId: auth.user.id,
      actorName: auth.user.name,
      actorRole,
      note: note || undefined,
      timestamp: nowIso,
    });

    const updatedPayload = {
      ...payload,
      status: toStatus,
      statusHistory,
      approvalTrail,
      lastUpdated: nowIso,
    };

    const updated = await prisma.suratSubmission.update({
      where: { id },
      data: { payload: updatedPayload as Prisma.InputJsonValue },
    });

    await writeAuditLog({
      action: "surat.transition",
      actorUserId: auth.user.id,
      targetType: "surat",
      targetId: id,
      metadata: {
        fromStatus,
        toStatus,
        actorRole,
        actorName: auth.user.name,
        note: note || null,
      },
    });

    return NextResponse.json({ surat: updated.payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memproses transisi status surat.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
