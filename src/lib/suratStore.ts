"use client";

// File attachment interface
export interface Attachment {
    id: string;
    filename: string;
    type: string;
    size: number;
    data: string; // Base64 encoded
    uploadedAt: string;
}

// Status change history
export interface StatusChange {
    status: string;
    timestamp: string;
    note?: string;
}

// Disposisi (letter assignment) interface
export interface Disposisi {
    assignedTo: string;       // Staff name/position
    instruksi: string[];      // Instructions array
    catatan: string;          // Additional notes
    tanggalDisposisi: string; // ISO date
    disposisiOleh: string;    // Disposed by (admin name)
}

// Priority levels
export type Prioritas = "tinggi" | "normal" | "rendah";

// Letter type codes per TNDE
export const KODE_SURAT: Record<string, string> = {
    "Permohonan": "SPm",
    "Undangan": "SU",
    "Laporan": "SLap",
    "Pengaduan": "SPg",
    "Informasi": "SPb",
    "Lainnya": "SE",
};

// Classification codes (000-900)
export const KLASIFIKASI_SURAT = [
    { code: "000", label: "Umum" },
    { code: "100", label: "Pemerintahan" },
    { code: "400", label: "Kesejahteraan Rakyat" },
    { code: "500", label: "Perekonomian" },
];

// Surat Elektronik data interface
export interface SuratElektronik {
    id: string;
    trackingId: string;        // Public tracking ID: TRK-YYYY-MM-XXXX
    nomorSurat: string;        // Official: 001/SE.SPm/DISKOMINFO/I/2026

    // Sender Info
    namaPengirim: string;
    emailPengirim: string;
    teleponPengirim: string;
    instansiPengirim: string;
    alamatPengirim: string;

    // Letter Details
    perihal: string;
    jenisSurat: string;
    kodeSurat: string;         // Letter type code (SPm, SU, etc.)
    klasifikasi: string;       // Classification code (000-900)
    tujuanUnit?: string;  // Optional - removed from wizard
    isiSurat: string;

    // Attachments
    lampiran: Attachment[];

    // Priority and SLA
    prioritas: Prioritas;
    slaDeadline: string;       // ISO date for SLA deadline

    // Disposisi
    disposisi?: Disposisi;
    responseNote?: string;     // Admin response note

    // Metadata
    status: "submitted" | "received" | "processing" | "completed" | "archived";
    statusHistory: StatusChange[];
    timestamp: string;
    date: string;
    lastUpdated: string;
}

// Storage key
const STORAGE_KEY = "diskominfo_surat_elektronik";

// Roman numerals for months
const ROMAN_MONTHS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

// Generate public tracking ID: TRK-YYYY-MM-XXXX
function generateTrackingId(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const existing = getSuratList();
    const thisMonth = existing.filter(s => s.trackingId?.startsWith(`TRK-${year}-${month}`)).length + 1;
    return `TRK-${year}-${month}-${String(thisMonth).padStart(4, "0")}`;
}

// Generate official Nomor Surat: 001/SE.SPm/DISKOMINFO/I/2026
function generateNomorSurat(kodeSurat: string): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = ROMAN_MONTHS[now.getMonth()];
    const existing = getSuratList();
    const count = existing.filter(s => {
        const parts = s.nomorSurat?.split("/");
        return parts && parts[parts.length - 1] === String(year);
    }).length + 1;
    return `${String(count).padStart(3, "0")}/SE.${kodeSurat}/DISKOMINFO/${month}/${year}`;
}

