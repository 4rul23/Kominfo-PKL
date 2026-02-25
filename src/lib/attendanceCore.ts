import {
    ATTENDANCE_SOURCE,
    LONTARA_EXPECTED_PARTICIPANTS,
    LONTARA_MEETING_PARTICIPANTS,
    getParticipantById,
    getParticipantRoleOptions,
} from "@/lib/meetingParticipants";

export interface AttendanceEntry {
    id: string;
    name: string;
    jabatan: string;
    instansi: string;
    phoneNumber: string;
    nip: string;
    participantId: string;
    participantLabel: string;
    participantRole: string;
    selfieDataUrl: string | null;
    source: typeof ATTENDANCE_SOURCE;
    createdAt: string; // ISO timestamp
}

const PARTICIPANT_LIMITS = new Map(
    LONTARA_MEETING_PARTICIPANTS.map((item) => [item.id, item.expectedCount] as const),
);

export interface AttendanceNameValidationResult {
    isValid: boolean;
    message: string;
    normalizedName: string;
}

export interface AttendanceFieldValidationResult {
    isValid: boolean;
    message: string;
    normalizedValue: string;
}

export interface ParticipantQuotaStatus {
    participantId: string;
    expectedCount: number;
    currentCount: number;
    remainingCount: number;
    isFull: boolean;
}

export function normalizeText(value: unknown, fallback = "-"): string {
    if (typeof value !== "string") return fallback;
    const trimmed = value.replace(/\s+/g, " ").trim();
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

function normalizeDigits(value: string): string {
    return value.replace(/\D+/g, "");
}

function normalizePhoneNumber(value: string): string {
    const digits = normalizeDigits(value);
    if (!digits) return "";
    if (digits.startsWith("62")) return digits;
    if (digits.startsWith("0")) return `62${digits.slice(1)}`;
    if (digits.startsWith("8")) return `62${digits}`;
    return digits;
}

function normalizeSelfieDataUrl(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (!trimmed.startsWith("data:image/")) return null;
    return trimmed;
}

function isValidDateYYYYMMDD(value: string): boolean {
    if (!/^\d{8}$/.test(value)) return false;
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(4, 6));
    const day = Number(value.slice(6, 8));
    if (year < 1940 || year > 2100) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;

    const date = new Date(Date.UTC(year, month - 1, day));
    return (
        date.getUTCFullYear() === year
        && date.getUTCMonth() === month - 1
        && date.getUTCDate() === day
    );
}

export function getTodayKey(): string {
    return new Date().toISOString().slice(0, 10);
}

function normalizeNameForCompare(name: string): string {
    return name
        .toLocaleLowerCase("id-ID")
        .replace(/[^a-zA-ZÀ-ÿ]/g, "")
        .trim();
}

