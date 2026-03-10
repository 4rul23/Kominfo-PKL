import { NextResponse, type NextRequest } from "next/server";

import { AUTH_COOKIE_NAME, getAuthUserFromRequest, revokeStaffSession, writeAuditLog } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  const token = (request.cookies.get(AUTH_COOKIE_NAME)?.value || "").trim();
  if (token) {
    await revokeStaffSession(token);
  }

  if (user) {
    await writeAuditLog({
      action: "auth.logout",
      actorUserId: user.id,
      targetType: "staff_user",
      targetId: user.id,
    });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
