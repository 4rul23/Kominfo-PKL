import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    { message: "Surat seed endpoint is deprecated and disabled." },
    { status: 410 },
  );
}
