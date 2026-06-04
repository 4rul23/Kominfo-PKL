"use client";

import {
    canTransitionSuratStatus,
    getSuratTransitionError,
    normalizeSuratStatus,
    type SuratStatus,
} from "@/lib/suratWorkflow";
import { createClientSafeId } from "@/lib/id";

// File attachment interface
export interface Attachment {
    id: string;
    filename: string;
    type: string;
    size: number;
    data?: string;
    fileUrl?: string;
    relativePath?: string;
    storedFilename?: string;
    uploadedAt: string;
}

// Status change history
export interface StatusChange {
    status: SuratStatus;
    timestamp: string;
    note?: string;
}

export interface ApprovalTrailEntry {
    id: string;
    fromStatus: SuratStatus;
    toStatus: SuratStatus;
    actorUserId: string;
    actorName: string;
    actorRole: "admin" | "receptionist" | "operator";
    note?: string;
    timestamp: string;
}

// Disposisi (letter assignment) interface
export interface Disposisi {
    assignedTo: string;       // Staff name/position
    instruksi: string[];      // Instructions array
    catatan: string;          // Additional notes
    tanggalDisposisi: string; // ISO date
    disposisiOleh: string;    // Disposed by (admin name)
}

// Priority levels
export type Prioritas = "tinggi" | "normal" | "rendah";

// Letter type codes per TNDE
export const KODE_SURAT: Record<string, string> = {
    "Permohonan": "SPm",
    "Undangan": "SU",
    "Laporan": "SLap",
    "Pengaduan": "SPg",
    "Informasi": "SPb",
    "Lainnya": "SE",
};

// Classification codes (000-900)
export const KLASIFIKASI_SURAT = [
    { code: "000", label: "Umum" },
    { code: "100", label: "Pemerintahan" },
    { code: "400", label: "Kesejahteraan Rakyat" },
    { code: "500", label: "Perekonomian" },
];

// Surat Elektronik data interface
export interface SuratElektronik {
    id: string;
    trackingId: string;        // Public tracking ID: TRK-YYYY-MM-XXXX
    nomorSurat: string;        // Official: 001/SE.SPm/DISKOMINFO/I/2026

    // Sender Info
    namaPengirim: string;
    emailPengirim: string;
    teleponPengirim: string;
    instansiPengirim: string;
    alamatPengirim: string;

    // Letter Details
    perihal: string;
    jenisSurat: string;
    kodeSurat: string;         // Letter type code (SPm, SU, etc.)
    klasifikasi: string;       // Classification code (000-900)
    tujuanUnit?: string;  // Optional - removed from wizard
    isiSurat: string;

    // Attachments
    lampiran: Attachment[];

    // Priority and SLA
    prioritas: Prioritas;
    slaDeadline: string;       // ISO date for SLA deadline

    // Disposisi
    disposisi?: Disposisi;
    responseNote?: string;     // Admin response note

    // Metadata
    status: SuratStatus;
    statusHistory: StatusChange[];
    approvalTrail?: ApprovalTrailEntry[];
    timestamp: string;
    date: string;
    lastUpdated: string;
}

function normalizeStatusOrDefault(value: unknown): SuratStatus {
    return normalizeSuratStatus(value) || "submitted";
}

function normalizeStatusHistory(history: unknown, fallbackStatus: SuratStatus): StatusChange[] {
    if (!Array.isArray(history)) {
        return [{ status: fallbackStatus, timestamp: new Date().toISOString(), note: "Status awal surat" }];
    }

    const mapped = history
        .map((entry) => {
            if (!entry || typeof entry !== "object") return null;
            const row = entry as Record<string, unknown>;
            const status = normalizeSuratStatus(row.status);
            if (!status) return null;
            return {
                status,
                timestamp: typeof row.timestamp === "string" && row.timestamp ? row.timestamp : new Date().toISOString(),
                note: typeof row.note === "string" ? row.note : undefined,
            } as StatusChange;
        })
        .filter((row): row is StatusChange => row !== null);

    if (mapped.length === 0) {
        return [{ status: fallbackStatus, timestamp: new Date().toISOString(), note: "Status awal surat" }];
    }
    return mapped;
}

