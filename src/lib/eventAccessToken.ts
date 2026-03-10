import { createHmac, timingSafeEqual } from "node:crypto";

import { normalizeAttendanceEventCode } from "@/lib/attendanceEventUtils";

const TOKEN_VERSION = 1;
const TOKEN_PURPOSE = "attendance-register";
const DEFAULT_EXPIRES_IN_HOURS = 72;
const MAX_EXPIRES_IN_HOURS = 24 * 30;

type EventTokenPayload = {
    ver: number;
    purpose: string;
    eventCode: string;
    exp: number;
};

export type EventTokenVerifyResult =
    | { isValid: true; eventCode: string; expiresAt: string }
    | { isValid: false; reason: string };

function toBase64Url(value: string): string {
    return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string): string {
    return Buffer.from(value, "base64url").toString("utf8");
}

function getEventTokenSecret(): string {
    return (process.env.ATTENDANCE_EVENT_TOKEN_SECRET || "").trim();
}

function createSignature(payloadB64: string, secret: string): string {
    return createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

function parseToken(token: string): { payloadB64: string; signature: string } | null {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [payloadB64, signature] = parts;
    if (!payloadB64 || !signature) return null;
    return { payloadB64, signature };
}

export function hasEventTokenSecret(): boolean {
    return getEventTokenSecret().length > 0;
}

export function createEventAccessToken(input: {
    eventCode: string;
    expiresInHours?: number;
}): { token: string; expiresAt: string } {
    const secret = getEventTokenSecret();
    if (!secret) {
        throw new Error("ATTENDANCE_EVENT_TOKEN_SECRET belum diset.");
    }

    const eventCode = normalizeAttendanceEventCode(input.eventCode);
    if (!eventCode) {
        throw new Error("Code event tidak valid.");
    }

    const expiresInHours = Number.isFinite(input.expiresInHours)
        ? Math.min(MAX_EXPIRES_IN_HOURS, Math.max(1, Math.floor(input.expiresInHours || DEFAULT_EXPIRES_IN_HOURS)))
        : DEFAULT_EXPIRES_IN_HOURS;

    const expiresAtMs = Date.now() + expiresInHours * 60 * 60 * 1000;
    const payload: EventTokenPayload = {
        ver: TOKEN_VERSION,
        purpose: TOKEN_PURPOSE,
        eventCode,
        exp: expiresAtMs,
    };

    const payloadB64 = toBase64Url(JSON.stringify(payload));
    const signature = createSignature(payloadB64, secret);
    return {
        token: `${payloadB64}.${signature}`,
        expiresAt: new Date(expiresAtMs).toISOString(),
    };
}

export function verifyEventAccessToken(token: string, expectedEventCode: string): EventTokenVerifyResult {
    const secret = getEventTokenSecret();
    if (!secret) {
        return { isValid: false, reason: "Token secret belum dikonfigurasi." };
    }

    const normalizedExpectedEventCode = normalizeAttendanceEventCode(expectedEventCode);
    if (!normalizedExpectedEventCode) {
        return { isValid: false, reason: "Event code tidak valid." };
    }

    const parsed = parseToken(token);
    if (!parsed) {
        return { isValid: false, reason: "Format token tidak valid." };
    }

    const expectedSignature = createSignature(parsed.payloadB64, secret);
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const actualBuffer = Buffer.from(parsed.signature, "utf8");
    if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) {
        return { isValid: false, reason: "Signature token tidak valid." };
    }

    let payload: EventTokenPayload;
    try {
        payload = JSON.parse(fromBase64Url(parsed.payloadB64)) as EventTokenPayload;
    } catch {
        return { isValid: false, reason: "Payload token tidak valid." };
    }

    if (payload.ver !== TOKEN_VERSION || payload.purpose !== TOKEN_PURPOSE) {
        return { isValid: false, reason: "Token tidak sesuai tujuan akses register." };
    }

    if (normalizeAttendanceEventCode(payload.eventCode) !== normalizedExpectedEventCode) {
        return { isValid: false, reason: "Token tidak cocok dengan event ini." };
    }

    if (!Number.isFinite(payload.exp) || payload.exp < Date.now()) {
        return { isValid: false, reason: "Token sudah kedaluwarsa." };
    }

    return {
        isValid: true,
        eventCode: normalizedExpectedEventCode,
        expiresAt: new Date(payload.exp).toISOString(),
    };
}
