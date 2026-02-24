"use client";

export type StaffRole = "admin" | "receptionist" | "operator";
export type StaffInstansi = "Diskominfo Makassar" | "UPT Warroom";

export interface StaffUser {
    id: string;
    username: string; // login identifier (dummy)
    name: string;
    nipNik: string;
    instansi: StaffInstansi;
    role: StaffRole;
    orgUnitId: string | null;
    whatsapp: string;
    isActive: boolean;
    // Dummy only: stored in localStorage. Replace with passwordHash in real backend.
    password: string;
    timestamp: string;
    date: string;
}

const STORAGE_KEY = "diskominfo_staff_users";

export function getStaffUsers(): StaffUser[] {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

export function getStaffUserById(id: string): StaffUser | null {
    return getStaffUsers().find((u) => u.id === id) || null;
}

export function upsertStaffUser(user: Omit<StaffUser, "timestamp" | "date">): StaffUser {
    const now = new Date();
    const list = getStaffUsers();
    const idx = list.findIndex((u) => u.id === user.id);
    const merged: StaffUser = {
        ...user,
        timestamp: now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        date: now.toISOString().split("T")[0],
    };
    if (idx >= 0) list[idx] = merged;
    else list.unshift(merged);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return merged;
}

export function deleteStaffUser(id: string): void {
    const list = getStaffUsers().filter((u) => u.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function authenticateStaff(username: string, password: string): StaffUser | null {
    const u = getStaffUsers().find((x) => x.username === username);
    if (!u) return null;
    if (!u.isActive) return null;
    if (u.password !== password) return null;
    return u;
}

export function seedDefaultStaffUsers(): void {
    if (typeof window === "undefined") return;
    const existing = getStaffUsers();
    if (existing.length > 0) return;

    const now = new Date();
    const mk = (p: Omit<StaffUser, "timestamp" | "date">): StaffUser => ({
        ...p,
        timestamp: now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        date: now.toISOString().split("T")[0],
    });

    const users: StaffUser[] = [
        mk({
            id: crypto.randomUUID(),
            username: "admin",
            password: "admin123",
            name: "Administrator",
            nipNik: "-",
            instansi: "Diskominfo Makassar",
            role: "admin",
            orgUnitId: null,
            whatsapp: "-",
            isActive: true,
        }),
        mk({
            id: crypto.randomUUID(),
            username: "resepsionis",
            password: "reseps123",
            name: "Resepsionis UPT Warroom",
            nipNik: "-",
            instansi: "UPT Warroom",
            role: "receptionist",
            orgUnitId: null,
            whatsapp: "08xxxxxxxxxx",
            isActive: true,
        }),
        mk({
            id: crypto.randomUUID(),
            username: "operator-upt",
            password: "op123",
            name: "Operator UPT Warroom",
            nipNik: "-",
            instansi: "UPT Warroom",
            role: "operator",
            orgUnitId: "UPT_WARROOM",
            whatsapp: "08xxxxxxxxxx",
            isActive: true,
        }),
        mk({
            id: crypto.randomUUID(),
            username: "operator-aptika",
            password: "op123",
            name: "Operator Bidang APTIKA",
            nipNik: "-",
            instansi: "Diskominfo Makassar",
            role: "operator",
            orgUnitId: "BIDANG_APTIKA",
            whatsapp: "08xxxxxxxxxx",
            isActive: true,
        }),
    ];

    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