// Get all surat from localStorage
export function getSuratList(): SuratElektronik[] {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

// Get surat by tracking ID
export function getSuratByTrackingId(trackingId: string): SuratElektronik | null {
    const suratList = getSuratList();
    return suratList.find(s => s.trackingId?.toLowerCase() === trackingId.toLowerCase()) || null;
}

// Get surat by ID
export function getSuratById(id: string): SuratElektronik | null {
    const suratList = getSuratList();
    return suratList.find(s => s.id === id) || null;
}

// Input type for adding surat
type AddSuratInput = {
    namaPengirim: string;
    emailPengirim: string;
    teleponPengirim: string;
    instansiPengirim: string;
    alamatPengirim: string;
    perihal: string;
    jenisSurat: string;
    tujuanUnit?: string;  // Optional
    isiSurat: string;
    lampiran?: Attachment[];
    prioritas?: Prioritas;
};

// Add a new surat
export function addSurat(surat: AddSuratInput): SuratElektronik {
    const now = new Date();
    const kodeSurat = KODE_SURAT[surat.jenisSurat] || "SE";

    const newSurat: SuratElektronik = {
        ...surat,
        id: crypto.randomUUID(),
        trackingId: generateTrackingId(),
        nomorSurat: generateNomorSurat(kodeSurat),
        kodeSurat,
        klasifikasi: "000", // Default to Umum
        lampiran: surat.lampiran || [],
        prioritas: surat.prioritas || "normal",
        slaDeadline: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3-day SLA
        status: "submitted",
        statusHistory: [{
            status: "submitted",
            timestamp: now.toISOString(),
            note: "Surat elektronik berhasil dikirim"
        }],
        timestamp: now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        date: now.toISOString().split("T")[0],
        lastUpdated: now.toISOString(),
    };

    const suratList = getSuratList();
    suratList.unshift(newSurat);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(suratList));

    return newSurat;
}

