import { ATTENDANCE_SOURCE } from "@/lib/meetingParticipants";
import { normalizeAttendanceEventCode } from "@/lib/attendanceEventUtils";
import {
    buildTodayParticipantQuotaMap,
    buildTodayParticipantRoleCountMap,
    createAttendanceEntry,
    getTodayAttendanceCountFromEntries,
    sanitizeAttendanceEntries,
    type AttendanceEntry,
    type AttendanceFieldValidationResult,
    type AttendanceNameValidationResult,
    type ParticipantQuotaStatus,
    validateAttendanceName,
    validateAttendanceNip,
    validateAttendancePhone,
} from "@/lib/attendanceCore";

export { type AttendanceEntry, type ParticipantQuotaStatus };
export { type AttendanceFieldValidationResult, type AttendanceNameValidationResult };
export { validateAttendanceName, validateAttendanceNip, validateAttendancePhone };

export const ATTENDANCE_UPDATED_EVENT = "attendance-storage-updated";

interface AttendanceApiResponse {
    entries?: AttendanceEntry[];
    entry?: AttendanceEntry;
    token?: string;
    expiresAt?: string;
    message?: string;
}

export interface AttendanceEvent {
    id: string;
    code: string;
    name: string;
    eventDate: string | null;
    isActive: boolean;
}

interface AttendanceEventsApiResponse {
    events?: AttendanceEvent[];
    activeEvent?: AttendanceEvent | null;
    event?: AttendanceEvent;
    token?: string;
    expiresAt?: string;
    eventCode?: string;
    registerPath?: string;
    dashboardPath?: string;
    message?: string;
}

export interface AttendanceSnapshot {
    entries: AttendanceEntry[];
    todayCount: number;
    quotaMap: Record<string, ParticipantQuotaStatus>;
    roleCountMap: Record<string, Record<string, number>>;
}

function notifyAttendanceUpdated(): void {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent(ATTENDANCE_UPDATED_EVENT));
}

async function fetchAttendance(path = "/api/attendance", init?: RequestInit): Promise<AttendanceApiResponse> {
    const response = await fetch(path, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...(init?.headers ?? {}),
        },
        cache: "no-store",
    });

    const data = (await response.json().catch(() => ({}))) as AttendanceApiResponse;
    if (!response.ok) {
        throw new Error(data.message || "Gagal memproses data absensi.");
    }
    return data;
}

async function fetchAttendanceEvents(path = "/api/events", init?: RequestInit): Promise<AttendanceEventsApiResponse> {
    const response = await fetch(path, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...(init?.headers ?? {}),
        },
        cache: "no-store",
    });

    const data = (await response.json().catch(() => ({}))) as AttendanceEventsApiResponse;
    if (!response.ok) {
        throw new Error(data.message || "Gagal memproses data event.");
    }
    return data;
}

export async function getAttendanceEntries(
    source: string = ATTENDANCE_SOURCE,
): Promise<AttendanceEntry[]> {
    const eventCode = normalizeAttendanceEventCode(source || ATTENDANCE_SOURCE);
    const data = await fetchAttendance(`/api/events/${encodeURIComponent(eventCode)}/attendance`);
    return sanitizeAttendanceEntries(data.entries ?? []);
}

export async function getAttendanceSnapshot(
    source: string = ATTENDANCE_SOURCE,
): Promise<AttendanceSnapshot> {
    const entries = await getAttendanceEntries(source);
    return {
        entries,
        todayCount: getTodayAttendanceCountFromEntries(entries),
        quotaMap: buildTodayParticipantQuotaMap(entries, source),
        roleCountMap: buildTodayParticipantRoleCountMap(entries, source),
    };
}

export async function addAttendanceEntry(input: Omit<AttendanceEntry, "id" | "createdAt">): Promise<AttendanceEntry> {
    const eventCode = normalizeAttendanceEventCode(input.source || ATTENDANCE_SOURCE);
    const data = await fetchAttendance(`/api/events/${encodeURIComponent(eventCode)}/attendance`, {
        method: "POST",
        body: JSON.stringify({ ...input, source: eventCode }),
    });

    if (!data.entry) {
        throw new Error("Data absensi tidak valid.");
    }

    notifyAttendanceUpdated();
    return data.entry;
}

export async function getAttendanceEvents(): Promise<AttendanceEvent[]> {
    const data = await fetchAttendanceEvents("/api/events");
    return Array.isArray(data.events) ? data.events : [];
}

