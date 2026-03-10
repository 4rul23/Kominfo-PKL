import { mkdir } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";

const prisma = new PrismaClient();

const ATTENDANCE_SOURCE = "lontara_2026_02_23";
const REPORT_TIME_ZONE = "Asia/Makassar";

const PALETTE = {
    navy: "172B4D",
    teal: "009FA9",
    red: "991B1B",
    slate: "5E6C84",
    line: "D5DEEA",
    headerBg: "EEF3F8",
    altRowBg: "F8FBFF",
    okBg: "E8F7EF",
    warnBg: "FDECEC",
};

const LONTARA_MEETING_PARTICIPANTS = [
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

const TOTAL_EXPECTED = LONTARA_MEETING_PARTICIPANTS.reduce(
    (sum, participant) => sum + participant.expectedCount,
    0,
);

function normalizeText(value, fallback = "-") {
    if (typeof value !== "string") return fallback;
    const trimmed = value.replace(/\s+/g, " ").trim();
    return trimmed.length > 0 ? trimmed : fallback;
}

function formatDateKeyInTimeZone(date = new Date(), timeZone = REPORT_TIME_ZONE) {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    return `${year}-${month}-${day}`;
}

function formatDateTime(iso) {
    return new Intl.DateTimeFormat("id-ID", {
        timeZone: REPORT_TIME_ZONE,
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    }).format(new Date(iso));
}

function formatTimeOnly(iso) {
    return new Intl.DateTimeFormat("id-ID", {
        timeZone: REPORT_TIME_ZONE,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(new Date(iso));
}

function parseDateKey(rawDateKey) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDateKey)) {
        throw new Error("Format --date harus YYYY-MM-DD.");
    }
    return rawDateKey;
}

function getMakassarUtcRange(dateKey) {
    const dayStart = new Date(`${dateKey}T00:00:00+08:00`);
    if (Number.isNaN(dayStart.getTime())) {
        throw new Error(`Tanggal tidak valid: ${dateKey}`);
    }
    const nextDay = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    return { dayStart, nextDay };
}

function getArgValue(flagName) {
    const prefix = `${flagName}=`;
    const direct = process.argv.find((arg) => arg.startsWith(prefix));
    if (direct) return direct.slice(prefix.length);

    const index = process.argv.indexOf(flagName);
    if (index >= 0 && process.argv[index + 1]) {
        return process.argv[index + 1];
    }
    return null;
}

function hasFlag(flagName) {
    return process.argv.includes(flagName);
}

function buildAttendanceAggregation(attendanceRows) {
    const byParticipant = new Map();
    for (const participant of LONTARA_MEETING_PARTICIPANTS) {
        byParticipant.set(participant.id, []);
    }

    for (const row of attendanceRows) {
        if (!byParticipant.has(row.participantId)) continue;
        byParticipant.get(row.participantId).push(row);
    }

    const recapRows = [];
    const absentRows = [];
    let fulfilledQuota = 0;

    for (const participant of LONTARA_MEETING_PARTICIPANTS) {
        const participantRows = byParticipant.get(participant.id) ?? [];
        const presentCount = Math.min(participant.expectedCount, participantRows.length);
        const remainingCount = Math.max(0, participant.expectedCount - presentCount);
        fulfilledQuota += presentCount;

        recapRows.push({
            unit: participant.label,
            target: participant.expectedCount,
            hadir: presentCount,
            belum: remainingCount,
            status: remainingCount === 0 ? "Lengkap" : "Belum Lengkap",
        });

        if (remainingCount === 0) continue;

        const roleOptions = Array.isArray(participant.roleOptions) ? participant.roleOptions : [];
        const submittedRoles = new Set(
            participantRows
                .map((row) => normalizeText(row.participantRole, ""))
                .filter((role) => role && role !== "-"),
        );

        let unresolved = remainingCount;
        if (roleOptions.length > 0) {
            for (const role of roleOptions) {
                if (unresolved <= 0) break;
                if (submittedRoles.has(role)) continue;
                absentRows.push({
                    unit: participant.label,
                    detail: role,
                    sisa: 1,
                });
                unresolved -= 1;
            }
        }

        for (let slot = 1; slot <= unresolved; slot += 1) {
            absentRows.push({
                unit: participant.label,
                detail: `Slot peserta ke-${slot}`,
                sisa: 1,
            });
        }
    }

    return {
        recapRows,
        absentRows,
        fulfilledQuota,
    };
}

