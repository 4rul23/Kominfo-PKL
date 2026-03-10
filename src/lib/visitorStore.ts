"use client";

import { createClientSafeId } from "@/lib/id";

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

const STORAGE_KEY = "diskominfo_visitors";

export function getVisitors(): Visitor[] {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

export async function fetchVisitorsFromServer(): Promise<Visitor[]> {
    const response = await fetch("/api/visitors", { cache: "no-store" });
    if (!response.ok) return [];
    const data = (await response.json().catch(() => ({}))) as { visitors?: Visitor[] };
    return Array.isArray(data.visitors) ? data.visitors : [];
}

export async function hydrateVisitorsFromServer(): Promise<void> {
    if (typeof window === "undefined") return;
    const visitors = await fetchVisitorsFromServer();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visitors));
}

export async function addVisitor(visitor: Omit<Visitor, "id" | "timestamp" | "date">): Promise<Visitor> {
    const payload = {
        ...visitor,
        id: createClientSafeId("visitor"),
    };
    const response = await fetch("/api/visitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    const data = (await response.json().catch(() => ({}))) as { visitor?: Visitor; message?: string };
    if (!response.ok || !data.visitor) {
        throw new Error(data.message || "Gagal menyimpan data tamu.");
    }

    const visitors = getVisitors().filter((item) => item.id !== data.visitor!.id);
    visitors.unshift(data.visitor);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visitors));
    return data.visitor;
}

export function getStats() {
    const visitors = getVisitors();
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const todayVisitors = visitors.filter((v) => v.date === today);
    const weekVisitors = visitors.filter((v) => v.date >= weekAgo);
    const monthVisitors = visitors.filter((v) => v.date >= monthAgo);
    const hourCounts: Record<string, number> = {};
    todayVisitors.forEach((v) => {
        const hour = v.timestamp.split(":")[0];
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
    const provinsiCounts: Record<string, number> = {};
    visitors.forEach((v) => {
        if (v.provinsi && v.provinsi !== "-") provinsiCounts[v.provinsi] = (provinsiCounts[v.provinsi] || 0) + 1;
    });
    const topProvinsi = Object.entries(provinsiCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
    const hourlyData: number[] = Array(24).fill(0);
    todayVisitors.forEach((v) => {
        const hour = parseInt(v.timestamp.split(":")[0], 10);
        if (!isNaN(hour)) hourlyData[hour]++;
    });
    const avgPerDay = weekVisitors.length > 0 ? Math.round(weekVisitors.length / 7) : 0;
    return { today: todayVisitors.length, week: weekVisitors.length, month: monthVisitors.length, total: visitors.length, peakHour: peakHour !== "-" ? `${peakHour}:00` : "-", topProvinsi, provinsiCounts, hourlyData, avgPerDay };
}

export function exportToCSV(): string {
    const visitors = getVisitors();
    const headers = ["Nama", "NIP/NIK", "Jabatan", "Instansi", "Asal Daerah", "Provinsi", "Unit Tujuan", "Keperluan", "Nomor Surat", "Tanggal", "Waktu"];
    const rows = visitors.map((v) => [v.name, v.nip, v.jabatan, v.organization, v.asalDaerah, v.provinsi, v.unit, v.purpose, v.nomorSurat, v.date, v.timestamp]);
    return [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
}

export async function clearVisitors(): Promise<void> {
    await fetch("/api/visitors", { method: "DELETE" });
    localStorage.removeItem(STORAGE_KEY);
}

export async function seedDummyData(): Promise<void> {
    return;
}
