"use client";

export interface Operator {
    id: string;
    name: string;
    instansi: string;
    jabatan: string;
    nipNik: string;
    bidang: string;
    whatsapp: string;
    timestamp: string;
    date: string;
}

const STORAGE_KEY = "diskominfo_operators";

export function getOperators(): Operator[] {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

export function addOperator(op: Omit<Operator, "id" | "timestamp" | "date">): Operator {
    const now = new Date();
    const newOp: Operator = {
        ...op,
        id: crypto.randomUUID(),
        timestamp: now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        date: now.toISOString().split("T")[0],
    };

    const ops = getOperators();
    ops.unshift(newOp);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ops));
    return newOp;
}

export function deleteOperator(id: string): void {
    const ops = getOperators().filter((o) => o.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ops));
}

export function clearOperators(): void {
    localStorage.removeItem(STORAGE_KEY);
}

export function normalizeWhatsAppNumber(raw: string): string {
    // Return digits-only with Indonesian country code (62) if possible.
    const s = (raw || "").trim();
    if (!s) return "";
    const digits = s.replace(/[^\d]/g, "");
    if (!digits) return "";
    if (digits.startsWith("62")) return digits;
    if (digits.startsWith("0")) return `62${digits.slice(1)}`;
    if (digits.startsWith("8")) return `62${digits}`;
    return digits;
}

export function exportOperatorsToCSV(): string {
    const ops = getOperators();
    const headers = ["Nama", "Instansi", "Bidang", "Jabatan", "NIP/NIK", "WhatsApp", "Tanggal", "Waktu"];
    const rows = ops.map((o) => [o.name, o.instansi, o.bidang, o.jabatan, o.nipNik, o.whatsapp, o.date, o.timestamp]);
    return [headers.join(","), ...rows.map((r) => r.map((c) => `"${c ?? ""}"`).join(","))].join("\n");
}

export function seedDummyOperators(): void {
    const names = ["Rizky", "Aulia", "Andi", "Nabila", "Fajar", "Dewi", "Ilham", "Siti"];
    const instansis = ["Diskominfo Makassar", "UPT Warroom"];
    const bidangs = ["Sekretariat", "Aptika", "IKP", "SPBE", "Pengelolaan Data", "Layanan Publik"];
    const jabatans = ["Operator", "Staff", "Koordinator", "Kepala Bidang"];

    const ops: Operator[] = [];
    const now = new Date();
    for (let i = 0; i < 18; i++) {
        const hour = 8 + Math.floor(Math.random() * 9);
        const minute = Math.floor(Math.random() * 60);
        const daysAgo = Math.floor(Math.random() * 10);
        const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

        ops.push({
            id: crypto.randomUUID(),
            name: names[Math.floor(Math.random() * names.length)],
            instansi: instansis[Math.floor(Math.random() * instansis.length)],
            bidang: bidangs[Math.floor(Math.random() * bidangs.length)],
            jabatan: jabatans[Math.floor(Math.random() * jabatans.length)],
            nipNik: Math.random() > 0.5 ? `19${70 + Math.floor(Math.random() * 30)}${String(Math.floor(Math.random() * 10000000000)).padStart(10, "0")}` : `7371${String(Math.floor(Math.random() * 100000000000)).padStart(12, "0")}`,
            whatsapp: `08${String(Math.floor(Math.random() * 1000000000)).padStart(9, "0")}`,
            timestamp: `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
            date: date.toISOString().split("T")[0],
        });
    }

    ops.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.timestamp.localeCompare(a.timestamp);
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(ops));
}

