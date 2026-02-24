"use client";

import type { StaffRole } from "./staffStore";

export type StaffSession = {
    userId: string;
    role: StaffRole;
};

const SESSION_KEY = "diskominfo_staff_session";

export function getStaffSession(): StaffSession | null {
    if (typeof window === "undefined") return null;
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export function setStaffSession(session: StaffSession): void {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearStaffSession(): void {
    sessionStorage.removeItem(SESSION_KEY);
}