export async function getActiveAttendanceEvent(): Promise<AttendanceEvent | null> {
    const data = await fetchAttendanceEvents("/api/events");
    return data.activeEvent ?? null;
}

export async function createAttendanceEvent(input: {
    code: string;
    name: string;
    eventDate?: string | null;
    isActive?: boolean;
}): Promise<AttendanceEvent> {
    const data = await fetchAttendanceEvents("/api/events", {
        method: "POST",
        body: JSON.stringify(input),
    });
    const event = data.event;
    if (!event) {
        throw new Error("Gagal membuat event.");
    }
    return event;
}

export async function updateAttendanceEvent(input: {
    id: string;
    code?: string;
    name?: string;
    eventDate?: string | null;
    isActive?: boolean;
}): Promise<AttendanceEvent> {
    const preferredCode = normalizeAttendanceEventCode(input.code || "");
    let eventCode = preferredCode;
    if (!eventCode && input.id) {
        const events = await getAttendanceEvents();
        const matched = events.find((item) => item.id === input.id);
        eventCode = normalizeAttendanceEventCode(matched?.code || "");
    }
    if (!eventCode) {
        throw new Error("Event code tidak ditemukan untuk update event.");
    }

    const data = await fetchAttendanceEvents(`/api/events/${encodeURIComponent(eventCode)}`, {
        method: "PATCH",
        body: JSON.stringify({
            name: input.name,
            eventDate: input.eventDate,
            isActive: input.isActive,
        }),
    });
    const event = data.event;
    if (!event) {
        throw new Error("Gagal memperbarui event.");
    }
    return event;
}

export async function createAttendanceEventRegisterLink(input: {
    code: string;
    expiresInHours?: number;
}): Promise<{
    token: string;
    expiresAt: string;
    eventCode: string;
    registerPath: string;
    dashboardPath: string;
}> {
    const eventCode = normalizeAttendanceEventCode(input.code);
    if (!eventCode) {
        throw new Error("Code event wajib diisi.");
    }

    const data = await fetchAttendanceEvents(`/api/events/${encodeURIComponent(eventCode)}/register-link`, {
        method: "POST",
        body: JSON.stringify({ expiresInHours: input.expiresInHours }),
    });

    if (!data.token || !data.expiresAt || !data.eventCode || !data.registerPath || !data.dashboardPath) {
        throw new Error("Respons token event tidak lengkap.");
    }

    return {
        token: data.token,
        expiresAt: data.expiresAt,
        eventCode: data.eventCode,
        registerPath: data.registerPath,
        dashboardPath: data.dashboardPath,
    };
}

export async function clearAttendanceEntries(input?: { reason?: string }): Promise<void> {
    const reason = (input?.reason || "Manual clear dari admin panel").trim();
    const intent = await fetchAttendance("/api/attendance/delete-intent", {
        method: "POST",
        body: JSON.stringify({ reason, confirmationText: "HAPUS" }),
    });

    if (!intent.token) {
        throw new Error("Gagal membuat token konfirmasi penghapusan.");
    }

    await fetchAttendance("/api/attendance", {
        method: "DELETE",
        headers: {
            "x-attendance-delete-intent": intent.token,
        },
    });
    notifyAttendanceUpdated();
}

export async function exportAttendanceAsJson(
    pretty = true,
    source: string = ATTENDANCE_SOURCE,
): Promise<string> {
    const all = await getAttendanceEntries(source);
    return JSON.stringify(all, null, pretty ? 2 : 0);
}

export async function getTodayAttendanceCount(source: string = ATTENDANCE_SOURCE): Promise<number> {
    const snapshot = await getAttendanceSnapshot(source);
    return snapshot.todayCount;
}

export async function getTodayParticipantQuotaMap(
    source: string = ATTENDANCE_SOURCE,
): Promise<Record<string, ParticipantQuotaStatus>> {
    const snapshot = await getAttendanceSnapshot(source);
    return snapshot.quotaMap;
}

export async function getTodayParticipantRoleCountMap(
    source: string = ATTENDANCE_SOURCE,
): Promise<Record<string, Record<string, number>>> {
    const snapshot = await getAttendanceSnapshot(source);
    return snapshot.roleCountMap;
}

export const __attendanceStoreInternals = {
    createAttendanceEntry,
};