export function validateAttendanceName(name: string): AttendanceNameValidationResult {
    const normalizedName = normalizeText(name, "");
    if (!normalizedName) {
        return {
            isValid: false,
            message: "Nama peserta wajib diisi.",
            normalizedName: "",
        };
    }

    if (normalizedName.length > 80) {
        return {
            isValid: false,
            message: "Nama terlalu panjang. Maksimal 80 karakter.",
            normalizedName,
        };
    }

    if (!/^[A-Za-zÀ-ÿ'`.\-\s]+$/.test(normalizedName)) {
        return {
            isValid: false,
            message: "Nama hanya boleh berisi huruf dan tanda baca umum.",
            normalizedName,
        };
    }

    const compact = normalizedName.replace(/[\s'`.\-]+/g, "");
    if (compact.length < 5) {
        return {
            isValid: false,
            message: "Nama minimal 5 huruf.",
            normalizedName,
        };
    }

    if (/(.)\1{4,}/i.test(compact)) {
        return {
            isValid: false,
            message: "Nama terdeteksi tidak valid. Hindari karakter berulang.",
            normalizedName,
        };
    }

    const lowercaseCompact = compact.toLocaleLowerCase("id-ID");
    const obviousDummyNames = new Set([
        "asd",
        "asdf",
        "asdalks",
        "qwe",
        "qwerty",
        "zxc",
        "abc",
        "test",
        "testing",
    ]);
    const looksLikeKeyboardMash = /^(asd|qwe|zxc)[a-z]*$/i.test(lowercaseCompact);
    if (obviousDummyNames.has(lowercaseCompact) || looksLikeKeyboardMash) {
        return {
            isValid: false,
            message: "Nama terlihat seperti teks acak. Gunakan nama asli peserta.",
            normalizedName,
        };
    }

    return {
        isValid: true,
        message: "",
        normalizedName,
    };
}

export function validateAttendancePhone(phoneNumber: string): AttendanceFieldValidationResult {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone) {
        return {
            isValid: false,
            message: "Nomor HP wajib diisi.",
            normalizedValue: "",
        };
    }

    if (!/^628\d{7,11}$/.test(normalizedPhone)) {
        return {
            isValid: false,
            message: "Format Nomor HP tidak valid. Gunakan nomor seluler Indonesia (08...).",
            normalizedValue: normalizedPhone,
        };
    }

    if (/^620+/.test(normalizedPhone)) {
        return {
            isValid: false,
            message: "Format Nomor HP tidak valid. Cek kembali angka awal nomor.",
            normalizedValue: normalizedPhone,
        };
    }

    return {
        isValid: true,
        message: "",
        normalizedValue: normalizedPhone,
    };
}

export function validateAttendanceNip(nip: string): AttendanceFieldValidationResult {
    const normalizedNip = normalizeDigits(nip);
    if (!normalizedNip) {
        return {
            isValid: false,
            message: "NIP wajib diisi.",
            normalizedValue: "",
        };
    }

    if (!/^\d{18}$/.test(normalizedNip)) {
        return {
            isValid: false,
            message: "Format NIP tidak valid. NIP harus 18 digit angka.",
            normalizedValue: normalizedNip,
        };
    }

    if (/^(\d)\1{17}$/.test(normalizedNip)) {
        return {
            isValid: false,
            message: "NIP tidak valid. Hindari angka berulang penuh.",
            normalizedValue: normalizedNip,
        };
    }

    const birthDateSegment = normalizedNip.slice(0, 8);
    if (!isValidDateYYYYMMDD(birthDateSegment)) {
        return {
            isValid: false,
            message: "NIP tidak valid. 8 digit awal harus format tanggal yang valid.",
            normalizedValue: normalizedNip,
        };
    }

    return {
        isValid: true,
        message: "",
        normalizedValue: normalizedNip,
    };
}

export function normalizeAttendanceEntry(value: unknown): AttendanceEntry | null {
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
        phoneNumber: normalizeText(raw.phoneNumber, "-"),
        nip: normalizeText(raw.nip, "-"),
        participantId: normalizeText(raw.participantId, "-"),
        participantLabel,
        participantRole: normalizeText(raw.participantRole, "-"),
        selfieDataUrl: normalizeSelfieDataUrl(raw.selfieDataUrl),
        source: normalizeSource(raw.source),
        createdAt: normalizeCreatedAt(raw.createdAt),
    };
}

export function sanitizeAttendanceEntries(values: unknown): AttendanceEntry[] {
    if (!Array.isArray(values)) return [];
    return values
        .map((entry) => normalizeAttendanceEntry(entry))
        .filter((entry): entry is AttendanceEntry => entry !== null)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createAttendanceEntry(
    input: Omit<AttendanceEntry, "id" | "createdAt">,
    existingEntries: AttendanceEntry[],
): AttendanceEntry {
    const nameValidation = validateAttendanceName(input.name);
    if (!nameValidation.isValid) {
        throw new Error(nameValidation.message);
    }

    const phoneValidation = validateAttendancePhone(input.phoneNumber);
    if (!phoneValidation.isValid) {
        throw new Error(phoneValidation.message);
    }

    const nipValidation = validateAttendanceNip(input.nip);
    if (!nipValidation.isValid) {
        throw new Error(nipValidation.message);
    }

    const source = normalizeSource(input.source);
    const participantId = normalizeText(input.participantId, "");
    if (!participantId) {
        throw new Error("Jabatan / unit peserta wajib dipilih.");
    }

    const participantLimit = PARTICIPANT_LIMITS.get(participantId);
    if (!participantLimit || participantLimit < 1) {
        throw new Error("Peserta tidak terdaftar dalam daftar undangan.");
    }

    const todayKey = getTodayKey();
    const sourceEntriesToday = existingEntries.filter(
        (entry) => entry.source === source && entry.createdAt.startsWith(todayKey),
    );

    if (sourceEntriesToday.length >= LONTARA_EXPECTED_PARTICIPANTS) {
        throw new Error(`Kuota total peserta hari ini sudah penuh (${LONTARA_EXPECTED_PARTICIPANTS} peserta).`);
    }

    const normalizedNip = nipValidation.normalizedValue;
    const isDuplicateNipToday = sourceEntriesToday.some(
        (entry) => normalizeDigits(entry.nip) === normalizedNip,
    );
    if (isDuplicateNipToday) {
        throw new Error("NIP ini sudah tercatat hari ini.");
    }

    const participantEntriesToday = sourceEntriesToday.filter(
        (entry) => entry.participantId === participantId,
    );
    if (participantEntriesToday.length >= participantLimit) {
        throw new Error(`Kuota untuk jabatan / unit ini sudah penuh (${participantLimit}/${participantLimit}).`);
    }

    const normalizedNameForCompare = normalizeNameForCompare(nameValidation.normalizedName);
    const isDuplicateNameInSameUnit = participantEntriesToday.some(
        (entry) => normalizeNameForCompare(entry.name) === normalizedNameForCompare,
    );
    if (isDuplicateNameInSameUnit) {
        throw new Error("Nama ini sudah tercatat pada jabatan / unit yang sama hari ini.");
    }

    const canonicalParticipant = getParticipantById(participantId);
    const roleOptions = getParticipantRoleOptions(canonicalParticipant);
    const submittedParticipantRole = normalizeText(input.participantRole, "");

    let participantRole = "-";
    if (roleOptions.length > 0) {
        if (!submittedParticipantRole || !roleOptions.includes(submittedParticipantRole)) {
            throw new Error("Untuk peserta SKPD, pilih jabatan spesifik (Kepala / Operator).");
        }

        participantRole = submittedParticipantRole;
        const sameRoleCount = participantEntriesToday.filter(
            (entry) => normalizeText(entry.participantRole, "-") === participantRole,
        ).length;

        if (sameRoleCount >= 1) {
            throw new Error(`Kuota untuk peran ${participantRole} sudah penuh.`);
        }
    } else if (submittedParticipantRole) {
        participantRole = submittedParticipantRole;
    }

    const participantLabel = canonicalParticipant?.label
        ?? normalizeText(input.participantLabel, "-");
    const selfieDataUrl = normalizeSelfieDataUrl(input.selfieDataUrl);

    return {
        id: crypto.randomUUID(),
        name: nameValidation.normalizedName,
        jabatan: participantLabel,
        instansi: normalizeText(input.instansi, participantLabel),
        phoneNumber: phoneValidation.normalizedValue,
        nip: nipValidation.normalizedValue,
        participantId,
        participantLabel,
        participantRole,
        selfieDataUrl,
        source,
        createdAt: new Date().toISOString(),
    };
}

export function getTodayAttendanceCountFromEntries(entries: AttendanceEntry[]): number {
    const today = getTodayKey();
    return entries.filter((entry) => entry.createdAt.startsWith(today)).length;
}

export function buildTodayParticipantQuotaMap(
    entries: AttendanceEntry[],
    source: typeof ATTENDANCE_SOURCE = ATTENDANCE_SOURCE,
): Record<string, ParticipantQuotaStatus> {
    const today = getTodayKey();
    const todayEntries = entries.filter(
        (entry) => entry.source === source && entry.createdAt.startsWith(today),
    );

    const counts = new Map<string, number>();
    for (const entry of todayEntries) {
        counts.set(entry.participantId, (counts.get(entry.participantId) ?? 0) + 1);
    }

    const quotaMap: Record<string, ParticipantQuotaStatus> = {};
    for (const participant of LONTARA_MEETING_PARTICIPANTS) {
        const currentCount = counts.get(participant.id) ?? 0;
        const remainingCount = Math.max(0, participant.expectedCount - currentCount);
        quotaMap[participant.id] = {
            participantId: participant.id,
            expectedCount: participant.expectedCount,
            currentCount,
            remainingCount,
            isFull: remainingCount === 0,
        };
    }

    return quotaMap;
}

export function buildTodayParticipantRoleCountMap(
    entries: AttendanceEntry[],
    source: typeof ATTENDANCE_SOURCE = ATTENDANCE_SOURCE,
): Record<string, Record<string, number>> {
    const today = getTodayKey();
    const todayEntries = entries.filter(
        (entry) => entry.source === source && entry.createdAt.startsWith(today),
    );

    const roleCountMap: Record<string, Record<string, number>> = {};
    for (const entry of todayEntries) {
        const participantId = normalizeText(entry.participantId, "-");
        const role = normalizeText(entry.participantRole, "-");
        if (!roleCountMap[participantId]) {
            roleCountMap[participantId] = {};
        }
        roleCountMap[participantId][role] = (roleCountMap[participantId][role] ?? 0) + 1;
    }

    return roleCountMap;
}
