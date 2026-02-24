import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const attendanceFilePath = path.join(process.cwd(), "data", "attendance.json");
    const raw = await readFile(attendanceFilePath, "utf8");
    const rows = JSON.parse(raw);

    if (!Array.isArray(rows)) {
        throw new Error("data/attendance.json harus berupa array.");
    }

    await prisma.attendance.deleteMany();

    for (const row of rows) {
        await prisma.attendance.create({
            data: {
                id: String(row.id),
                name: String(row.name),
                jabatan: String(row.jabatan),
                instansi: String(row.instansi),
                phoneNumber: String(row.phoneNumber),
                nip: String(row.nip),
                participantId: String(row.participantId),
                participantLabel: String(row.participantLabel),
                participantRole: String(row.participantRole),
                selfieDataUrl: row.selfieDataUrl ? String(row.selfieDataUrl) : null,
                source: String(row.source),
                createdAt: new Date(String(row.createdAt)),
            },
        });
    }

    const total = await prisma.attendance.count();
    process.stdout.write(`Seed selesai. Total row di DB: ${total}\n`);
}

main()
    .catch((error) => {
        process.stderr.write(`Seed gagal: ${error instanceof Error ? error.message : String(error)}\n`);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