function normalizeApprovalTrail(trail: unknown): ApprovalTrailEntry[] {
    if (!Array.isArray(trail)) return [];
    return trail
        .map((entry) => {
            if (!entry || typeof entry !== "object") return null;
            const row = entry as Record<string, unknown>;
            const fromStatus = normalizeSuratStatus(row.fromStatus);
            const toStatus = normalizeSuratStatus(row.toStatus);
            if (!fromStatus || !toStatus) return null;
            const actorRoleRaw = row.actorRole;
            const actorRole = actorRoleRaw === "admin" || actorRoleRaw === "receptionist" || actorRoleRaw === "operator" ? actorRoleRaw : null;
            if (!actorRole) return null;

            return {
                id: typeof row.id === "string" && row.id ? row.id : createClientSafeId("approval"),
                fromStatus,
                toStatus,
                actorUserId: typeof row.actorUserId === "string" ? row.actorUserId : "-",
                actorName: typeof row.actorName === "string" ? row.actorName : "-",
                actorRole,
                note: typeof row.note === "string" ? row.note : undefined,
                timestamp: typeof row.timestamp === "string" && row.timestamp ? row.timestamp : new Date().toISOString(),
            } as ApprovalTrailEntry;
        })
        .filter((row): row is ApprovalTrailEntry => row !== null);
}

function normalizeSuratRecord(record: SuratElektronik): SuratElektronik {
    const normalizedStatus = normalizeStatusOrDefault(record.status);
    return {
        ...record,
        status: normalizedStatus,
        statusHistory: normalizeStatusHistory(record.statusHistory, normalizedStatus),
        approvalTrail: normalizeApprovalTrail(record.approvalTrail),
    };
}

// ---------------------------------------------------------------------------
// Server communication helpers
// ---------------------------------------------------------------------------

async function transitionSuratStatusOnServer(input: { id: string; toStatus: SuratStatus; note?: string }): Promise<SuratElektronik> {
    const response = await fetch("/api/surat/transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
    });

    const data = (await response.json().catch(() => ({}))) as { surat?: SuratElektronik; message?: string };
    if (!response.ok || !data.surat) {
        throw new Error(data.message || "Gagal mengubah status surat.");
    }
    return normalizeSuratRecord(data.surat);
}

async function pushSuratToServer(surat: SuratElektronik): Promise<SuratElektronik> {
    const response = await fetch("/api/surat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surat }),
    });

    const data = (await response.json().catch(() => ({}))) as { surat?: SuratElektronik; message?: string };
    if (!response.ok || !data.surat) {
        throw new Error(data.message || "Gagal menyimpan surat ke backend.");
    }
    return normalizeSuratRecord(data.surat);
}

// ---------------------------------------------------------------------------
// Server-first data access (NO localStorage)
// ---------------------------------------------------------------------------

/** Fetch ALL surat from the server (PostgreSQL). */
export async function fetchSuratListFromServer(): Promise<SuratElektronik[]> {
    const response = await fetch("/api/surat", { cache: "no-store" });
    if (!response.ok) return [];
    const data = (await response.json().catch(() => ({}))) as { surat?: SuratElektronik[] };
    if (!Array.isArray(data.surat)) return [];
    return data.surat.map((item) => normalizeSuratRecord(item));
}

/** Fetch a single surat by its public tracking ID from the server. */
export async function getSuratByTrackingIdFromServer(trackingId: string): Promise<SuratElektronik | null> {
    const clean = trackingId.trim();
    if (!clean) return null;
    const response = await fetch(`/api/surat?trackingId=${encodeURIComponent(clean)}`, { cache: "no-store" });
    if (!response.ok) return null;
    const data = (await response.json().catch(() => ({}))) as { surat?: SuratElektronik | null };
    return data.surat ? normalizeSuratRecord(data.surat) : null;
}

/** Find a surat by ID from a pre-fetched list. */
export function getSuratByIdFromList(id: string, list: SuratElektronik[]): SuratElektronik | null {
    return list.find((s) => s.id === id) || null;
}

// Roman numerals for months
const ROMAN_MONTHS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

// Generate public tracking ID: TRK-YYYY-MM-XXXX
function generateTrackingId(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    const randomBlock = () => Math.random().toString(36).slice(2, 8).toUpperCase();
    // We no longer check localStorage for collisions; the server enforces uniqueness.
    return `TRK-${year}-${month}-${randomBlock()}`;
}

// Generate official Nomor Surat: 001/SE.SPm/DISKOMINFO/I/2026
// Counter is approximate (based on year); the server ensures true uniqueness.
function generateNomorSurat(kodeSurat: string, existingCount: number): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = ROMAN_MONTHS[now.getMonth()];
    const count = existingCount + 1;
    return `${String(count).padStart(3, "0")}/SE.${kodeSurat}/DISKOMINFO/${month}/${year}`;
}

