import { NextResponse, type NextRequest } from "next/server";

import { getAuthUserFromRequest, mapInstansiForClient } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      ...user,
      instansiLabel: mapInstansiForClient(user.instansi),
    },
  });
}
