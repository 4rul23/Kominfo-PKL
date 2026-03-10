import {
  MAX_ATTACHMENT_COUNT,
  MAX_ATTACHMENT_FILE_BYTES,
  MAX_ATTACHMENT_TOTAL_BYTES,
  getFileExtension,
  isAllowedAttachmentExtension,
  isAllowedAttachmentMime,
  isDangerousAttachmentExtension,
} from "@/lib/attachmentPolicy";

type IncomingAttachment = {
  id?: unknown;
  filename?: unknown;
  type?: unknown;
  size?: unknown;
  data?: unknown;
  uploadedAt?: unknown;
};

type SanitizedAttachment = {
  id: string;
  filename: string;
  type: string;
  size: number;
  data: string;
  uploadedAt: string;
};

const MIME_BY_EXTENSION: Record<string, string[]> = {
  ".pdf": ["application/pdf"],
  ".doc": ["application/msword"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
};

function toSafeFilename(input: string): string {
  const noPath = input.replace(/[\\/]/g, "_");
  const collapsed = noPath.replace(/\s+/g, " ").trim();
  return collapsed.slice(0, 180);
}

export function decodeAttachmentDataUrl(dataUrl: string): { mime: string; bytes: Buffer } {
  const m = dataUrl.match(/^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!m) {
    throw new Error("Format lampiran tidak valid.");
  }
  const mime = m[1].toLowerCase().trim();
  const bytes = Buffer.from(m[2], "base64");
  if (bytes.length === 0) {
    throw new Error("Lampiran kosong.");
  }
  return { mime, bytes };
}

function startsWithBytes(buf: Buffer, prefix: number[]): boolean {
  if (buf.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i += 1) {
    if (buf[i] !== prefix[i]) return false;
  }
  return true;
}

function detectFileSignature(buffer: Buffer): "pdf" | "png" | "jpeg" | "doc" | "zip" | "unknown" {
  if (startsWithBytes(buffer, [0x25, 0x50, 0x44, 0x46])) return "pdf";
  if (startsWithBytes(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (startsWithBytes(buffer, [0xff, 0xd8, 0xff])) return "jpeg";
  if (startsWithBytes(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return "doc";
  if (startsWithBytes(buffer, [0x50, 0x4b, 0x03, 0x04])) return "zip";
  return "unknown";
}

function ensureSignatureMatches(ext: string, mime: string, sig: ReturnType<typeof detectFileSignature>): void {
  if (ext === ".pdf" && (mime !== "application/pdf" || sig !== "pdf")) {
    throw new Error("Lampiran PDF tidak valid.");
  }
  if ((ext === ".jpg" || ext === ".jpeg") && (mime !== "image/jpeg" || sig !== "jpeg")) {
    throw new Error("Lampiran JPG/JPEG tidak valid.");
  }
  if (ext === ".png" && (mime !== "image/png" || sig !== "png")) {
    throw new Error("Lampiran PNG tidak valid.");
  }
  if (ext === ".doc" && (mime !== "application/msword" || sig !== "doc")) {
    throw new Error("Lampiran DOC tidak valid.");
  }
  if (ext === ".docx" && (mime !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || sig !== "zip")) {
    throw new Error("Lampiran DOCX tidak valid.");
  }
}

function hasSuspiciousPayload(buffer: Buffer, mime: string): boolean {
  const head = buffer.subarray(0, Math.min(buffer.length, 32768)).toString("latin1").toLowerCase();
  const suspiciousMarkers = ["<script", "powershell", "cmd.exe", "wscript", "mshta", "eval(", "<?php"];
  if (suspiciousMarkers.some((marker) => head.includes(marker))) return true;

  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    if (head.includes("vbaProject.bin".toLowerCase())) return true;
  }

  if (startsWithBytes(buffer, [0x4d, 0x5a])) return true;
  return false;
}

function toStringSafe(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function validateAndSanitizeAttachments(input: unknown): SanitizedAttachment[] {
  const list = Array.isArray(input) ? (input as IncomingAttachment[]) : [];
  if (list.length > MAX_ATTACHMENT_COUNT) {
    throw new Error(`Lampiran maksimal ${MAX_ATTACHMENT_COUNT} file.`);
  }

  let totalBytes = 0;
  const normalized: SanitizedAttachment[] = [];

  for (const raw of list) {
    const id = toStringSafe(raw.id).trim();
    const originalFilename = toStringSafe(raw.filename);
    const filename = toSafeFilename(originalFilename);
    const declaredMime = toStringSafe(raw.type).toLowerCase().trim();
    const dataUrl = toStringSafe(raw.data).trim();
    const uploadedAt = toStringSafe(raw.uploadedAt).trim() || new Date().toISOString();

    if (!id || !filename || !declaredMime || !dataUrl) {
      throw new Error("Data lampiran tidak lengkap.");
    }
    if (isDangerousAttachmentExtension(filename)) {
      throw new Error(`Ekstensi file berbahaya ditolak: ${filename}`);
    }
    if (!isAllowedAttachmentExtension(filename) || !isAllowedAttachmentMime(declaredMime)) {
      throw new Error(`Format lampiran tidak diizinkan: ${filename}`);
    }

    const ext = getFileExtension(filename);
    const expectedMimes = MIME_BY_EXTENSION[ext] || [];
    if (!expectedMimes.includes(declaredMime)) {
      throw new Error(`Tipe MIME tidak cocok dengan ekstensi: ${filename}`);
    }

    const { mime, bytes } = decodeAttachmentDataUrl(dataUrl);
    if (mime !== declaredMime) {
      throw new Error(`Header data lampiran tidak konsisten: ${filename}`);
    }

    const declaredSize = Number(raw.size);
    if (!Number.isFinite(declaredSize) || declaredSize <= 0) {
      throw new Error(`Ukuran lampiran tidak valid: ${filename}`);
    }
    if (Math.abs(bytes.length - declaredSize) > 32) {
      throw new Error(`Ukuran lampiran tidak konsisten: ${filename}`);
    }

    if (bytes.length > MAX_ATTACHMENT_FILE_BYTES) {
      throw new Error(`Ukuran lampiran melebihi batas: ${filename}`);
    }

    const sig = detectFileSignature(bytes);
    ensureSignatureMatches(ext, declaredMime, sig);

    if (hasSuspiciousPayload(bytes, declaredMime)) {
      throw new Error(`Konten lampiran terindikasi berbahaya: ${filename}`);
    }

    totalBytes += bytes.length;
    if (totalBytes > MAX_ATTACHMENT_TOTAL_BYTES) {
      throw new Error("Total ukuran lampiran melebihi batas.");
    }

    normalized.push({
      id,
      filename,
      type: declaredMime,
      size: bytes.length,
      data: dataUrl,
      uploadedAt,
    });
  }

  return normalized;
}

export function sanitizeSuratText(value: unknown, maxLength: number): string {
  const text = typeof value === "string" ? value : "";
  const cleaned = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
  return cleaned.slice(0, maxLength);
}
