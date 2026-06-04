"use client";

import { createClientSafeId } from "@/lib/id";

export type OrgUnitType = "root" | "sekretariat" | "subbag" | "bidang" | "upt" | "pool";
export interface OrgUnit { id: string; code: string; name: string; type: OrgUnitType; parentId: string | null; }
export type OrgUnitContactType = "lead" | "backup" | "receptionist" | "kadis";
export interface OrgUnitContact { id: string; orgUnitId: string; contactType: OrgUnitContactType; userId: string | null; nameOverride: string | null; whatsapp: string; }

const ORG_UNITS_KEY = "diskominfo_org_units";
const ORG_CONTACTS_KEY = "diskominfo_org_unit_contacts";

export function getOrgUnits(): OrgUnit[] {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(ORG_UNITS_KEY);
    return raw ? JSON.parse(raw) : [];
}

export function getOrgUnitContacts(): OrgUnitContact[] {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(ORG_CONTACTS_KEY);
    return raw ? JSON.parse(raw) : [];
}

export function getOrgUnitById(id: string): OrgUnit | null { return getOrgUnits().find((u) => u.id === id) || null; }
export function getLeadContact(orgUnitId: string): OrgUnitContact | null { return getOrgUnitContacts().find((c) => c.orgUnitId === orgUnitId && c.contactType === "lead") || null; }
export function getKadisContact(): OrgUnitContact | null { return getOrgUnitContacts().find((c) => c.contactType === "kadis") || null; }

export async function fetchOrgDataFromServer(): Promise<{ units: OrgUnit[]; contacts: OrgUnitContact[] }> {
    const response = await fetch("/api/org-units", { cache: "no-store" });
    if (!response.ok) return { units: [], contacts: [] };
    const data = (await response.json().catch(() => ({}))) as { units?: OrgUnit[]; contacts?: OrgUnitContact[] };
    return { units: Array.isArray(data.units) ? data.units : [], contacts: Array.isArray(data.contacts) ? data.contacts : [] };
}

export async function hydrateOrgDataFromServer(): Promise<void> {
    if (typeof window === "undefined") return;
    const { units, contacts } = await fetchOrgDataFromServer();
    const unitsStr = JSON.stringify(units);
    const contactsStr = JSON.stringify(contacts);
    if (unitsStr !== localStorage.getItem(ORG_UNITS_KEY)) {
        localStorage.setItem(ORG_UNITS_KEY, unitsStr);
    }
    if (contactsStr !== localStorage.getItem(ORG_CONTACTS_KEY)) {
        localStorage.setItem(ORG_CONTACTS_KEY, contactsStr);
    }
}

async function syncOrgData(units: OrgUnit[], contacts: OrgUnitContact[]): Promise<void> {
    const response = await fetch("/api/org-units", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ units, contacts }),
    });
    if (!response.ok) throw new Error("Gagal menyimpan master organisasi.");
    localStorage.setItem(ORG_UNITS_KEY, JSON.stringify(units));
    localStorage.setItem(ORG_CONTACTS_KEY, JSON.stringify(contacts));
}

export async function upsertOrgUnit(unit: OrgUnit): Promise<void> {
    const units = getOrgUnits();
    const idx = units.findIndex((u) => u.id === unit.id);
    if (idx >= 0) units[idx] = unit; else units.push(unit);
    await syncOrgData(units, getOrgUnitContacts());
}

export async function deleteOrgUnit(id: string): Promise<void> {
    const units = getOrgUnits().filter((u) => u.id !== id);
    const contacts = getOrgUnitContacts().filter((c) => c.orgUnitId !== id);
    await syncOrgData(units, contacts);
}

export async function upsertOrgUnitContact(contact: OrgUnitContact): Promise<void> {
    const contacts = getOrgUnitContacts();
    const idx = contacts.findIndex((c) => c.id === contact.id);
    if (idx >= 0) contacts[idx] = contact; else contacts.push(contact);
    await syncOrgData(getOrgUnits(), contacts);
}

export async function seedDefaultOrgStructure(): Promise<void> {
    await hydrateOrgDataFromServer();
}

export function createOrgContactId(): string {
    return createClientSafeId("org-contact");
}
