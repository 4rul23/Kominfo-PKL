import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { normalizeAttendanceEventCode } from "@/lib/attendanceEventUtils";
import { prisma } from "@/lib/prisma";
import { requireRole, writeAuditLog } from "@/lib/server/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_OFFICE_LAT = -5.147665;
const DEFAULT_OFFICE_LON = 119.432732;
const DEFAULT_ALLOWED_RADIUS_M = 200;
const MAX_SELFIE_DATA_URL_LENGTH = 2_500_000;
const MAX_REQUEST_BYTES = 3_000_000;

function isValidShiftType(value: string): value is "checkin" | "checkout" {
  return value === "checkin" || value === "checkout";
}

function isAuthorizedMobileRequest(request: NextRequest): boolean {
  const expected = (process.env.INTERN_ATTENDANCE_API_KEY || "").trim();
  if (!expected) return true;
  const actual = (request.headers.get("x-intern-attendance-key") || "").trim();
  return actual.length > 0 && actual === expected;
}

type CheckInPayload = {
  internId?: string;
  internName?: string;
  eventCode?: string;
  shiftType?: string;
  capturedAt?: string;
  selfieDataUrl?: string;
  location?: {
    latitude?: number;
    longitude?: number;
    accuracyMeters?: number | null;
    isMocked?: boolean;
  };
  device?: {
    deviceId?: string | null;
    brand?: string | null;
    model?: string | null;
  };
};

function toNum(value: unknown): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return value;
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function buildRisk(input: {
  isMockedLocation: boolean;
  accuracyMeters: number | null;
  distanceFromOfficeM: number;
  hasDeviceId: boolean;
}): { riskScore: number; riskFlags: string[]; verdict: "accepted" | "flagged" | "rejected" } {
  let riskScore = 0;
  const riskFlags: string[] = [];

  if (input.isMockedLocation) {
    riskScore += 70;
    riskFlags.push("mocked_location");
  }

  if (input.accuracyMeters !== null && input.accuracyMeters > 80) {
    riskScore += 25;
    riskFlags.push("low_gps_accuracy");
  }

  if (input.distanceFromOfficeM > DEFAULT_ALLOWED_RADIUS_M) {
    riskScore += 80;
    riskFlags.push("outside_geofence");
  } else if (input.distanceFromOfficeM > DEFAULT_ALLOWED_RADIUS_M * 0.8) {
    riskScore += 20;
    riskFlags.push("near_geofence_border");
  }

  if (!input.hasDeviceId) {
    riskScore += 15;
    riskFlags.push("missing_device_id");
  }

  const verdict = riskScore >= 80 ? "rejected" : riskScore >= 30 ? "flagged" : "accepted";
  return { riskScore, riskFlags, verdict };
}

