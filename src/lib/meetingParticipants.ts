export interface MeetingParticipantOption {
    id: string;
    label: string;
    expectedCount: number;
    roleOptions?: string[];
}

const DUAL_ROLE_PATTERN = /\s+dan\s+Operator Lontara\+$/i;

export const ATTENDANCE_SOURCE = "lontara_2026_02_23" as const;

export const LONTARA_MEETING_PARTICIPANTS: MeetingParticipantOption[] = [
    { id: "P01", label: "Tim Ahli Pemerintah Kota Makassar (A. Gita Namira Patiana, M.MA, M.BA)", expectedCount: 1 },
    { id: "P02", label: "Tenaga Ahli Lontara+", expectedCount: 3 },
    { id: "P03", label: "Dinas Perhubungan Kota Makassar", expectedCount: 2, roleOptions: ["Kepala Dinas", "Operator Lontara+"] },
    { id: "P04", label: "Dinas Lingkungan Hidup Kota Makassar", expectedCount: 2, roleOptions: ["Kepala Dinas", "Operator Lontara+"] },
    { id: "P05", label: "Dinas Pekerjaan Umum Kota Makassar", expectedCount: 2, roleOptions: ["Kepala Dinas", "Operator Lontara+"] },
    { id: "P06", label: "Dinas Kesehatan Kota Makassar", expectedCount: 2, roleOptions: ["Kepala Dinas", "Operator Lontara+"] },
    { id: "P07", label: "Dinas Sosial Kota Makassar", expectedCount: 2, roleOptions: ["Kepala Dinas", "Operator Lontara+"] },
    { id: "P08", label: "Dinas Perumahan dan Permukiman Kota Makassar", expectedCount: 2, roleOptions: ["Kepala Dinas", "Operator Lontara+"] },
    { id: "P09", label: "Kecamatan Mariso", expectedCount: 2, roleOptions: ["Camat", "Operator Lontara+"] },
    { id: "P10", label: "Kecamatan Mamajang", expectedCount: 2, roleOptions: ["Camat", "Operator Lontara+"] },
    { id: "P11", label: "Kecamatan Makassar", expectedCount: 2, roleOptions: ["Camat", "Operator Lontara+"] },
    { id: "P12", label: "Kecamatan Ujung Pandang", expectedCount: 2, roleOptions: ["Camat", "Operator Lontara+"] },
    { id: "P13", label: "Kecamatan Wajo", expectedCount: 2, roleOptions: ["Camat", "Operator Lontara+"] },
    { id: "P14", label: "Kecamatan Bontoala", expectedCount: 2, roleOptions: ["Camat", "Operator Lontara+"] },
    { id: "P15", label: "Kecamatan Tallo", expectedCount: 2, roleOptions: ["Camat", "Operator Lontara+"] },
    { id: "P16", label: "Kecamatan Ujung Tanah", expectedCount: 2, roleOptions: ["Camat", "Operator Lontara+"] },
    { id: "P17", label: "Kecamatan Panakkukang", expectedCount: 2, roleOptions: ["Camat", "Operator Lontara+"] },
    { id: "P18", label: "Kecamatan Tamalate", expectedCount: 2, roleOptions: ["Camat", "Operator Lontara+"] },
    { id: "P19", label: "Kecamatan Biringkanaya", expectedCount: 2, roleOptions: ["Camat", "Operator Lontara+"] },
    { id: "P20", label: "Kecamatan Manggala", expectedCount: 2, roleOptions: ["Camat", "Operator Lontara+"] },
    { id: "P21", label: "Kecamatan Rappocini", expectedCount: 2, roleOptions: ["Camat", "Operator Lontara+"] },
    { id: "P22", label: "Kecamatan Tamalanrea", expectedCount: 2, roleOptions: ["Camat", "Operator Lontara+"] },
    { id: "P23", label: "Kecamatan Sangkarrang", expectedCount: 2, roleOptions: ["Camat", "Operator Lontara+"] },
    { id: "P24", label: "Kabid APTIKA Dinas Komunikasi dan Informatika Kota Makassar", expectedCount: 1 },
    { id: "P25", label: "Kepala UPT Warroom Dinas Komunikasi dan Informatika Kota Makassar", expectedCount: 1 },
    { id: "P26", label: "Kepala TU UPT Warroom Dinas Komunikasi dan Informatika Kota Makassar", expectedCount: 1 },
    { id: "P27", label: "Admin Lontara+ Dinas Komunikasi dan Informatika Kota Makassar", expectedCount: 12 },
];

export const LONTARA_EXPECTED_PARTICIPANTS = LONTARA_MEETING_PARTICIPANTS.reduce(
    (total, item) => total + item.expectedCount,
    0,
);

export function getParticipantById(participantId: string): MeetingParticipantOption | null {
    return LONTARA_MEETING_PARTICIPANTS.find((item) => item.id === participantId) ?? null;
}

export function getParticipantRoleOptions(
    participant: MeetingParticipantOption | null,
): string[] {
    if (!participant) return [];
    if (participant.roleOptions && participant.roleOptions.length > 0) {
        return Array.from(new Set(participant.roleOptions));
    }
    if (!DUAL_ROLE_PATTERN.test(participant.label)) return [];

    const leadRole = participant.label.replace(DUAL_ROLE_PATTERN, "").trim();
    const roles = [leadRole, "Operator Lontara+"].filter((role) => role.length > 0);
    return Array.from(new Set(roles));
}