// ---------------------------------------------------------------------------
// Mutations — all go through the server
// ---------------------------------------------------------------------------

// Input type for adding surat
type AddSuratInput = {
    namaPengirim: string;
    emailPengirim: string;
    teleponPengirim: string;
    instansiPengirim: string;
    alamatPengirim: string;
    perihal: string;
    jenisSurat: string;
    tujuanUnit?: string;  // Optional
    isiSurat: string;
    lampiran?: Attachment[];
    prioritas?: Prioritas;
};

/** Add a new surat — goes directly to the server. */
export async function addSurat(surat: AddSuratInput): Promise<SuratElektronik> {
    const now = new Date();
    const kodeSurat = KODE_SURAT[surat.jenisSurat] || "SE";

    const createDraftSurat = (): SuratElektronik => ({
        ...surat,
        id: createClientSafeId("surat"),
        trackingId: generateTrackingId(),
        nomorSurat: generateNomorSurat(kodeSurat, 0),
        kodeSurat,
        klasifikasi: "000",
        lampiran: surat.lampiran || [],
        prioritas: surat.prioritas || "normal",
        slaDeadline: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        status: "submitted",
        statusHistory: [{
            status: "submitted",
            timestamp: now.toISOString(),
            note: "Surat elektronik berhasil dikirim"
        }],
        timestamp: now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        date: now.toISOString().split("T")[0],
        lastUpdated: now.toISOString(),
    });

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
        const draft = createDraftSurat();
        try {
            const savedSurat = await pushSuratToServer(draft);
            return savedSurat;
        } catch (error) {
            const message = error instanceof Error ? error.message : "";
            if (/trackingId|Unique constraint failed/i.test(message)) {
                lastError = error instanceof Error ? error : new Error("Tracking ID bentrok, mencoba ulang.");
                continue;
            }
            throw error;
        }
    }

    throw lastError || new Error("Gagal menghasilkan tracking ID unik untuk surat.");
}

/** Update surat status — goes through the server transition endpoint. */
export async function updateSuratStatus(id: string, status: SuratElektronik["status"], note?: string): Promise<SuratElektronik> {
    const nextStatus = normalizeSuratStatus(status);
    if (!nextStatus) {
        throw new Error("Status surat tidak valid.");
    }

    // The server validates the transition; we simply call it.
    return await transitionSuratStatusOnServer({
        id,
        toStatus: nextStatus,
        note: note || getDefaultStatusNote(nextStatus),
    });
}

// Get default status notes
function getDefaultStatusNote(status: string): string {
    switch (status) {
        case "verified": return "Surat telah diverifikasi oleh resepsionis/admin";
        case "in_review": return "Surat sedang ditelaah operator";
        case "paraf": return "Surat sudah diparaf pejabat berwenang";
        case "approved": return "Surat telah disetujui";
        case "archived": return "Surat telah diarsipkan";
        default: return "";
    }
}

/** Assign disposisi — saves to server. */
export async function assignDisposisi(id: string, disposisi: Omit<Disposisi, "tanggalDisposisi">, suratList: SuratElektronik[]): Promise<SuratElektronik> {
    const existing = suratList.find((s) => s.id === id);
    if (!existing) throw new Error("Surat tidak ditemukan.");

    const now = new Date();
    const updated: SuratElektronik = {
        ...existing,
        disposisi: {
            ...disposisi,
            tanggalDisposisi: now.toISOString(),
        },
        lastUpdated: now.toISOString(),
        statusHistory: [
            ...existing.statusHistory,
            {
                status: existing.status,
                timestamp: now.toISOString(),
                note: `Didisposisikan ke ${disposisi.assignedTo}`,
            },
        ],
    };

    return await pushSuratToServer(updated);
}

/** Add admin response note — saves to server. */
export async function addResponseNote(id: string, note: string, suratList: SuratElektronik[]): Promise<SuratElektronik> {
    const existing = suratList.find((s) => s.id === id);
    if (!existing) throw new Error("Surat tidak ditemukan.");

    const now = new Date();
    const updated: SuratElektronik = {
        ...existing,
        responseNote: note,
        lastUpdated: now.toISOString(),
        statusHistory: [
            ...existing.statusHistory,
            {
                status: existing.status,
                timestamp: now.toISOString(),
                note: `Respon ditambahkan: ${note.substring(0, 50)}...`,
            },
        ],
    };

    return await pushSuratToServer(updated);
}

