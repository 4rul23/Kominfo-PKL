import { createWriteStream } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const require = createRequire(import.meta.url);
const PDFDocument = require("pdfkit");
const SVGtoPDF = require("svg-to-pdfkit");

const prisma = new PrismaClient();

const ATTENDANCE_SOURCE = "lontara_2026_02_23";
const REPORT_TIME_ZONE = "Asia/Makassar";
const LOGO_PATH = path.join(process.cwd(), "public", "kominfos.svg");

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

function ensureSpace(doc, heightNeeded, onPageBreak) {
    const pageBottom = doc.page.height - doc.page.margins.bottom;
    if (doc.y + heightNeeded <= pageBottom) return;
    doc.addPage();
    if (typeof onPageBreak === "function") {
        onPageBreak();
    }
}

function drawSectionTitle(doc, title, subtitle = "") {
    ensureSpace(doc, 46);
    doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor("#172B4D")
        .text(title, doc.page.margins.left, doc.y, { align: "left" });

    if (subtitle) {
        doc
            .moveDown(0.2)
            .font("Helvetica")
            .fontSize(9)
            .fillColor("#5E6C84")
            .text(subtitle);
    }
    doc.moveDown(0.5);
}

function drawTable(doc, config) {
    const { title, subtitle, columns, rows, emptyText = "Tidak ada data." } = config;
    drawSectionTitle(doc, title, subtitle);

    if (!rows.length) {
        doc
            .font("Helvetica")
            .fontSize(10)
            .fillColor("#6B778C")
            .text(emptyText);
        doc.moveDown(1);
        return;
    }

    const leftX = doc.page.margins.left;
    const tableWidth = columns.reduce((sum, column) => sum + column.width, 0);
    const headerHeight = 20;
    const paddingX = 4;
    const paddingY = 4;

    const drawHeader = () => {
        ensureSpace(doc, headerHeight + 4);
        const y = doc.y;
        doc
            .save()
            .rect(leftX, y, tableWidth, headerHeight)
            .fill("#EFF2F7")
            .restore();

        let cursorX = leftX;
        for (const column of columns) {
            doc
                .font("Helvetica-Bold")
                .fontSize(8.5)
                .fillColor("#334155")
                .text(column.label, cursorX + paddingX, y + 6, {
                    width: column.width - paddingX * 2,
                    align: column.align ?? "left",
                    ellipsis: true,
                });
            cursorX += column.width;
        }
        doc.y = y + headerHeight;
    };

    drawHeader();

    for (const row of rows) {
        const textHeights = columns.map((column) =>
            doc.heightOfString(String(row[column.key] ?? "-"), {
                width: column.width - paddingX * 2,
                align: column.align ?? "left",
            }),
        );
        const rowHeight = Math.max(18, Math.max(...textHeights) + paddingY * 2);

        ensureSpace(doc, rowHeight + 1, drawHeader);

        const y = doc.y;
        doc
            .save()
            .lineWidth(0.6)
            .strokeColor("#E2E8F0")
            .rect(leftX, y, tableWidth, rowHeight)
            .stroke()
            .restore();

        let cursorX = leftX;
        for (let i = 0; i < columns.length; i += 1) {
            const column = columns[i];
            doc
                .font("Helvetica")
                .fontSize(8.4)
                .fillColor("#1F2937")
                .text(String(row[column.key] ?? "-"), cursorX + paddingX, y + paddingY, {
                    width: column.width - paddingX * 2,
                    align: column.align ?? "left",
                });

            cursorX += column.width;

            if (i < columns.length - 1) {
                doc
                    .save()
                    .lineWidth(0.6)
                    .strokeColor("#E2E8F0")
                    .moveTo(cursorX, y)
                    .lineTo(cursorX, y + rowHeight)
                    .stroke()
                    .restore();
            }
        }

        doc.y = y + rowHeight;
    }

    doc.moveDown(1);
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
            target: String(participant.expectedCount),
            hadir: String(presentCount),
            belum: String(remainingCount),
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
                    sisa: "1",
                });
                unresolved -= 1;
            }
        }

        for (let slot = 1; slot <= unresolved; slot += 1) {
            absentRows.push({
                unit: participant.label,
                detail: `Slot peserta ke-${slot}`,
                sisa: "1",
            });
        }
    }

    return {
        recapRows,
        absentRows,
        fulfilledQuota,
    };
}

