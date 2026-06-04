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

export const FGD_OPERATOR_ADUAN_PARTICIPANTS: MeetingParticipantOption[] = [
    { id: "F01", label: "Sekretariat Daerah", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F02", label: "Badan Kepegawaian dan Pengembangan Sumber Daya Manusia", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F03", label: "Badan Penanggulangan Bencana Daerah", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F04", label: "Badan Pendapatan Daerah", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F05", label: "Dinas Kearsipan", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F06", label: "Dinas Kependudukan dan Pencatatan Sipil", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F07", label: "Dinas Kesehatan", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F08", label: "Dinas Ketahanan Pangan", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F09", label: "Dinas Ketenagakerjaan", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F10", label: "Dinas Komunikasi dan Informatika", expectedCount: 6, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F11", label: "Dinas Koperasi dan UKM", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F12", label: "Dinas Lingkungan Hidup", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F13", label: "Dinas Pariwisata Kota Makassar", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F14", label: "Dinas Pekerjaan Umum", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F15", label: "Dinas Pemadam Kebakaran dan Penyelamatan", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F16", label: "Dinas Pemberdayaan Perempuan dan Perlindungan Anak", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F17", label: "Dinas Pemuda dan Olahraga", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F18", label: "Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F19", label: "Dinas Penataan Ruang", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F20", label: "Dinas Pendidikan", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F21", label: "Dinas Pengendalian Penduduk dan Keluarga Berencana", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F22", label: "Dinas Perdagangan dan Perindustrian", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F23", label: "Dinas Perikanan dan Pertanian", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F24", label: "Dinas Perhubungan", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F25", label: "Dinas Pertanahan", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F26", label: "Dinas Perumahan dan Kawasan Permukiman", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F27", label: "Dinas Sosial Kota Makassar", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F28", label: "Satuan Polisi Pamong Praja", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F29", label: "Kecamatan Biringkanaya", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F30", label: "Kecamatan Bontoala", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F31", label: "Kecamatan Kepulauan Sangkarrang", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F32", label: "Kecamatan Makassar", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F33", label: "Kecamatan Mamajang", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F34", label: "Kecamatan Manggala", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F35", label: "Kecamatan Mariso", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F36", label: "Kecamatan Panakkukang", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F37", label: "Kecamatan Rappocini", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F38", label: "Kecamatan Tallo", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F39", label: "Kecamatan Tamalanrea", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F40", label: "Kecamatan Tamalate", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F41", label: "Kecamatan Ujung Pandang", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F42", label: "Kecamatan Ujung Tanah", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F43", label: "Kecamatan Wajo", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F44", label: "Perumda Air Minum (PDAM)", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F45", label: "Perumda Parkir Makassar Raya", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F46", label: "Perumda Pasar Makassar Raya", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F47", label: "Perumda Terminal Makassar Metro", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
    { id: "F48", label: "Rumah Sakit Umum Daerah Daya Kota Makassar", expectedCount: 2, roleOptions: ["Operator Aduan Lontara+"] },
];

export const LONTARA_EXPECTED_PARTICIPANTS = LONTARA_MEETING_PARTICIPANTS.reduce(
    (total, item) => total + item.expectedCount,
    0,
);

export function getParticipantsForEvent(source: string): MeetingParticipantOption[] {
    const code = (source || "").toLowerCase().trim();
    if (code.includes("fgd_operator_aduan")) {
        return FGD_OPERATOR_ADUAN_PARTICIPANTS;
    }
    return LONTARA_MEETING_PARTICIPANTS;
}

export function getExpectedParticipantsCount(source: string): number {
    return getParticipantsForEvent(source).reduce((total, item) => total + item.expectedCount, 0);
}

export function getParticipantById(participantId: string, source: string = ATTENDANCE_SOURCE): MeetingParticipantOption | null {
    return getParticipantsForEvent(source).find((item) => item.id === participantId) ?? null;
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