// Update surat status with history
export function updateSuratStatus(id: string, status: SuratElektronik["status"], note?: string): void {
    const suratList = getSuratList();
    const index = suratList.findIndex(s => s.id === id);
    if (index !== -1) {
        const now = new Date();
        suratList[index].status = status;
        suratList[index].lastUpdated = now.toISOString();
        suratList[index].statusHistory = suratList[index].statusHistory || [];
        suratList[index].statusHistory.push({
            status,
            timestamp: now.toISOString(),
            note: note || getDefaultStatusNote(status)
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(suratList));
    }
}

// Get default status notes
function getDefaultStatusNote(status: string): string {
    switch (status) {
        case "received": return "Surat telah diterima oleh admin";
        case "processing": return "Surat sedang dalam proses";
        case "completed": return "Surat telah selesai diproses";
        case "archived": return "Surat telah diarsipkan";
        default: return "";
    }
}

// Get statistics
export function getSuratStats() {
    const suratList = getSuratList();
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const todaySurat = suratList.filter((s) => s.date === today);
    const weekSurat = suratList.filter((s) => s.date >= weekAgo);

    const statusCounts = {
        submitted: suratList.filter(s => s.status === "submitted").length,
        received: suratList.filter(s => s.status === "received").length,
        processing: suratList.filter(s => s.status === "processing").length,
        completed: suratList.filter(s => s.status === "completed").length,
        archived: suratList.filter(s => s.status === "archived").length,
    };

    // Unit distribution
    const unitCounts: Record<string, number> = {};
    suratList.forEach((s) => {
        if (s.tujuanUnit) {
            unitCounts[s.tujuanUnit] = (unitCounts[s.tujuanUnit] || 0) + 1;
        }
    });

    return {
        today: todaySurat.length,
        week: weekSurat.length,
        total: suratList.length,
        statusCounts,
        unitCounts,
    };
}

// Export to CSV
export function exportSuratToCSV(): string {
    const suratList = getSuratList();
    const headers = ["Tracking ID", "No. Surat", "Tanggal", "Waktu", "Nama Pengirim", "Email", "Telepon", "Instansi", "Alamat", "Perihal", "Jenis Surat", "Tujuan Unit", "Isi Surat", "Lampiran", "Status"];
    const rows = suratList.map((s) => [
        s.trackingId || "",
        s.nomorSurat,
        s.date,
        s.timestamp,
        s.namaPengirim,
        s.emailPengirim,
        s.teleponPengirim,
        s.instansiPengirim,
        s.alamatPengirim,
        s.perihal,
        s.jenisSurat,
        s.tujuanUnit,
        s.isiSurat,
        s.lampiran?.length || 0,
        s.status
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    return csvContent;
}

// Clear all data (for testing)
export function clearSuratList(): void {
    localStorage.removeItem(STORAGE_KEY);
}

// Assign disposisi to a surat
export function assignDisposisi(id: string, disposisi: Omit<Disposisi, "tanggalDisposisi">): void {
    const suratList = getSuratList();
    const index = suratList.findIndex(s => s.id === id);
    if (index !== -1) {
        const now = new Date();
        suratList[index].disposisi = {
            ...disposisi,
            tanggalDisposisi: now.toISOString(),
        };
        suratList[index].lastUpdated = now.toISOString();
        suratList[index].statusHistory.push({
            status: suratList[index].status,
            timestamp: now.toISOString(),
            note: `Didisposisikan ke ${disposisi.assignedTo}`
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(suratList));
    }
}

// Add admin response note
export function addResponseNote(id: string, note: string): void {
    const suratList = getSuratList();
    const index = suratList.findIndex(s => s.id === id);
    if (index !== -1) {
        const now = new Date();
        suratList[index].responseNote = note;
        suratList[index].lastUpdated = now.toISOString();
        suratList[index].statusHistory.push({
            status: suratList[index].status,
            timestamp: now.toISOString(),
            note: `Respon ditambahkan: ${note.substring(0, 50)}...`
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(suratList));
    }
}

// Get overdue surat (past SLA deadline and not completed/archived)
export function getOverdueSurat(): SuratElektronik[] {
    const suratList = getSuratList();
    const now = new Date().toISOString();
    return suratList.filter(s =>
        s.slaDeadline &&
        s.slaDeadline < now &&
        !["completed", "archived"].includes(s.status)
    );
}

// Get unit distribution statistics
export function getUnitStats(): { unit: string; count: number; percentage: number }[] {
    const suratList = getSuratList();
    const unitCounts: Record<string, number> = {};

    suratList.forEach(s => {
        if (s.tujuanUnit) {
            unitCounts[s.tujuanUnit] = (unitCounts[s.tujuanUnit] || 0) + 1;
        }
    });

    const total = suratList.length || 1;
    return Object.entries(unitCounts)
        .map(([unit, count]) => ({
            unit,
            count,
            percentage: Math.round((count / total) * 100)
        }))
        .sort((a, b) => b.count - a.count);
}

// Get hourly distribution for today
export function getHourlyStats(): number[] {
    const suratList = getSuratList();
    const today = new Date().toISOString().split("T")[0];
    const hourlyData = new Array(24).fill(0);

    suratList
        .filter(s => s.date === today)
        .forEach(s => {
            const hour = parseInt(s.timestamp.split(":")[0], 10);
            if (!isNaN(hour) && hour >= 0 && hour < 24) {
                hourlyData[hour]++;
            }
        });

    return hourlyData;
}

// Update surat priority
export function updatePrioritas(id: string, prioritas: Prioritas): void {
    const suratList = getSuratList();
    const index = suratList.findIndex(s => s.id === id);
    if (index !== -1) {
        const now = new Date();
        // Recalculate SLA based on new priority
        const slaDays = prioritas === "tinggi" ? 1 : prioritas === "normal" ? 3 : 5;
        suratList[index].prioritas = prioritas;
        suratList[index].slaDeadline = new Date(now.getTime() + slaDays * 24 * 60 * 60 * 1000).toISOString();
        suratList[index].lastUpdated = now.toISOString();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(suratList));
    }
}

// Seed dummy data for testing
// Seed dummy data for testing
export function seedDummySurat(): void {
    const names = ["Andi Putra", "Budi Hartono", "Citra Dewi", "Dian Sari", "Eko Prasetyo", "Fajar Nugraha", "Gita Pertiwi"];
    const instansis = ["PT Telkom Indonesia", "Universitas Hasanuddin", "Bank BRI", "Dinas Pendidikan", "CV Teknologi Maju", "Kementerian Kominfo", "Polri"];
    const units = ["Bidang IKP", "Bidang Aptika", "Sekretariat", "Bidang Statistik", "Bidang E-Government"];
    const now = new Date();
    const romanMonths = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

    const suratList: SuratElektronik[] = [];

    // Helper to add days to a date
    const addDays = (date: Date, days: number) => {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    };

    // Helper to create a surat
    const createSurat = (
        daysAgo: number,
        prioritas: Prioritas,
        status: SuratElektronik["status"],
        subject: string,
        withDisposisi: boolean = false
    ): SuratElektronik => {
        const date = addDays(now, -daysAgo);
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const slaDays = prioritas === "tinggi" ? 1 : prioritas === "normal" ? 3 : 5;
        const slaDeadline = addDays(date, slaDays).toISOString();

        const id = crypto.randomUUID();
        const history: StatusChange[] = [{
            status: "submitted",
            timestamp: date.toISOString(),
            note: "Surat elektronik berhasil dikirim"
        }];

        if (["received", "processing", "completed", "archived"].includes(status)) {
            history.push({
                status: "received",
                timestamp: addDays(date, 0.1).toISOString(),
                note: "Surat diterima oleh admin"
            });
        }

        let disposisi: Disposisi | undefined = undefined;
        if (withDisposisi || ["processing", "completed", "archived"].includes(status)) {
            history.push({
                status: "processing",
                timestamp: addDays(date, 0.2).toISOString(),
                note: "Surat sedang diproses"
            });
            disposisi = {
                assignedTo: "Budi Santoso (Staff Administrasi)",
                instruksi: ["Tindak Lanjuti", "Koordinasikan"],
                catatan: "Mohon segera diproses sesuai SOP.",
                tanggalDisposisi: addDays(date, 0.2).toISOString(),
                disposisiOleh: "Admin Utama"
            };
        }

        if (["completed", "archived"].includes(status)) {
            history.push({
                status: "completed",
                timestamp: addDays(date, 1).toISOString(),
                note: "Selesai ditindaklanjuti"
            });
        }

        const unit = units[Math.floor(Math.random() * units.length)];

        return {
            id,
            trackingId: `TRK-${date.getFullYear()}-${month}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
            nomorSurat: `${String(Math.floor(Math.random() * 100) + 1).padStart(3, "0")}/SE/DISKOMINFO/${romanMonths[date.getMonth()]}/${date.getFullYear()}`,
            namaPengirim: names[Math.floor(Math.random() * names.length)],
            emailPengirim: "user@example.com",
            teleponPengirim: "08123456789",
            instansiPengirim: instansis[Math.floor(Math.random() * instansis.length)],
            alamatPengirim: "Jl. Merdeka No. 1, Kota Makassar",
            perihal: subject,
            jenisSurat: "Permohonan",
            kodeSurat: "SPm",
            klasifikasi: "000",
            tujuanUnit: unit,
            isiSurat: "Dengan hormat, kami mengajukan permohonan...",
            lampiran: [],
            prioritas,
            slaDeadline,
            status,
            statusHistory: history,
            disposisi,
            timestamp: date.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' }).replace('.', ':'),
            date: date.toISOString().split("T")[0],
            lastUpdated: date.toISOString(),
        };
    };

    // 1. OVERDUE High Priority (Submitted 3 days ago, SLA 1 day) -> Status Received (not completed)
    suratList.push(createSurat(3, "tinggi", "received", "Permohonan Data Segera (URGENT OVERDUE)"));

    // 2. WARNING Normal Priority (Submitted 2 days ago, SLA 3 days) -> Status Processing
    suratList.push(createSurat(2, "normal", "processing", "Undangan Rapat Koordinasi (WARNING)", true));

    // 3. SAFE Low Priority (Submitted 1 day ago, SLA 5 days) -> Status Submitted
    suratList.push(createSurat(1, "rendah", "submitted", "Laporan Bulanan Rutin"));

    // 4. Completed High Priority
    suratList.push(createSurat(5, "tinggi", "completed", "Permohonan Fasilitasi Zoom (Selesai)", true));

    // 5. Archived Normal Priority
    suratList.push(createSurat(10, "normal", "archived", "Undangan Sosialisasi (Arsip)", true));

    // 6. Recently Submitted High Priority
    suratList.push(createSurat(0, "tinggi", "submitted", "Laporan Insiden Keamanan (BARU)"));

    // Add some random ones to fill up
    for (let i = 0; i < 8; i++) {
        const p = Math.random() > 0.7 ? "tinggi" : Math.random() > 0.4 ? "normal" : "rendah";
        const s = ["submitted", "received", "processing", "completed"][Math.floor(Math.random() * 4)] as SuratElektronik["status"];
        suratList.push(createSurat(Math.floor(Math.random() * 7), p, s, `Surat Umum #${i + 1}`, s === "processing" || s === "completed"));
    }

    // Sort by date desc
    suratList.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());

    localStorage.setItem(STORAGE_KEY, JSON.stringify(suratList));
    // Trigger storage event to update components if listening
    window.dispatchEvent(new Event("storage"));
}

