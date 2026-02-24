"use client";

// Visitor data interface
export interface Visitor {
    id: string;
    name: string;
    nip: string;
    jabatan: string;
    organization: string;
    asalDaerah: string;
    provinsi: string;
    unit: string;
    purpose: string;
    nomorSurat: string;
    timestamp: string;
    date: string;
}

// Storage key
const STORAGE_KEY = "diskominfo_visitors";

// Get all visitors from localStorage
export function getVisitors(): Visitor[] {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

// Add a new visitor
export function addVisitor(visitor: Omit<Visitor, "id" | "timestamp" | "date">): Visitor {
    const now = new Date();
    const newVisitor: Visitor = {
        ...visitor,
        id: crypto.randomUUID(),
        timestamp: now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        date: now.toISOString().split("T")[0],
    };

    const visitors = getVisitors();
    visitors.unshift(newVisitor);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visitors));

    return newVisitor;
}

// Get statistics
export function getStats() {
    const visitors = getVisitors();
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const todayVisitors = visitors.filter((v) => v.date === today);
    const weekVisitors = visitors.filter((v) => v.date >= weekAgo);
    const monthVisitors = visitors.filter((v) => v.date >= monthAgo);

    // Find peak hour
    const hourCounts: Record<string, number> = {};
    todayVisitors.forEach((v) => {
        const hour = v.timestamp.split(":")[0];
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";

    // Province distribution
    const provinsiCounts: Record<string, number> = {};
    visitors.forEach((v) => {
        if (v.provinsi && v.provinsi !== "-") {
            provinsiCounts[v.provinsi] = (provinsiCounts[v.provinsi] || 0) + 1;
        }
    });
    const topProvinsi = Object.entries(provinsiCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";

    // Hourly distribution for today (0-23)
    const hourlyData: number[] = Array(24).fill(0);
    todayVisitors.forEach((v) => {
        const hour = parseInt(v.timestamp.split(":")[0], 10);
        if (!isNaN(hour)) hourlyData[hour]++;
    });

    // Daily average this week
    const avgPerDay = weekVisitors.length > 0 ? Math.round(weekVisitors.length / 7) : 0;

    return {
        today: todayVisitors.length,
        week: weekVisitors.length,
        month: monthVisitors.length,
        total: visitors.length,
        peakHour: peakHour !== "-" ? `${peakHour}:00` : "-",
        topProvinsi,
        provinsiCounts,
        hourlyData,
        avgPerDay,
    };
}

// Export to CSV
export function exportToCSV(): string {
    const visitors = getVisitors();
    const headers = ["Nama", "NIP/NIK", "Jabatan", "Instansi", "Asal Daerah", "Provinsi", "Unit Tujuan", "Keperluan", "Nomor Surat", "Tanggal", "Waktu"];
    const rows = visitors.map((v) => [v.name, v.nip, v.jabatan, v.organization, v.asalDaerah, v.provinsi, v.unit, v.purpose, v.nomorSurat, v.date, v.timestamp]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    return csvContent;
}

// Clear all data (for testing)
export function clearVisitors(): void {
    localStorage.removeItem(STORAGE_KEY);
}

// Seed dummy data for testing
export function seedDummyData(): void {
    const names = [
        "Ahmad Yusuf", "Siti Rahmawati", "Budi Santoso", "Dewi Lestari", "Andi Pratama",
        "Nurul Hidayah", "Reza Firmansyah", "Putri Ayu", "Dimas Saputra", "Rina Wulandari",
        "Hendra Wijaya", "Maya Sari", "Fajar Nugroho", "Lina Marlina", "Yoga Pratama",
        "Bambang Suryono", "Ani Susanti", "Rizal Fadillah", "Fitri Handayani", "Agus Setiawan"
    ];
    const jabatans = ["Kepala Bidang", "Staff", "Analis", "Direktur", "Manager", "Koordinator", "Supervisor", "Asisten", "-"];
    const orgs = [
        "PT Telkom Indonesia", "Universitas Hasanuddin", "Bank BRI", "Dinas Pendidikan",
        "BPJS Kesehatan", "PLN Wilayah Sulsel", "Kantor Kelurahan", "Umum", "CV Mitra Jaya",
        "Dinas Kesehatan", "Kementerian Kominfo", "PT Pertamina", "Bank Mandiri", "BUMN"
    ];
    const daerahs = ["Makassar", "Gowa", "Maros", "Takalar", "Bone", "Wajo", "Soppeng", "Sinjai", "Bantaeng", "Jeneponto", "Bulukumba", "Palopo"];
    const provinsis = [
        "Sulawesi Selatan", "Sulawesi Barat", "Sulawesi Tenggara", "Sulawesi Tengah", "Sulawesi Utara", "Gorontalo",
        "DKI Jakarta", "Jawa Barat", "Jawa Tengah", "Jawa Timur", "DI Yogyakarta", "Banten",
        "Sumatera Utara", "Sumatera Barat", "Sumatera Selatan", "Riau", "Lampung",
        "Kalimantan Selatan", "Kalimantan Timur", "Bali", "Papua", "Maluku"
    ];
    const purposes = [
        "Koordinasi program", "Konsultasi teknis", "Pengambilan dokumen", "Rapat koordinasi",
        "Permohonan data", "Kunjungan kerja", "Sosialisasi", "Tanda tangan berkas", "Audiensi", "Pelaporan"
    ];

    const visitors: Visitor[] = [];
    const now = new Date();

    for (let i = 0; i < 75; i++) {
        const daysAgo = Math.floor(Math.random() * 30);
        const hour = 7 + Math.floor(Math.random() * 10);
        const minute = Math.floor(Math.random() * 60);
        const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        const hasNip = Math.random() > 0.35;
        const hasSurat = Math.random() > 0.4;

        visitors.push({
            id: crypto.randomUUID(),
            name: names[Math.floor(Math.random() * names.length)],
            nip: hasNip ? `19${70 + Math.floor(Math.random() * 30)}${String(Math.floor(Math.random() * 10000000000)).padStart(10, "0")}` : "-",
            jabatan: jabatans[Math.floor(Math.random() * jabatans.length)],
            organization: orgs[Math.floor(Math.random() * orgs.length)],
            asalDaerah: daerahs[Math.floor(Math.random() * daerahs.length)],
            provinsi: provinsis[Math.floor(Math.random() * provinsis.length)],
            unit: "-",
            purpose: purposes[Math.floor(Math.random() * purposes.length)],
            nomorSurat: hasSurat ? `${Math.floor(Math.random() * 999) + 1}/DK/${2026}` : "-",
            timestamp: `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
            date: date.toISOString().split("T")[0],
        });
    }

    // Sort by date desc, then time desc
    visitors.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.timestamp.localeCompare(a.timestamp);
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(visitors));
}
