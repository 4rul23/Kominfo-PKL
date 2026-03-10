import { NextResponse, type NextRequest } from "next/server";

import {
  AUTH_COOKIE_NAME,
  authenticateStaffUser,
  createStaffSession,
  mapInstansiForClient,
  writeAuditLog,
} from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { username?: string; password?: string };
    const username = (body.username || "").trim();
    const password = body.password || "";

    if (!username || !password) {
      return NextResponse.json({ message: "Username dan password wajib diisi." }, { status: 400 });
    }

    const user = await authenticateStaffUser({ username, password });
    if (!user) {
      return NextResponse.json({ message: "Username atau password salah." }, { status: 401 });
    }

    const { token, expiresAt } = await createStaffSession(user.id, {
      userAgent: request.headers.get("user-agent"),
      ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
    });

    await writeAuditLog({
      action: "auth.login",
      actorUserId: user.id,
      targetType: "staff_user",
      targetId: user.id,
      metadata: { username: user.username, role: user.role },
    });

    const response = NextResponse.json({
      user: {
        ...user,
        instansiLabel: mapInstansiForClient(user.instansi),
      },
    });
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });
    return response;
  } catch {
    return NextResponse.json({ message: "Gagal login." }, { status: 500 });
  }
}
