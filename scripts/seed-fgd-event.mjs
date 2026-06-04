import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const eventCode = "fgd_operator_aduan_2026_06_04";
    const eventName = "Focus Group Discussion (FGD) Operator Aduan Lontara+";
    const eventDate = new Date("2026-06-04T00:00:00.000Z");

    process.stdout.write("Memulai konfigurasi event baru...\n");

    // 1. Deactivate all existing events to make room for the new active one
    await prisma.attendanceEvent.updateMany({
        data: { isActive: false },
    });

    // 2. Upsert the new event as active
    const event = await prisma.attendanceEvent.upsert({
        where: { code: eventCode },
        update: {
            name: eventName,
            eventDate,
            isActive: true,
        },
        create: {
            code: eventCode,
            name: eventName,
            eventDate,
            isActive: true,
        },
    });

    process.stdout.write(`Event "${event.name}" (${event.code}) berhasil didaftarkan dan diaktifkan.\n`);
    
    // Optional: If you want to wipe previous attendance records to start completely fresh,
    // you can run: await prisma.attendance.deleteMany();
    // For safety, we keep them separated by their 'source' event code by default.
    const totalAttendances = await prisma.attendance.count({
        where: { source: eventCode }
    });
    process.stdout.write(`Total absensi tercatat untuk event ini hari ini: ${totalAttendances}\n`);
}

main()
    .catch((error) => {
        process.stderr.write(`Seeding event gagal: ${error instanceof Error ? error.message : String(error)}\n`);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
