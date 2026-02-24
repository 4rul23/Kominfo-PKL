import { ATTENDANCE_SOURCE } from "@/lib/meetingParticipants";
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

export async function getAttendanceEntries(): Promise<AttendanceEntry[]> {
    const data = await fetchAttendance();
    return sanitizeAttendanceEntries(data.entries ?? []);
}

export async function getAttendanceSnapshot(
    source: typeof ATTENDANCE_SOURCE = ATTENDANCE_SOURCE,
): Promise<AttendanceSnapshot> {
    const entries = await getAttendanceEntries();
    return {
        entries,
        todayCount: getTodayAttendanceCountFromEntries(entries),
        quotaMap: buildTodayParticipantQuotaMap(entries, source),
        roleCountMap: buildTodayParticipantRoleCountMap(entries, source),
    };
}

export async function addAttendanceEntry(input: Omit<AttendanceEntry, "id" | "createdAt">): Promise<AttendanceEntry> {
    const data = await fetchAttendance("/api/attendance", {
        method: "POST",
        body: JSON.stringify(input),
    });

    if (!data.entry) {
        throw new Error("Data absensi tidak valid.");
    }

    notifyAttendanceUpdated();
    return data.entry;
}

export async function clearAttendanceEntries(): Promise<void> {
    await fetchAttendance("/api/attendance", { method: "DELETE" });
    notifyAttendanceUpdated();
}

export async function exportAttendanceAsJson(pretty = true): Promise<string> {
    const all = await getAttendanceEntries();
    return JSON.stringify(all, null, pretty ? 2 : 0);
}

export async function getTodayAttendanceCount(): Promise<number> {
    const snapshot = await getAttendanceSnapshot();
    return snapshot.todayCount;
}

export async function getTodayParticipantQuotaMap(
    source: typeof ATTENDANCE_SOURCE = ATTENDANCE_SOURCE,
): Promise<Record<string, ParticipantQuotaStatus>> {
    const snapshot = await getAttendanceSnapshot(source);
    return snapshot.quotaMap;
}

export async function getTodayParticipantRoleCountMap(
    source: typeof ATTENDANCE_SOURCE = ATTENDANCE_SOURCE,
): Promise<Record<string, Record<string, number>>> {
    const snapshot = await getAttendanceSnapshot(source);
    return snapshot.roleCountMap;
}

export const __attendanceStoreInternals = {
    createAttendanceEntry,
};