async function main() {
    if (hasFlag("--help") || hasFlag("-h")) {
        process.stdout.write(
            [
                "Usage:",
                "  npm run report:attendance:pdf -- [--date YYYY-MM-DD] [--all] [--source SOURCE] [--out ./reports/nama-file.pdf]",
                "",
                "Options:",
                "  --date   Filter tanggal lokal Asia/Makassar (default: hari ini).",
                "  --all    Ambil semua tanggal untuk source tersebut.",
                "  --source Ganti source attendance (default: lontara_2026_02_23).",
                "  --out    Lokasi file output PDF.",
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
        orderBy: {
            createdAt: "asc",
        },
    });

    const { recapRows, absentRows, fulfilledQuota } = buildAttendanceAggregation(attendanceRows);
    const totalAbsent = Math.max(0, TOTAL_EXPECTED - fulfilledQuota);
    const attendancePercent = TOTAL_EXPECTED === 0
        ? 0
        : Math.min(100, Number(((fulfilledQuota / TOTAL_EXPECTED) * 100).toFixed(1)));

    const presentRows = attendanceRows.map((row, index) => ({
        no: String(index + 1),
        nama: normalizeText(row.name),
        nip: normalizeText(row.nip),
        hp: normalizeText(row.phoneNumber),
        unit: `${normalizeText(row.participantLabel, row.jabatan)}${row.participantRole && row.participantRole !== "-" ? ` (${row.participantRole})` : ""}`,
        jam: formatTimeOnly(row.createdAt.toISOString()),
    }));

    const absentTableRows = absentRows.map((row, index) => ({
        no: String(index + 1),
        unit: row.unit,
        detail: row.detail,
        sisa: row.sisa,
    }));

    const reportsDir = path.join(process.cwd(), "reports");
    await mkdir(reportsDir, { recursive: true });

    const outArg = getArgValue("--out");
    const defaultOutputName = useAllDates
        ? `laporan-kehadiran-${source}-all.pdf`
        : `laporan-kehadiran-${source}-${dateKey}.pdf`;
    const outputPath = outArg
        ? path.resolve(process.cwd(), outArg)
        : path.join(reportsDir, defaultOutputName);

    const logoSvg = await readFile(LOGO_PATH, "utf8").catch(() => "");
    const outputStream = createWriteStream(outputPath);

    const doc = new PDFDocument({
        size: "A4",
        margin: 40,
        info: {
            Title: "Laporan Kehadiran Rapat Lontara+",
            Author: "Diskominfo Kota Makassar",
            Subject: "Pelaporan Kehadiran Peserta",
            CreationDate: new Date(),
        },
    });

    doc.pipe(outputStream);

    const headerX = doc.page.margins.left;
    const headerY = doc.page.margins.top;

    if (logoSvg) {
        try {
            SVGtoPDF(doc, logoSvg, headerX, headerY, {
                width: 36,
                height: 36,
                preserveAspectRatio: "xMinYMin meet",
            });
        } catch {
            // Ignore logo render failure and continue generating the report.
        }
    }

    const titleX = headerX + 48;
    doc
        .font("Helvetica-Bold")
        .fontSize(15)
        .fillColor("#172B4D")
        .text("Laporan Kehadiran Rapat Koordinasi Lontara+", titleX, headerY + 2);
    doc
        .font("Helvetica")
        .fontSize(9.5)
        .fillColor("#5E6C84")
        .text("Dinas Komunikasi dan Informatika Kota Makassar", titleX, headerY + 22);

    doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#334155")
        .text(`Sumber: ${source}`, doc.page.margins.left, headerY + 48)
        .text(`Periode data: ${useAllDates ? "Semua tanggal" : dateKey}`, doc.page.margins.left, headerY + 62)
        .text(`Waktu cetak: ${formatDateTime(new Date().toISOString())} (${REPORT_TIME_ZONE})`, doc.page.margins.left, headerY + 76);

    doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor("#172B4D")
        .text(`Total target: ${TOTAL_EXPECTED} peserta`, 340, headerY + 48, { align: "right", width: 215 })
        .text(`Hadir (terpenuhi): ${fulfilledQuota} peserta`, 340, headerY + 62, { align: "right", width: 215 })
        .text(`Belum hadir: ${totalAbsent} peserta`, 340, headerY + 76, { align: "right", width: 215 })
        .text(`Persentase kehadiran: ${attendancePercent}%`, 340, headerY + 90, { align: "right", width: 215 });

    doc
        .moveTo(doc.page.margins.left, headerY + 112)
        .lineTo(doc.page.width - doc.page.margins.right, headerY + 112)
        .lineWidth(1)
        .strokeColor("#E2E8F0")
        .stroke();

    doc.y = headerY + 124;

    drawTable(doc, {
        title: `1) Daftar Peserta Hadir (${presentRows.length} data)`,
        subtitle: "Data berisi peserta yang sudah berhasil terekam ke database.",
        columns: [
            { key: "no", label: "No", width: 24, align: "center" },
            { key: "nama", label: "Nama", width: 110 },
            { key: "nip", label: "NIP/NIK", width: 82 },
            { key: "hp", label: "No HP", width: 82 },
            { key: "unit", label: "Unit / Peran", width: 162 },
            { key: "jam", label: "Jam", width: 55, align: "center" },
        ],
        rows: presentRows,
        emptyText: "Belum ada peserta hadir pada periode laporan ini.",
    });

    drawTable(doc, {
        title: "2) Rekap Kehadiran per Unit",
        subtitle: "Perbandingan target undangan vs peserta yang sudah hadir.",
        columns: [
            { key: "unit", label: "Unit", width: 320 },
            { key: "target", label: "Target", width: 48, align: "center" },
            { key: "hadir", label: "Hadir", width: 48, align: "center" },
            { key: "belum", label: "Belum", width: 48, align: "center" },
            { key: "status", label: "Status", width: 51, align: "center" },
        ],
        rows: recapRows,
    });

    drawTable(doc, {
        title: `3) Daftar Belum Hadir (${absentTableRows.length} slot)`,
        subtitle: "Daftar ini menunjukkan slot undangan yang belum terisi.",
        columns: [
            { key: "no", label: "No", width: 24, align: "center" },
            { key: "unit", label: "Unit", width: 250 },
            { key: "detail", label: "Detail Yang Belum Hadir", width: 191 },
            { key: "sisa", label: "Sisa", width: 50, align: "center" },
        ],
        rows: absentTableRows,
        emptyText: "Semua peserta sudah hadir. Tidak ada slot tersisa.",
    });

    doc
        .moveDown(0.5)
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor("#6B7280")
        .text("Dokumen ini dibuat otomatis dari database absensi aplikasi Diskominfo Guestbook.", {
            align: "left",
        });

    doc.end();

    await new Promise((resolve, reject) => {
        outputStream.on("finish", resolve);
        outputStream.on("error", reject);
    });

    process.stdout.write(
        `PDF berhasil dibuat:\n- File: ${outputPath}\n- Total hadir (data): ${presentRows.length}\n- Total belum hadir: ${totalAbsent}\n`,
    );
}

main()
    .catch((error) => {
        process.stderr.write(`Gagal membuat laporan PDF: ${error instanceof Error ? error.message : String(error)}\n`);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