function styleHeaderRow(sheet, rowNumber) {
    const row = sheet.getRow(rowNumber);
    row.height = 22;
    for (const cell of row.values.slice(1)) {
        if (cell === null || cell === undefined) continue;
    }

    row.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: `FF${PALETTE.navy}` }, size: 11 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${PALETTE.headerBg}` } };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        cell.border = {
            top: { style: "thin", color: { argb: `FF${PALETTE.line}` } },
            left: { style: "thin", color: { argb: `FF${PALETTE.line}` } },
            bottom: { style: "thin", color: { argb: `FF${PALETTE.line}` } },
            right: { style: "thin", color: { argb: `FF${PALETTE.line}` } },
        };
    });
}

function styleDataRow(sheet, rowNumber, centeredColumns = new Set()) {
    const row = sheet.getRow(rowNumber);
    row.height = 20;
    row.eachCell((cell, colNumber) => {
        cell.font = { size: 10.5, color: { argb: `FF${PALETTE.navy}` } };
        cell.alignment = {
            vertical: "middle",
            horizontal: centeredColumns.has(colNumber) ? "center" : "left",
            wrapText: true,
        };
        cell.border = {
            top: { style: "thin", color: { argb: `FF${PALETTE.line}` } },
            left: { style: "thin", color: { argb: `FF${PALETTE.line}` } },
            bottom: { style: "thin", color: { argb: `FF${PALETTE.line}` } },
            right: { style: "thin", color: { argb: `FF${PALETTE.line}` } },
        };
        if (rowNumber % 2 === 0) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${PALETTE.altRowBg}` } };
        }
    });
}

function addSheetTitle(sheet, title, subtitle) {
    sheet.mergeCells("A1:G1");
    sheet.getCell("A1").value = title;
    sheet.getCell("A1").font = { bold: true, size: 16, color: { argb: `FF${PALETTE.navy}` } };
    sheet.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };
    sheet.getRow(1).height = 24;

    sheet.mergeCells("A2:G2");
    sheet.getCell("A2").value = subtitle;
    sheet.getCell("A2").font = { size: 10, color: { argb: `FF${PALETTE.slate}` } };
    sheet.getCell("A2").alignment = { vertical: "middle", horizontal: "left" };
    sheet.getRow(2).height = 18;
}

