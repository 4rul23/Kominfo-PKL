"use client";

export type StaffRole = "admin" | "receptionist" | "operator";
export type StaffInstansi = "Diskominfo Makassar" | "UPT Warroom";

export interface StaffUser {
    id: string;
    username: string;
    name: string;
    nipNik: string;
    instansi: StaffInstansi;
    role: StaffRole;
    orgUnitId: string | null;
    whatsapp: string;
    isActive: boolean;
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

export async function fetchStaffUsersFromServer(): Promise<StaffUser[]> {
    const response = await fetch("/api/staff-users", { cache: "no-store" });
    if (!response.ok) return [];
    const data = (await response.json().catch(() => ({}))) as { users?: StaffUser[] };
    return Array.isArray(data.users) ? data.users : [];
}

export async function hydrateStaffUsersFromServer(): Promise<void> {
    if (typeof window === "undefined") return;
    const users = await fetchStaffUsersFromServer();
    const str = JSON.stringify(users);
    if (str !== localStorage.getItem(STORAGE_KEY)) {
        localStorage.setItem(STORAGE_KEY, str);
    }
}

export async function upsertStaffUser(user: Omit<StaffUser, "timestamp" | "date">): Promise<StaffUser> {
    const hasExisting = Boolean(user.id && getStaffUserById(user.id));
    const response = await fetch("/api/staff-users", {
        method: hasExisting ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
    });
    const data = (await response.json().catch(() => ({}))) as { user?: StaffUser; message?: string };
    if (!response.ok || !data.user) throw new Error(data.message || "Gagal menyimpan user.");
    const list = getStaffUsers().filter((u) => u.id !== data.user!.id);
    list.unshift(data.user);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return data.user;
}

export async function deleteStaffUser(id: string): Promise<void> {
    const response = await fetch(`/api/staff-users?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Gagal menghapus user.");
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getStaffUsers().filter((u) => u.id !== id)));
}

export function authenticateStaff(): StaffUser | null { return null; }
export async function seedDefaultStaffUsers(): Promise<void> {
    await hydrateStaffUsersFromServer();
}
