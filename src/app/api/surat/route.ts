import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { MAX_SURAT_REQUEST_BYTES, getFileExtension } from "@/lib/attachmentPolicy";
import { decodeAttachmentDataUrl, sanitizeSuratText, validateAndSanitizeAttachments } from "@/lib/server/attachmentValidation";
import { scanAttachmentWithOptionalService } from "@/lib/server/malwareScan";
import { prisma } from "@/lib/prisma";
import { requireRole, writeAuditLog } from "@/lib/server/auth";
import { normalizeSuratStatus } from "@/lib/suratWorkflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SuratPayload = {
  id: string;
  trackingId: string;
  [key: string]: unknown;
};

type StoredAttachment = {
  id: string;
  filename: string;
  storedFilename: string;
  type: string;
  size: number;
  uploadedAt: string;
  relativePath: string;
  fileUrl: string;
};

const ATTACHMENT_STORAGE_ROOT = path.join(process.cwd(), "storage", "surat-attachments");

function toPublicAttachmentPath(relativePath: string): string {
  return `/api/surat/files/${relativePath.split(/[\\/]+/).map(encodeURIComponent).join("/")}`;
}

function sanitizeFilenameBase(filename: string): string {
  return filename
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "attachment";
}

function normalizeStoredAttachments(input: unknown): StoredAttachment[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as Record<string, unknown>;
      const id = typeof row.id === "string" ? row.id : "";
      const filename = typeof row.filename === "string" ? row.filename : "";
      const storedFilename = typeof row.storedFilename === "string" ? row.storedFilename : "";
      const type = typeof row.type === "string" ? row.type : "";
      const size = typeof row.size === "number" ? row.size : 0;
      const uploadedAt = typeof row.uploadedAt === "string" ? row.uploadedAt : new Date().toISOString();
      const relativePath = typeof row.relativePath === "string" ? row.relativePath : "";
      const fileUrl = typeof row.fileUrl === "string" ? row.fileUrl : "";
      if (!id || !filename || !storedFilename || !type || !relativePath || !fileUrl) return null;
      return { id, filename, storedFilename, type, size, uploadedAt, relativePath, fileUrl } satisfies StoredAttachment;
    })
    .filter((item): item is StoredAttachment => item !== null);
}

async function persistAttachments(suratId: string, rawAttachments: unknown, existingAttachments: StoredAttachment[]): Promise<StoredAttachment[]> {
  const attachmentsWithData = Array.isArray(rawAttachments)
    ? rawAttachments.filter((item) => item && typeof item === "object" && typeof (item as Record<string, unknown>).data === "string")
    : [];

  if (attachmentsWithData.length === 0) {
    return existingAttachments;
  }

  const normalizedLampiran = validateAndSanitizeAttachments(rawAttachments);
  const suratFolder = path.join(ATTACHMENT_STORAGE_ROOT, suratId);
  await mkdir(suratFolder, { recursive: true });

  const stored: StoredAttachment[] = [];
  for (const attachment of normalizedLampiran) {
    const decoded = decodeAttachmentDataUrl(attachment.data);
    await scanAttachmentWithOptionalService({
      filename: attachment.filename,
      mime: attachment.type,
      bytes: decoded.bytes,
    });

    const ext = getFileExtension(attachment.filename) || ".bin";
    const base = sanitizeFilenameBase(attachment.filename.replace(/\.[^.]+$/, ""));
    const storedFilename = `${attachment.id}-${base}${ext}`;
    const fullPath = path.join(suratFolder, storedFilename);
    await writeFile(fullPath, decoded.bytes);

    const relativePath = `${suratId}/${storedFilename}`;
    stored.push({
      id: attachment.id,
      filename: attachment.filename,
      storedFilename,
      type: attachment.type,
      size: attachment.size,
      uploadedAt: attachment.uploadedAt,
      relativePath,
      fileUrl: toPublicAttachmentPath(relativePath),
    });
  }

  return stored;
}

function buildPublicTrackingPayload(payload: unknown): Record<string, unknown> {
  const src = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  return {
    trackingId: src.trackingId,
    nomorSurat: src.nomorSurat,
    namaPengirim: src.namaPengirim,
    instansiPengirim: src.instansiPengirim,
    perihal: src.perihal,
    jenisSurat: src.jenisSurat,
    isiSurat: src.isiSurat,
    lampiran: src.lampiran,
    prioritas: src.prioritas,
    slaDeadline: src.slaDeadline,
    status: src.status,
    statusHistory: src.statusHistory,
    approvalTrail: src.approvalTrail,
    disposisi: src.disposisi,
    responseNote: src.responseNote,
    date: src.date,
    timestamp: src.timestamp,
    lastUpdated: src.lastUpdated,
  };
}

