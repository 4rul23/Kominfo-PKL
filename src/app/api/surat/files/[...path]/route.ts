import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ATTACHMENT_STORAGE_ROOT = path.join(process.cwd(), "storage", "surat-attachments");

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".pdf":
      return "application/pdf";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".doc":
      return "application/msword";
    case ".docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    default:
      return "application/octet-stream";
  }
}

export async function GET(_: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const params = await context.params;
    const segments = Array.isArray(params.path) ? params.path : [];
    if (segments.length === 0) {
      return NextResponse.json({ message: "Path file tidak valid." }, { status: 400 });
    }

    const safeRelativePath = path.normalize(segments.join(path.sep));
    const fullPath = path.join(ATTACHMENT_STORAGE_ROOT, safeRelativePath);
    const normalizedRoot = path.normalize(ATTACHMENT_STORAGE_ROOT + path.sep);
    const normalizedFull = path.normalize(fullPath);

    if (!normalizedFull.startsWith(normalizedRoot)) {
      return NextResponse.json({ message: "Akses file ditolak." }, { status: 403 });
    }

    const fileBuffer = await readFile(normalizedFull);
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": getMimeType(normalizedFull),
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return NextResponse.json({ message: "File lampiran tidak ditemukan." }, { status: 404 });
  }
}
