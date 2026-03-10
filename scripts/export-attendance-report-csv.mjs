import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import nextEnv from "@next/env";

const PROJECT_ROOT = process.cwd();
const REPORTS_DIR = path.join(PROJECT_ROOT, "reports");
const DEFAULT_SOURCE = "lontara_2026_02_23";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SOURCE_RE = /^[a-zA-Z0-9._-]+$/;
const REPORT_TIME_ZONE = "Asia/Makassar";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(PROJECT_ROOT);
const prisma = new PrismaClient();

function formatTodayMakassar() {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Makassar",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());
    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;
    return `${year}-${month}-${day}`;
}

function printHelp() {
    process.stdout.write(
        [
            "Usage:",
            "  npm run report:attendance:csv -- [--all] [--date YYYY-MM-DD] [--source SOURCE] [--out ./reports/raw-attendance.csv]",
            "",
            "Description:",
            "  Export RAW attendance data ke CSV dari Neon/PostgreSQL menggunakan Prisma ORM.",
            "",
            "Options:",
            "  --all      Export semua tanggal (default false).",
            "  --date     Filter tanggal Asia/Makassar (default: hari ini).",
            "  --source   Filter source attendance (default: lontara_2026_02_23).",
            "  --out      File output CSV.",
            "  --help     Tampilkan bantuan.",
            "",
            "Required:",
            "  - env DATABASE_URL harus tersedia.",
        ].join("\n") + "\n",
    );
}

function parseArgs(argv) {
    let source = DEFAULT_SOURCE;
    let useAll = false;
    let dateFilter = formatTodayMakassar();
    let outPath = "";

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === "--help" || arg === "-h") {
            return { help: true };
        }
        if (arg === "--all") {
            useAll = true;
            continue;
        }
        if (arg === "--date") {
            dateFilter = argv[i + 1] ?? "";
            i += 1;
            continue;
        }
        if (arg.startsWith("--date=")) {
            dateFilter = arg.slice("--date=".length);
            continue;
        }
        if (arg === "--source") {
            source = argv[i + 1] ?? "";
            i += 1;
            continue;
        }
        if (arg.startsWith("--source=")) {
            source = arg.slice("--source=".length);
            continue;
        }
        if (arg === "--out") {
            outPath = argv[i + 1] ?? "";
            i += 1;
            continue;
        }
        if (arg.startsWith("--out=")) {
            outPath = arg.slice("--out=".length);
            continue;
        }

        throw new Error(`Argumen tidak dikenal: ${arg}`);
    }

    if (!DATE_RE.test(dateFilter)) {
        throw new Error("Format --date harus YYYY-MM-DD.");
    }
    if (!SOURCE_RE.test(source)) {
        throw new Error("--source hanya boleh huruf/angka/titik/underscore/dash.");
    }

    if (!outPath) {
        outPath = path.join(
            REPORTS_DIR,
            useAll
                ? `raw-attendance-${source}-all.csv`
                : `raw-attendance-${source}-${dateFilter}.csv`,
        );
    } else {
        outPath = path.isAbsolute(outPath) ? outPath : path.join(PROJECT_ROOT, outPath);
    }

    return { help: false, source, useAll, dateFilter, outPath };
}

function getMakassarUtcRange(dateKey) {
    const dayStart = new Date(`${dateKey}T00:00:00+08:00`);
    if (Number.isNaN(dayStart.getTime())) {
        throw new Error(`Tanggal tidak valid: ${dateKey}`);
    }
    const nextDay = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    return { dayStart, nextDay };
}

function escapeCsvCell(value) {
    if (value === null || value === undefined) return "";
    const raw = String(value);
    return `"${raw.replace(/"/g, '""')}"`;
}

function toCsv(headers, rows) {
    const headerLine = headers.map(escapeCsvCell).join(",");
    const dataLines = rows.map((row) =>
        headers.map((header) => escapeCsvCell(row[header])).join(","),
    );
    return [headerLine, ...dataLines].join("\n");
}

async function runPrismaExport({ source, useAll, dateFilter, outPath }) {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL belum diset.");
    }

    await mkdir(path.dirname(outPath), { recursive: true });
    const where = { source };
    if (!useAll) {
        const { dayStart, nextDay } = getMakassarUtcRange(dateFilter);
        where.createdAt = {
            gte: dayStart,
            lt: nextDay,
        };
    }

    const rows = await prisma.attendance.findMany({
        where,
        orderBy: {
            createdAt: "desc",
        },
    });

    const normalized = rows.map((row) => ({
        id: row.id,
        name: row.name,
        jabatan: row.jabatan,
        instansi: row.instansi,
        phoneNumber: row.phoneNumber,
        nip: row.nip,
        participantId: row.participantId,
        participantLabel: row.participantLabel,
        participantRole: row.participantRole,
        selfieDataUrl: row.selfieDataUrl ?? "",
        source: row.source,
        createdAt: row.createdAt.toISOString(),
        createdAtMakassar: new Intl.DateTimeFormat("id-ID", {
            timeZone: REPORT_TIME_ZONE,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        }).format(row.createdAt),
    }));

    const headers = [
        "id",
        "name",
        "jabatan",
        "instansi",
        "phoneNumber",
        "nip",
        "participantId",
        "participantLabel",
        "participantRole",
        "selfieDataUrl",
        "source",
        "createdAt",
        "createdAtMakassar",
    ];

    const csv = toCsv(headers, normalized);
    await writeFile(outPath, csv, "utf8");
    return normalized.length;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
        printHelp();
        return;
    }

    const exported = await runPrismaExport(args);
    process.stdout.write(
        [
            "CSV raw berhasil dibuat:",
            `- File: ${args.outPath}`,
            `- Total rows: ${exported}`,
            `- Source: ${args.source}`,
            `- Periode: ${args.useAll ? "semua tanggal" : `${args.dateFilter} (Asia/Makassar)`}`,
        ].join("\n") + "\n",
    );
}

main()
    .catch((error) => {
        process.stderr.write(`Gagal export CSV: ${error instanceof Error ? error.message : String(error)}\n`);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