/** Update surat priority — saves to server. */
export async function updatePrioritas(id: string, prioritas: Prioritas, suratList: SuratElektronik[]): Promise<SuratElektronik> {
    const existing = suratList.find((s) => s.id === id);
    if (!existing) throw new Error("Surat tidak ditemukan.");

    const now = new Date();
    const slaDays = prioritas === "tinggi" ? 1 : prioritas === "normal" ? 3 : 5;
    const updated: SuratElektronik = {
        ...existing,
        prioritas,
        slaDeadline: new Date(now.getTime() + slaDays * 24 * 60 * 60 * 1000).toISOString(),
        lastUpdated: now.toISOString(),
    };

    return await pushSuratToServer(updated);
}

// ---------------------------------------------------------------------------
// Pure stats helpers — operate on a given list, no localStorage
// ---------------------------------------------------------------------------

/** Get statistics from a pre-fetched list. */
export function getSuratStats(suratList: SuratElektronik[]) {
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const todaySurat = suratList.filter((s) => s.date === today);
    const weekSurat = suratList.filter((s) => s.date >= weekAgo);

    const statusCounts = {
        submitted: suratList.filter(s => s.status === "submitted").length,
        verified: suratList.filter(s => s.status === "verified").length,
        in_review: suratList.filter(s => s.status === "in_review").length,
        paraf: suratList.filter(s => s.status === "paraf").length,
        approved: suratList.filter(s => s.status === "approved").length,
        archived: suratList.filter(s => s.status === "archived").length,
    };

    // Unit distribution
    const unitCounts: Record<string, number> = {};
    suratList.forEach((s) => {
        if (s.tujuanUnit) {
            unitCounts[s.tujuanUnit] = (unitCounts[s.tujuanUnit] || 0) + 1;
        }
    });

    return {
        today: todaySurat.length,
        week: weekSurat.length,
        total: suratList.length,
        statusCounts,
        unitCounts,
    };
}

/** Export to CSV from a given list. */
export function exportSuratToCSV(suratList: SuratElektronik[]): string {
    const headers = ["Tracking ID", "No. Surat", "Tanggal", "Waktu", "Nama Pengirim", "Email", "Telepon", "Instansi", "Alamat", "Perihal", "Jenis Surat", "Tujuan Unit", "Isi Surat", "Lampiran", "Status"];
    const rows = suratList.map((s) => [
        s.trackingId || "",
        s.nomorSurat,
        s.date,
        s.timestamp,
        s.namaPengirim,
        s.emailPengirim,
        s.teleponPengirim,
        s.instansiPengirim,
        s.alamatPengirim,
        s.perihal,
        s.jenisSurat,
        s.tujuanUnit,
        s.isiSurat,
        s.lampiran?.length || 0,
        s.status
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    return csvContent;
}

/** Get overdue surat from a given list. */
export function getOverdueSurat(suratList: SuratElektronik[]): SuratElektronik[] {
    const now = new Date().toISOString();
    return suratList.filter(s =>
        s.slaDeadline &&
        s.slaDeadline < now &&
        !["approved", "archived"].includes(s.status)
    );
}

/** Get unit distribution statistics from a given list. */
export function getUnitStats(suratList: SuratElektronik[]): { unit: string; count: number; percentage: number }[] {
    const unitCounts: Record<string, number> = {};

    suratList.forEach(s => {
        if (s.tujuanUnit) {
            unitCounts[s.tujuanUnit] = (unitCounts[s.tujuanUnit] || 0) + 1;
        }
    });

    const total = suratList.length || 1;
    return Object.entries(unitCounts)
        .map(([unit, count]) => ({
            unit,
            count,
            percentage: Math.round((count / total) * 100)
        }))
        .sort((a, b) => b.count - a.count);
}

/** Get hourly distribution for today from a given list. */
export function getHourlyStats(suratList: SuratElektronik[]): number[] {
    const today = new Date().toISOString().split("T")[0];
    const hourlyData = new Array(24).fill(0);

    suratList
        .filter(s => s.date === today)
        .forEach(s => {
            const hour = parseInt(s.timestamp.split(":")[0], 10);
            if (!isNaN(hour) && hour >= 0 && hour < 24) {
                hourlyData[hour]++;
            }
        });

    return hourlyData;
}

/** Delete a specific unit info/surat row */
export async function deleteSurat(id: string): Promise<void> {
    await fetch(`/api/surat?id=${encodeURIComponent(id)}`, { method: "DELETE" });
}

/** Clear all surat rows */
export async function clearSurat(): Promise<void> {
    await fetch("/api/surat", { method: "DELETE" });
}
