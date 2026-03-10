import { createHash, randomBytes } from "node:crypto";

import { type NextRequest } from "next/server";
import { Prisma, type StaffInstansi, type StaffRole, type StaffUser } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const AUTH_COOKIE_NAME = "diskominfo_staff_session";
const SESSION_TTL_HOURS = 12;

type PublicStaffUser = {
  id: string;
  username: string;
  name: string;
  nipNik: string;
  instansi: StaffInstansi;
  role: StaffRole;
  orgUnitId: string | null;
  whatsapp: string;
  isActive: boolean;
};

const DEFAULT_USERS: Array<{
  username: string;
  password: string;
  name: string;
  nipNik: string;
  instansi: StaffInstansi;
  role: StaffRole;
  orgUnitId: string | null;
  whatsapp: string;
  isActive: boolean;
}> = [
  {
    username: "admin",
    password: "admin123",
    name: "Administrator",
    nipNik: "-",
    instansi: "DISKOMINFO_MAKASSAR",
    role: "admin",
    orgUnitId: null,
    whatsapp: "-",
    isActive: true,
  },
  {
    username: "resepsionis",
    password: "reseps123",
    name: "Resepsionis UPT Warroom",
    nipNik: "-",
    instansi: "UPT_WARROOM",
    role: "receptionist",
    orgUnitId: null,
    whatsapp: "08xxxxxxxxxx",
    isActive: true,
  },
  {
    username: "operator-upt",
    password: "op123",
    name: "Operator UPT Warroom",
    nipNik: "-",
    instansi: "UPT_WARROOM",
    role: "operator",
    orgUnitId: "UPT_WARROOM",
    whatsapp: "08xxxxxxxxxx",
    isActive: true,
  },
  {
    username: "operator-aptika",
    password: "op123",
    name: "Operator Bidang APTIKA",
    nipNik: "-",
    instansi: "DISKOMINFO_MAKASSAR",
    role: "operator",
    orgUnitId: "BIDANG_APTIKA",
    whatsapp: "08xxxxxxxxxx",
    isActive: true,
  },
];

export function hashSecret(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function toPublicUser(user: StaffUser): PublicStaffUser {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    nipNik: user.nipNik,
    instansi: user.instansi,
    role: user.role,
    orgUnitId: user.orgUnitId,
    whatsapp: user.whatsapp,
    isActive: user.isActive,
  };
}

export async function ensureDefaultStaffUsers(): Promise<void> {
  const count = await prisma.staffUser.count();
  if (count > 0) return;

  await prisma.staffUser.createMany({
    data: DEFAULT_USERS.map((user) => ({
      username: user.username,
      passwordHash: hashSecret(user.password),
      name: user.name,
      nipNik: user.nipNik,
      instansi: user.instansi,
      role: user.role,
      orgUnitId: user.orgUnitId,
      whatsapp: user.whatsapp,
      isActive: user.isActive,
    })),
  });
}

export async function authenticateStaffUser(input: { username: string; password: string }): Promise<PublicStaffUser | null> {
  await ensureDefaultStaffUsers();
  const username = input.username.trim();
  if (!username || !input.password) return null;

  const user = await prisma.staffUser.findUnique({ where: { username } });
  if (!user || !user.isActive) return null;

  const passwordHash = hashSecret(input.password);
  if (user.passwordHash !== passwordHash) return null;

  return toPublicUser(user);
}

export async function createStaffSession(userId: string, meta?: { userAgent?: string | null; ipAddress?: string | null }): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashSecret(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);

  await prisma.staffSession.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      userAgent: meta?.userAgent || null,
      ipAddress: meta?.ipAddress || null,
    },
  });

  return { token, expiresAt };
}

export async function revokeStaffSession(rawToken: string): Promise<void> {
  const token = rawToken.trim();
  if (!token) return;
  const tokenHash = hashSecret(token);
  await prisma.staffSession.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getAuthUserFromRequest(request: NextRequest): Promise<PublicStaffUser | null> {
  const token = (request.cookies.get(AUTH_COOKIE_NAME)?.value || "").trim();
  if (!token) return null;

  const tokenHash = hashSecret(token);
  const session = await prisma.staffSession.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });

  if (!session || !session.user.isActive) return null;
  return toPublicUser(session.user);
}

export async function requireRole(request: NextRequest, allowedRoles: StaffRole[]): Promise<
  | { ok: true; user: PublicStaffUser }
  | { ok: false; message: string; status: number }
> {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return { ok: false, message: "Tidak terautentikasi.", status: 401 };
  }
  if (!allowedRoles.includes(user.role)) {
    return { ok: false, message: "Tidak memiliki akses.", status: 403 };
  }
  return { ok: true, user };
}

export async function writeAuditLog(input: {
  action: string;
  actorUserId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      action: input.action,
      actorUserId: input.actorUserId || null,
      targetType: input.targetType || null,
      targetId: input.targetId || null,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

export function mapInstansiForClient(instansi: StaffInstansi): "Diskominfo Makassar" | "UPT Warroom" {
  return instansi === "UPT_WARROOM" ? "UPT Warroom" : "Diskominfo Makassar";
}

export function mapInstansiFromClient(instansi: string): StaffInstansi {
  return instansi === "UPT Warroom" ? "UPT_WARROOM" : "DISKOMINFO_MAKASSAR";
}

export type { PublicStaffUser };