export async function GET(request: NextRequest) {
  const trackingId = (new URL(request.url).searchParams.get("trackingId") || "").trim();

  if (trackingId) {
    const item = await prisma.suratSubmission.findUnique({ where: { trackingId } });
    if (!item) {
      return NextResponse.json({ surat: null }, { status: 404 });
    }
    return NextResponse.json({ surat: buildPublicTrackingPayload(item.payload) });
  }

  const auth = await requireRole(request, ["admin", "receptionist", "operator"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const rows = await prisma.suratSubmission.findMany({ orderBy: { updatedAt: "desc" }, take: 1000 });
  return NextResponse.json({ surat: rows.map((row) => row.payload) });
}

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get("content-length") || "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_SURAT_REQUEST_BYTES) {
      return NextResponse.json({ message: "Ukuran payload surat terlalu besar." }, { status: 413 });
    }

    const payload = (await request.json()) as { surat?: SuratPayload };
    const surat = payload.surat;
    if (!surat?.id || !surat.trackingId) {
      return NextResponse.json({ message: "Payload surat tidak lengkap." }, { status: 400 });
    }

    const normalizedStatus = normalizeSuratStatus(surat.status);
    const existing = await prisma.suratSubmission.findUnique({ where: { id: surat.id } });
    const existingPayload = existing?.payload as Record<string, unknown> | undefined;
    const existingAttachments = normalizeStoredAttachments(existingPayload?.lampiran);

    const storedAttachments = await persistAttachments(surat.id, surat.lampiran, existingAttachments);
    const normalizedSurat = {
      ...surat,
      namaPengirim: sanitizeSuratText(surat.namaPengirim, 120),
      emailPengirim: sanitizeSuratText(surat.emailPengirim, 180),
      teleponPengirim: sanitizeSuratText(surat.teleponPengirim, 40),
      instansiPengirim: sanitizeSuratText(surat.instansiPengirim, 180),
      alamatPengirim: sanitizeSuratText(surat.alamatPengirim, 500),
      perihal: sanitizeSuratText(surat.perihal, 240),
      jenisSurat: sanitizeSuratText(surat.jenisSurat, 80),
      isiSurat: sanitizeSuratText(surat.isiSurat, 10000),
      status: normalizedStatus,
      lampiran: storedAttachments,
    };

    if (!normalizedSurat.namaPengirim || !normalizedSurat.instansiPengirim || !normalizedSurat.perihal || !normalizedSurat.isiSurat) {
      return NextResponse.json({ message: "Data wajib surat belum lengkap." }, { status: 400 });
    }

    if (!normalizedSurat.status) {
      return NextResponse.json({ message: "Status surat tidak valid." }, { status: 400 });
    }

    if (!existing) {
      if (normalizedSurat.status !== "submitted") {
        return NextResponse.json({ message: "Status awal surat wajib submitted." }, { status: 400 });
      }
    } else {
      const auth = await requireRole(request, ["admin", "receptionist", "operator"]);
      if (!auth.ok) {
        return NextResponse.json({ message: "Update surat hanya untuk pengguna internal terautentikasi." }, { status: auth.status });
      }

      const currentStatus = normalizeSuratStatus(existingPayload?.status) || "submitted";
      if (currentStatus !== normalizedSurat.status) {
        return NextResponse.json({ message: "Perubahan status wajib melalui endpoint transisi workflow." }, { status: 409 });
      }

      await writeAuditLog({
        action: "surat.update_non_status",
        actorUserId: auth.user.id,
        targetType: "surat",
        targetId: normalizedSurat.id,
        metadata: {
          trackingId: normalizedSurat.trackingId,
          status: normalizedSurat.status,
        },
      });
    }

    const saved = await prisma.suratSubmission.upsert({
      where: { id: surat.id },
      create: {
        id: normalizedSurat.id,
        trackingId: normalizedSurat.trackingId,
        payload: normalizedSurat as Prisma.InputJsonValue,
      },
      update: {
        trackingId: normalizedSurat.trackingId,
        payload: normalizedSurat as Prisma.InputJsonValue,
      },
    });

    await writeAuditLog({
      action: "surat.upsert",
      targetType: "surat",
      targetId: String(saved.id),
      metadata: {
        trackingId: normalizedSurat.trackingId,
        attachmentCount: storedAttachments.length,
        attachmentTotalBytes: storedAttachments.reduce((sum, item) => sum + item.size, 0),
        storageRoot: ATTACHMENT_STORAGE_ROOT,
      },
    });

    return NextResponse.json({ surat: saved.payload }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan surat.";
    const status = /invalid|tidak valid|melebihi batas|berbahaya|wajib/i.test(message) ? 400 : 500;
    return NextResponse.json({ message }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireRole(request, ["admin"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const id = request.nextUrl.searchParams.get("id");

  try {
    if (id) {
      await prisma.suratSubmission.delete({ where: { id } });
      await writeAuditLog({ action: "surat.delete", actorUserId: auth.user.id, targetType: "surat", targetId: id });
    } else {
      await prisma.suratSubmission.deleteMany({});
      await writeAuditLog({ action: "surat.clear", actorUserId: auth.user.id, targetType: "surat" });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ message: "Gagal menghapus data surat." }, { status: 500 });
  }
}
