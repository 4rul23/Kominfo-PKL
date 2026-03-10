import { ATTENDANCE_SOURCE } from "@/lib/meetingParticipants";

export const DEFAULT_ATTENDANCE_EVENT_NAME = "Rapat Koordinasi Lontara+";
export const DEFAULT_ATTENDANCE_EVENT_DATE_ISO = "2026-02-23T00:00:00.000Z";

export function normalizeAttendanceEventCode(value: unknown): string {
    if (typeof value !== "string") return "";
    return value.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "_");
}

export function normalizeSearchParamValue(value: string | string[] | undefined): string {
    if (Array.isArray(value)) return (value[0] || "").trim();
    return (value || "").trim();
}

export function normalizeSearchParamEventCode(value: string | string[] | undefined): string {
    return normalizeAttendanceEventCode(normalizeSearchParamValue(value));
}

export function fallbackDefaultAttendanceEvent() {
    return {
        id: "fallback",
        code: ATTENDANCE_SOURCE,
        name: DEFAULT_ATTENDANCE_EVENT_NAME,
        eventDate: DEFAULT_ATTENDANCE_EVENT_DATE_ISO,
        isActive: true,
    };
}