async function main() {
    if (hasFlag("--help") || hasFlag("-h")) {
        process.stdout.write(
            [
                "Usage:",
                "  npm run report:attendance:xlsx -- [--date YYYY-MM-DD] [--all] [--source SOURCE] [--out ./reports/nama-file.xlsx]",
                "",
                "Options:",
                "  --date   Filter tanggal lokal Asia/Makassar (default: hari ini).",
                "  --all    Ambil semua tanggal untuk source tersebut.",
                "  --source Ganti source attendance (default: lontara_2026_02_23).",
                "  --out    Lokasi file output XLSX.",
            ].join("\n"),
        );
        return;
    }

    const source = getArgValue("--source") ?? ATTENDANCE_SOURCE;
    const useAllDates = hasFlag("--all");
    const explicitDate = getArgValue("--date");
    const dateKey = parseDateKey(explicitDate ?? formatDateKeyInTimeZone(new Date(), REPORT_TIME_ZONE));
    const { dayStart, nextDay } = getMakassarUtcRange(dateKey);

    const whereClause = useAllDates
        ? { source }
        : {
            source,
            createdAt: {
                gte: dayStart,
                lt: nextDay,
            },
        };

    const attendanceRows = await prisma.attendance.findMany({
        where: whereClause,
        orderBy: { createdAt: "asc" },
    });

    const { recapRows, absentRows, fulfilledQuota } = buildAttendanceAggregation(attendanceRows);
    const totalAbsent = Math.max(0, TOTAL_EXPECTED - fulfilledQuota);
    const attendancePercent = TOTAL_EXPECTED === 0 ? 0 : Number(((fulfilledQuota / TOTAL_EXPECTED) * 100).toFixed(1));
    const printAt = formatDateTime(new Date().toISOString());

    const presentRows = attendanceRows.map((row, index) => ({
        no: index + 1,
        nama: normalizeText(row.name),
        nip: normalizeText(row.nip),
        hp: normalizeText(row.phoneNumber),
        unit: normalizeText(row.participantLabel, row.jabatan),
        peran: row.participantRole && row.participantRole !== "-" ? row.participantRole : "-",
        jam: formatTimeOnly(row.createdAt.toISOString()),
    }));

    const reportsDir = path.join(process.cwd(), "reports");
    await mkdir(reportsDir, { recursive: true });

    const outArg = getArgValue("--out");
    const defaultOutputName = useAllDates
        ? `laporan-kehadiran-${source}-all.xlsx`
        : `laporan-kehadiran-${source}-${dateKey}.xlsx`;
    const outputPath = outArg ? path.resolve(process.cwd(), outArg) : path.join(reportsDir, defaultOutputName);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Diskominfo Kota Makassar";
    workbook.lastModifiedBy = "Diskominfo Kota Makassar";
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.title = "Laporan Kehadiran Rapat Lontara+";
    workbook.subject = "Pelaporan Kehadiran Peserta";

    const summary = workbook.addWorksheet("Ringkasan", {
        views: [{ state: "frozen", ySplit: 10 }],
    });
    summary.columns = [
        { key: "a", width: 4 },
        { key: "b", width: 44 },
        { key: "c", width: 14 },
        { key: "d", width: 14 },
        { key: "e", width: 14 },
        { key: "f", width: 18 },
        { key: "g", width: 4 },
    ];

    addSheetTitle(
        summary,
        "Laporan Kehadiran Rapat Koordinasi Lontara+",
        "Dinas Komunikasi dan Informatika Kota Makassar",
    );
    summary.getCell("A4").value = "Sumber";
    summary.getCell("B4").value = source;
    summary.getCell("A5").value = "Periode";
    summary.getCell("B5").value = useAllDates ? "Semua tanggal" : dateKey;
    summary.getCell("A6").value = "Waktu cetak";
    summary.getCell("B6").value = `${printAt} (${REPORT_TIME_ZONE})`;

    const labels = ["Total target", "Hadir", "Belum hadir", "Persentase"];
    const values = [TOTAL_EXPECTED, fulfilledQuota, totalAbsent, `${attendancePercent}%`];
    const colors = [PALETTE.navy, PALETTE.teal, PALETTE.red, PALETTE.navy];
    for (let i = 0; i < labels.length; i += 1) {
        const row = 4 + i;
        summary.getCell(`D${row}`).value = labels[i];
        summary.getCell(`E${row}`).value = values[i];
        summary.getCell(`D${row}`).font = { bold: true, size: 10.5, color: { argb: `FF${PALETTE.slate}` } };
        summary.getCell(`E${row}`).font = { bold: true, size: 11.5, color: { argb: `FF${colors[i]}` } };
    }

    const summaryHeaderRow = 10;
    summary.getRow(summaryHeaderRow).values = ["", "Unit", "Target", "Hadir", "Belum", "Status"];
    styleHeaderRow(summary, summaryHeaderRow);

    let rowCursor = summaryHeaderRow + 1;
    for (const recap of recapRows) {
        summary.getRow(rowCursor).values = [
            "",
            recap.unit,
            recap.target,
            recap.hadir,
            recap.belum,
            recap.status,
        ];
        styleDataRow(summary, rowCursor, new Set([3, 4, 5]));
        const statusCell = summary.getCell(`F${rowCursor}`);
        statusCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: `FF${recap.status === "Lengkap" ? PALETTE.okBg : PALETTE.warnBg}` },
        };
        rowCursor += 1;
    }

    const presentSheet = workbook.addWorksheet("Peserta Hadir", {
        views: [{ state: "frozen", ySplit: 3 }],
    });
    presentSheet.columns = [
        { key: "no", width: 6 },
        { key: "nama", width: 28 },
        { key: "nip", width: 20 },
        { key: "hp", width: 18 },
        { key: "unit", width: 46 },
        { key: "peran", width: 18 },
        { key: "jam", width: 12 },
    ];

    addSheetTitle(
        presentSheet,
        `Daftar Peserta Hadir (${presentRows.length} data)`,
        "Data kehadiran peserta yang telah tersimpan di sistem.",
    );

    presentSheet.getRow(3).values = ["No", "Nama", "NIP/NIK", "No HP", "Unit", "Peran", "Jam Hadir"];
    styleHeaderRow(presentSheet, 3);
    presentSheet.autoFilter = "A3:G3";

    if (presentRows.length === 0) {
        presentSheet.mergeCells("A4:G4");
        presentSheet.getCell("A4").value = "Belum ada peserta hadir pada periode ini.";
        presentSheet.getCell("A4").alignment = { horizontal: "center", vertical: "middle" };
        presentSheet.getCell("A4").font = { italic: true, color: { argb: `FF${PALETTE.slate}` } };
    } else {
        let presentRowCursor = 4;
        for (const row of presentRows) {
            presentSheet.getRow(presentRowCursor).values = [
                row.no,
                row.nama,
                row.nip,
                row.hp,
                row.unit,
                row.peran,
                row.jam,
            ];
            styleDataRow(presentSheet, presentRowCursor, new Set([1, 7]));
            presentRowCursor += 1;
        }
    }

    const absentSheet = workbook.addWorksheet("Belum Hadir", {
        views: [{ state: "frozen", ySplit: 3 }],
    });
    absentSheet.columns = [
        { key: "no", width: 6 },
        { key: "unit", width: 48 },
        { key: "detail", width: 30 },
        { key: "sisa", width: 10 },
    ];

    addSheetTitle(
        absentSheet,
        `Daftar Belum Hadir (${absentRows.length} slot)`,
        "Slot undangan yang belum terisi berdasarkan target peserta.",
    );

    absentSheet.getRow(3).values = ["No", "Unit", "Detail Yang Belum Hadir", "Sisa"];
    styleHeaderRow(absentSheet, 3);
    absentSheet.autoFilter = "A3:D3";

    if (absentRows.length === 0) {
        absentSheet.mergeCells("A4:D4");
        absentSheet.getCell("A4").value = "Semua peserta sudah hadir.";
        absentSheet.getCell("A4").alignment = { horizontal: "center", vertical: "middle" };
        absentSheet.getCell("A4").font = { italic: true, color: { argb: `FF${PALETTE.teal}` } };
    } else {
        let absentRowCursor = 4;
        for (let index = 0; index < absentRows.length; index += 1) {
            const row = absentRows[index];
            absentSheet.getRow(absentRowCursor).values = [index + 1, row.unit, row.detail, row.sisa];
            styleDataRow(absentSheet, absentRowCursor, new Set([1, 4]));
            absentRowCursor += 1;
        }
    }

    await workbook.xlsx.writeFile(outputPath);
    process.stdout.write(
        `Excel berhasil dibuat:\n- File: ${outputPath}\n- Total hadir (data): ${presentRows.length}\n- Total belum hadir: ${totalAbsent}\n`,
    );
}

main()
    .catch((error) => {
        process.stderr.write(`Gagal membuat laporan Excel: ${error instanceof Error ? error.message : String(error)}\n`);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
