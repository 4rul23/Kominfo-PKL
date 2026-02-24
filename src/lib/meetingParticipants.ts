export interface MeetingParticipantOption {
    id: string;
    label: string;
    expectedCount: number;
}

export const ATTENDANCE_SOURCE = "lontara_2026_02_23" as const;

export const LONTARA_MEETING_PARTICIPANTS: MeetingParticipantOption[] = [
    { id: "P01", label: "Tim Ahli Pemerintah Kota Makassar (A. Gita Namira Patiana, M.MA, M.BA)", expectedCount: 1 },
    { id: "P02", label: "Tenaga Ahli Lontara+", expectedCount: 3 },
    { id: "P03", label: "Kepala Dinas Perhubungan Kota Makassar dan Operator Lontara+", expectedCount: 2 },
    { id: "P04", label: "Kepala Dinas Lingkungan Hidup Kota Makassar dan Operator Lontara+", expectedCount: 2 },
    { id: "P05", label: "Kepala Dinas Pekerjaan Umum Kota Makassar dan Operator Lontara+", expectedCount: 2 },
    { id: "P06", label: "Kepala Dinas Kesehatan Kota Makassar dan Operator Lontara+", expectedCount: 2 },
    { id: "P07", label: "Kepala Dinas Sosial Kota Makassar dan Operator Lontara+", expectedCount: 2 },
    { id: "P08", label: "Kepala Dinas Perumahan dan Permukiman Kota Makassar dan Operator Lontara+", expectedCount: 2 },
    { id: "P09", label: "Camat Mariso dan Operator Lontara+", expectedCount: 2 },
    { id: "P10", label: "Camat Mamajang dan Operator Lontara+", expectedCount: 2 },
    { id: "P11", label: "Camat Makassar dan Operator Lontara+", expectedCount: 2 },
    { id: "P12", label: "Camat Ujung Pandang dan Operator Lontara+", expectedCount: 2 },
    { id: "P13", label: "Camat Wajo dan Operator Lontara+", expectedCount: 2 },
    { id: "P14", label: "Camat Bontoala dan Operator Lontara+", expectedCount: 2 },
    { id: "P15", label: "Camat Tallo dan Operator Lontara+", expectedCount: 2 },
    { id: "P16", label: "Camat Ujung Tanah dan Operator Lontara+", expectedCount: 2 },
    { id: "P17", label: "Camat Panakkukang dan Operator Lontara+", expectedCount: 2 },
    { id: "P18", label: "Camat Tamalate dan Operator Lontara+", expectedCount: 2 },
    { id: "P19", label: "Camat Biringkanaya dan Operator Lontara+", expectedCount: 2 },
    { id: "P20", label: "Camat Manggala dan Operator Lontara+", expectedCount: 2 },
    { id: "P21", label: "Camat Rappocini dan Operator Lontara+", expectedCount: 2 },
    { id: "P22", label: "Camat Tamalanrea dan Operator Lontara+", expectedCount: 2 },
    { id: "P23", label: "Camat Sangkarrang dan Operator Lontara+", expectedCount: 2 },
    { id: "P24", label: "Kabid APTIKA Dinas Komunikasi dan Informatika Kota Makassar", expectedCount: 1 },
    { id: "P25", label: "Kepala UPT Warroom Dinas Komunikasi dan Informatika Kota Makassar", expectedCount: 1 },
    { id: "P26", label: "Kepala TU UPT Warroom Dinas Komunikasi dan Informatika Kota Makassar", expectedCount: 1 },
    { id: "P27", label: "Admin Lontara+ Dinas Komunikasi dan Informatika Kota Makassar", expectedCount: 12 },
];

export const LONTARA_EXPECTED_PARTICIPANTS = LONTARA_MEETING_PARTICIPANTS.reduce(
    (total, item) => total + item.expectedCount,
    0,
);
