"use client";

export type OrgUnitType = "root" | "sekretariat" | "subbag" | "bidang" | "upt" | "pool";

export interface OrgUnit {
    id: string; // stable code id, ex: BIDANG_APTIKA
    code: string;
    name: string;
    type: OrgUnitType;
    parentId: string | null;
}

export type OrgUnitContactType = "lead" | "backup" | "receptionist" | "kadis";

export interface OrgUnitContact {
    id: string;
    orgUnitId: string;
    contactType: OrgUnitContactType;
    userId: string | null; // staff user reference (optional in dummy)
    nameOverride: string | null;
    whatsapp: string;
}

const ORG_UNITS_KEY = "diskominfo_org_units";
const ORG_CONTACTS_KEY = "diskominfo_org_unit_contacts";

export function getOrgUnits(): OrgUnit[] {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(ORG_UNITS_KEY);
    return raw ? JSON.parse(raw) : [];
}

export function upsertOrgUnit(unit: OrgUnit): void {
    const list = getOrgUnits();
    const idx = list.findIndex((u) => u.id === unit.id);
    if (idx >= 0) list[idx] = unit;
    else list.push(unit);
    localStorage.setItem(ORG_UNITS_KEY, JSON.stringify(list));
}

export function deleteOrgUnit(id: string): void {
    const list = getOrgUnits().filter((u) => u.id !== id);
    localStorage.setItem(ORG_UNITS_KEY, JSON.stringify(list));
    // Also remove contacts tied to this org unit
    const contacts = getOrgUnitContacts().filter((c) => c.orgUnitId !== id);
    localStorage.setItem(ORG_CONTACTS_KEY, JSON.stringify(contacts));
}

export function getOrgUnitById(id: string): OrgUnit | null {
    return getOrgUnits().find((u) => u.id === id) || null;
}

export function getOrgUnitContacts(): OrgUnitContact[] {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(ORG_CONTACTS_KEY);
    return raw ? JSON.parse(raw) : [];
}

export function upsertOrgUnitContact(contact: OrgUnitContact): void {
    const list = getOrgUnitContacts();
    const idx = list.findIndex((c) => c.id === contact.id);
    if (idx >= 0) list[idx] = contact;
    else list.push(contact);
    localStorage.setItem(ORG_CONTACTS_KEY, JSON.stringify(list));
}

export function getLeadContact(orgUnitId: string): OrgUnitContact | null {
    return getOrgUnitContacts().find((c) => c.orgUnitId === orgUnitId && c.contactType === "lead") || null;
}

export function getKadisContact(): OrgUnitContact | null {
    return getOrgUnitContacts().find((c) => c.contactType === "kadis") || null;
}

export function seedDefaultOrgStructure(): void {
    if (typeof window === "undefined") return;
    const existing = getOrgUnits();
    if (existing.length > 0) return;

    const units: OrgUnit[] = [
        { id: "DISKOMINFO_KOTA_MAKASSAR", code: "DISKOMINFO_KOTA_MAKASSAR", name: "Diskominfo Kota Makassar", type: "root", parentId: null },

        { id: "SEKRETARIAT", code: "SEKRETARIAT", name: "Sekretariat", type: "sekretariat", parentId: "DISKOMINFO_KOTA_MAKASSAR" },
        { id: "SUBBAG_PERENCANAAN_PELAPORAN", code: "SUBBAG_PERENCANAAN_PELAPORAN", name: "Subbagian Perencanaan dan Pelaporan", type: "subbag", parentId: "SEKRETARIAT" },
        { id: "SUBBAG_KEUANGAN", code: "SUBBAG_KEUANGAN", name: "Subbagian Keuangan", type: "subbag", parentId: "SEKRETARIAT" },
        { id: "SUBBAG_UMUM_KEPEGAWAIAN", code: "SUBBAG_UMUM_KEPEGAWAIAN", name: "Subbagian Umum dan Kepegawaian", type: "subbag", parentId: "SEKRETARIAT" },

        { id: "BIDANG_IKP", code: "BIDANG_IKP", name: "Bidang IKP (Humas, Informasi, Komunikasi Publik)", type: "bidang", parentId: "DISKOMINFO_KOTA_MAKASSAR" },
        { id: "BIDANG_APTIKA", code: "BIDANG_APTIKA", name: "Bidang APTIKA (Aplikasi Informatika)", type: "bidang", parentId: "DISKOMINFO_KOTA_MAKASSAR" },
        { id: "BIDANG_PDE_STATISTIK", code: "BIDANG_PDE_STATISTIK", name: "Bidang Pengolahan Data Elektronik dan Statistik", type: "bidang", parentId: "DISKOMINFO_KOTA_MAKASSAR" },
        { id: "BIDANG_PERSANDIAN_KEAMANAN", code: "BIDANG_PERSANDIAN_KEAMANAN", name: "Bidang Persandian dan Keamanan Informasi", type: "bidang", parentId: "DISKOMINFO_KOTA_MAKASSAR" },

        { id: "UPT_WARROOM", code: "UPT_WARROOM", name: "UPT Warroom", type: "upt", parentId: null },

        { id: "JABATAN_FUNGSIONAL_PELAKSANA", code: "JABATAN_FUNGSIONAL_PELAKSANA", name: "Kelompok Jabatan Fungsional dan Pelaksana", type: "pool", parentId: "DISKOMINFO_KOTA_MAKASSAR" },
    ];

    localStorage.setItem(ORG_UNITS_KEY, JSON.stringify(units));

    const contacts: OrgUnitContact[] = [
        // Global: Kepala Dinas
        {
            id: crypto.randomUUID(),
            orgUnitId: "DISKOMINFO_KOTA_MAKASSAR",
            contactType: "kadis",
            userId: null,
            nameOverride: "Kepala Dinas",
            whatsapp: "08xxxxxxxxxx",
        },
        {
            id: crypto.randomUUID(),
            orgUnitId: "UPT_WARROOM",
            contactType: "lead",
            userId: null,
            nameOverride: "Koordinator UPT Warroom",
            whatsapp: "08xxxxxxxxxx",
        },
        {
            id: crypto.randomUUID(),
            orgUnitId: "BIDANG_APTIKA",
            contactType: "lead",
            userId: null,
            nameOverride: "Kepala Bidang APTIKA",
            whatsapp: "08xxxxxxxxxx",
        },
    ];

    localStorage.setItem(ORG_CONTACTS_KEY, JSON.stringify(contacts));
}

