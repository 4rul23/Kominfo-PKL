"use client";

import { ATTENDANCE_SOURCE } from "@/lib/meetingParticipants";

export interface AttendanceEntry {
    id: string;
    name: string;
    jabatan: string;
    instansi: string;
    participantId: string;
    participantLabel: string;
    source: typeof ATTENDANCE_SOURCE;
    createdAt: string; // ISO timestamp
}

const STORAGE_KEY = "diskominfo_attendance_temp_json";
export const ATTENDANCE_UPDATED_EVENT = "attendance-storage-updated";

function notifyAttendanceUpdated(): void {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent(ATTENDANCE_UPDATED_EVENT));
}

function normalizeText(value: unknown, fallback = "-"): string {
    if (typeof value !== "string") return fallback;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
}

function normalizeCreatedAt(value: unknown): string {
    if (typeof value !== "string") return new Date().toISOString();
    return value.trim().length > 0 ? value : new Date().toISOString();
}

function normalizeSource(value: unknown): typeof ATTENDANCE_SOURCE {
    return value === ATTENDANCE_SOURCE ? ATTENDANCE_SOURCE : ATTENDANCE_SOURCE;
}

function normalizeId(value: unknown): string {
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
    return crypto.randomUUID();
}

function normalizeEntry(value: unknown): AttendanceEntry | null {
    if (!value || typeof value !== "object") return null;

    const raw = value as Partial<AttendanceEntry>;
    const name = normalizeText(raw.name, "");
    if (!name) return null;

    const jabatan = normalizeText(raw.jabatan, normalizeText(raw.participantLabel, "-"));
    const participantLabel = normalizeText(raw.participantLabel, jabatan);

    return {
        id: normalizeId(raw.id),
        name,
        jabatan,
        instansi: normalizeText(raw.instansi, "-"),
        participantId: normalizeText(raw.participantId, "-"),
        participantLabel,
        source: normalizeSource(raw.source),
        createdAt: normalizeCreatedAt(raw.createdAt),
    };
}

export function getAttendanceEntries(): AttendanceEntry[] {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map((entry) => normalizeEntry(entry))
            .filter((entry): entry is AttendanceEntry => entry !== null)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch {
        return [];
    }
}

export function addAttendanceEntry(input: Omit<AttendanceEntry, "id" | "createdAt">): AttendanceEntry {
    const normalizedName = normalizeText(input.name, "");
    if (!normalizedName) {
        throw new Error("Nama peserta wajib diisi.");
    }

    const entry: AttendanceEntry = {
        id: crypto.randomUUID(),
        name: normalizedName,
        jabatan: normalizeText(input.jabatan, "-"),
        instansi: normalizeText(input.instansi, "-"),
        participantId: normalizeText(input.participantId, "-"),
        participantLabel: normalizeText(input.participantLabel, "-"),
        source: normalizeSource(input.source),
        createdAt: new Date().toISOString(),
    };

    const all = getAttendanceEntries();
    all.unshift(entry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    notifyAttendanceUpdated();
    return entry;
}

export function clearAttendanceEntries(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
    notifyAttendanceUpdated();
}

export function exportAttendanceAsJson(pretty = true): string {
    const all = getAttendanceEntries();
    return JSON.stringify(all, null, pretty ? 2 : 0);
}

export function getTodayAttendanceCount(): number {
    const today = new Date().toISOString().split("T")[0];
    return getAttendanceEntries().filter((x) => x.createdAt.startsWith(today)).length;
}