function getOfficeCoordinate(): { lat: number; lon: number } {
  const lat = Number(process.env.INTERN_ATTENDANCE_OFFICE_LAT || DEFAULT_OFFICE_LAT);
  const lon = Number(process.env.INTERN_ATTENDANCE_OFFICE_LON || DEFAULT_OFFICE_LON);
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return { lat: DEFAULT_OFFICE_LAT, lon: DEFAULT_OFFICE_LON };
  }
  return { lat, lon };
}

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get("content-length") || "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
      return NextResponse.json({ message: "Payload absensi terlalu besar." }, { status: 413 });
    }

    if (!isAuthorizedMobileRequest(request)) {
      return NextResponse.json({ message: "Akses aplikasi absensi tidak valid." }, { status: 401 });
    }

    const payload = (await request.json()) as CheckInPayload;
    const internId = (payload.internId || "").trim();
    const internName = (payload.internName || "").trim();
    const eventCode = normalizeAttendanceEventCode(payload.eventCode || "");
    const shiftType = (payload.shiftType || "checkin").trim().toLowerCase();
    const capturedAt = payload.capturedAt ? new Date(payload.capturedAt) : new Date();
    const selfieDataUrl = (payload.selfieDataUrl || "").trim();

    const latitude = toNum(payload.location?.latitude);
    const longitude = toNum(payload.location?.longitude);
    const accuracyMeters = toNum(payload.location?.accuracyMeters);
    const isMockedLocation = payload.location?.isMocked === true;

    const deviceId = (payload.device?.deviceId || "").trim() || null;
    const deviceBrand = (payload.device?.brand || "").trim() || null;
    const deviceModel = (payload.device?.model || "").trim() || null;

    if (!internId || !internName) {
      return NextResponse.json({ message: "Data intern wajib diisi." }, { status: 400 });
    }
    if (!eventCode) {
      return NextResponse.json({ message: "Event code wajib diisi." }, { status: 400 });
    }
    if (latitude === null || longitude === null) {
      return NextResponse.json({ message: "Lokasi GPS wajib tersedia." }, { status: 400 });
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json({ message: "Koordinat GPS tidak valid." }, { status: 400 });
    }
    if (!isValidShiftType(shiftType)) {
      return NextResponse.json({ message: "Jenis absensi tidak valid." }, { status: 400 });
    }
    if (!selfieDataUrl.startsWith("data:image/")) {
      return NextResponse.json({ message: "Selfie wajib dalam format gambar valid." }, { status: 400 });
    }
    if (selfieDataUrl.length > MAX_SELFIE_DATA_URL_LENGTH) {
      return NextResponse.json({ message: "Ukuran selfie terlalu besar." }, { status: 400 });
    }
    if (!selfieDataUrl.startsWith("data:image/jpeg;") && !selfieDataUrl.startsWith("data:image/png;")) {
      return NextResponse.json({ message: "Format selfie harus JPEG atau PNG." }, { status: 400 });
    }
    if (Number.isNaN(capturedAt.getTime())) {
      return NextResponse.json({ message: "Waktu absensi tidak valid." }, { status: 400 });
    }

    const nowMs = Date.now();
    if (capturedAt.getTime() > nowMs + 5 * 60 * 1000 || capturedAt.getTime() < nowMs - 24 * 60 * 60 * 1000) {
      return NextResponse.json({ message: "Timestamp absensi berada di luar rentang yang diizinkan." }, { status: 400 });
    }

    const event = await prisma.attendanceEvent.findUnique({ where: { code: eventCode }, select: { id: true, isActive: true } });
    if (!event) {
      return NextResponse.json({ message: "Event absensi tidak ditemukan." }, { status: 404 });
    }
    if (!event.isActive) {
      return NextResponse.json({ message: "Event absensi tidak aktif." }, { status: 409 });
    }

    const duplicateWindow = new Date(nowMs - 2 * 60 * 1000);
    const duplicate = await prisma.internAttendance.findFirst({
      where: {
        internId,
        eventCode,
        shiftType,
        capturedAt: { gte: duplicateWindow },
      },
      select: { id: true },
    });
    if (duplicate) {
      return NextResponse.json({ message: "Absensi duplikat terdeteksi. Tunggu beberapa menit sebelum mencoba lagi." }, { status: 409 });
    }

    const spamWindow = new Date(nowMs - 60 * 1000);
    const recentCount = await prisma.internAttendance.count({
      where: {
        internId,
        capturedAt: { gte: spamWindow },
      },
    });
    if (recentCount >= 5) {
      return NextResponse.json({ message: "Terlalu banyak percobaan absensi. Coba lagi sebentar." }, { status: 429 });
    }

    const office = getOfficeCoordinate();
    const distanceFromOfficeM = haversineMeters(latitude, longitude, office.lat, office.lon);
    const risk = buildRisk({
      isMockedLocation,
      accuracyMeters,
      distanceFromOfficeM,
      hasDeviceId: Boolean(deviceId),
    });

    const record = await prisma.internAttendance.create({
      data: {
        internId,
        internName,
        eventCode,
        shiftType,
        capturedAt,
        selfieDataUrl,
        latitude,
        longitude,
        accuracyMeters,
        distanceFromOfficeM,
        isMockedLocation,
        deviceId,
        deviceBrand,
        deviceModel,
        riskScore: risk.riskScore,
        verdict: risk.verdict,
        riskFlags: risk.riskFlags as Prisma.InputJsonValue,
      },
    });

    await writeAuditLog({
      action: "intern_attendance.submit",
      targetType: "intern_attendance",
      targetId: record.id,
      metadata: {
        internId,
        eventCode,
        verdict: risk.verdict,
        riskFlags: risk.riskFlags,
      },
    });

    return NextResponse.json({
      data: {
        id: record.id,
        verdict: record.verdict,
        riskScore: record.riskScore,
        riskFlags: risk.riskFlags,
        distanceFromOfficeM,
      },
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memproses absensi intern.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "receptionist", "operator"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const url = new URL(request.url);
  const eventCode = normalizeAttendanceEventCode(url.searchParams.get("eventCode") || "");
  const verdict = (url.searchParams.get("verdict") || "").trim();

  const rows = await prisma.internAttendance.findMany({
    where: {
      ...(eventCode ? { eventCode } : {}),
      ...(verdict === "accepted" || verdict === "flagged" || verdict === "rejected" ? { verdict } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return NextResponse.json({
    data: rows.map((row) => ({
      id: row.id,
      internId: row.internId,
      internName: row.internName,
      eventCode: row.eventCode,
      shiftType: row.shiftType,
      capturedAt: row.capturedAt.toISOString(),
      verdict: row.verdict,
      riskScore: row.riskScore,
      riskFlags: row.riskFlags,
      distanceFromOfficeM: row.distanceFromOfficeM,
      accuracyMeters: row.accuracyMeters,
      isMockedLocation: row.isMockedLocation,
    })),
  });
}
