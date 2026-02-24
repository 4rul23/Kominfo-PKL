"use client";

import { getSuratById, type SuratElektronik } from "./suratStore";
import { getVisitors, type Visitor } from "./visitorStore";

export type CaseType = "visitor" | "surat";
export type CaseStatus = "new" | "triaged" | "assigned" | "acknowledged" | "in_progress" | "escalated" | "closed" | "cancelled";
export type CasePriority = "normal" | "high" | "urgent";
export type UnitTujuan = "UPT_WARROOM" | "DISKOMINFO";

export interface CaseItem {
    id: string;
    caseType: CaseType;
    status: CaseStatus;
    priority: CasePriority;
    unitTujuan: UnitTujuan;
    orgUnitId: string | null;
    assignedToUserId: string | null;

    subject: string;
    description: string;
    createdByUserId: string | null;
    source: "walkin" | "register" | "qr" | "whatsapp" | "surat_form";

    relatedVisitorId: string | null;
    relatedSuratId: string | null;

    slaDueAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export type CaseEventType =
    | "created"
    | "triaged"
    | "assigned"
    | "acknowledged"
    | "status_changed"
    | "escalated"
    | "closed"
    | "cancelled"
    | "note_added"
    | "contacted";

export interface CaseEvent {
    id: string;
    caseId: string;
    actorUserId: string | null;
    eventType: CaseEventType;
    payloadJson: Record<string, unknown>;
    createdAt: string;
}

const CASES_KEY = "diskominfo_cases";
const CASE_EVENTS_KEY = "diskominfo_case_events";

export function getCases(): CaseItem[] {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(CASES_KEY);
    return raw ? JSON.parse(raw) : [];
}

export function getCaseById(id: string): CaseItem | null {
    return getCases().find((c) => c.id === id) || null;
}

export function getCaseByRelatedVisitorId(visitorId: string): CaseItem | null {
    return getCases().find((c) => c.relatedVisitorId === visitorId) || null;
}

export function getCaseByRelatedSuratId(suratId: string): CaseItem | null {
    return getCases().find((c) => c.relatedSuratId === suratId) || null;
}

export function getCaseEvents(caseId: string): CaseEvent[] {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(CASE_EVENTS_KEY);
    const all: CaseEvent[] = raw ? JSON.parse(raw) : [];
    return all
        .filter((e) => e.caseId === caseId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function writeCases(list: CaseItem[]) {
    localStorage.setItem(CASES_KEY, JSON.stringify(list));
}

function writeEvents(list: CaseEvent[]) {
    localStorage.setItem(CASE_EVENTS_KEY, JSON.stringify(list));
}

export function addCaseEvent(input: Omit<CaseEvent, "id" | "createdAt">): CaseEvent {
    const raw = localStorage.getItem(CASE_EVENTS_KEY);
    const list: CaseEvent[] = raw ? JSON.parse(raw) : [];
    const e: CaseEvent = {
        ...input,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
    };
    list.push(e);
    writeEvents(list);
    return e;
}

export function upsertCase(caseItem: CaseItem): void {
    const list = getCases();
    const idx = list.findIndex((c) => c.id === caseItem.id);
    if (idx >= 0) list[idx] = caseItem;
    else list.unshift(caseItem);
    writeCases(list);
}

export function updateCase(id: string, patch: Partial<CaseItem>): CaseItem | null {
    const list = getCases();
    const idx = list.findIndex((c) => c.id === id);
    if (idx < 0) return null;
    const nowIso = new Date().toISOString();
    const merged: CaseItem = { ...list[idx], ...patch, updatedAt: nowIso };
    list[idx] = merged;
    writeCases(list);
    return merged;
}

function mapVisitorUnitTujuan(visitor: Visitor): UnitTujuan {
    const u = (visitor.unit || "").toLowerCase();
    if (u.includes("warroom")) return "UPT_WARROOM";
    return "DISKOMINFO";
}

export function createCaseFromVisitor(visitor: Visitor): CaseItem {
    const existing = getCases().find((c) => c.relatedVisitorId === visitor.id);
    if (existing) return existing;

    const nowIso = new Date().toISOString();
    const item: CaseItem = {
        id: crypto.randomUUID(),
        caseType: "visitor",
        status: "new",
        priority: "normal",
        unitTujuan: mapVisitorUnitTujuan(visitor),
        orgUnitId: null,
        assignedToUserId: null,
        subject: `Kunjungan: ${visitor.name}`,
        description: visitor.purpose || "-",
        createdByUserId: null,
        source: "register",
        relatedVisitorId: visitor.id,
        relatedSuratId: null,
        slaDueAt: null,
        createdAt: nowIso,
        updatedAt: nowIso,
    };

    upsertCase(item);
    addCaseEvent({ caseId: item.id, actorUserId: null, eventType: "created", payloadJson: { source: item.source }, });
    return item;
}

export function createCaseFromSurat(surat: SuratElektronik): CaseItem {
    const existing = getCases().find((c) => c.relatedSuratId === surat.id);
    if (existing) return existing;

    const nowIso = new Date().toISOString();
    const item: CaseItem = {
        id: crypto.randomUUID(),
        caseType: "surat",
        status: "new",
        priority: surat.prioritas === "tinggi" ? "high" : "normal",
        unitTujuan: "DISKOMINFO",
        orgUnitId: null,
        assignedToUserId: null,
        subject: `Surat: ${surat.perihal}`,
        description: `${surat.instansiPengirim} • ${surat.namaPengirim}`,
        createdByUserId: null,
        source: "surat_form",
        relatedVisitorId: null,
        relatedSuratId: surat.id,
        slaDueAt: surat.slaDeadline || null,
        createdAt: nowIso,
        updatedAt: nowIso,
    };

    upsertCase(item);
    addCaseEvent({ caseId: item.id, actorUserId: null, eventType: "created", payloadJson: { source: item.source, trackingId: surat.trackingId }, });
    return item;
}

export function syncCasesFromExistingData(): { visitors: number; surat: number } {
    const visitors = getVisitors();
    let createdVisitors = 0;
    visitors.forEach((v) => {
        const exists = getCases().some((c) => c.relatedVisitorId === v.id);
        if (!exists) {
            createCaseFromVisitor(v);
            createdVisitors++;
        }
    });

    const suratList = (() => {
        // Avoid importing getSuratList to keep bundle smaller; infer via ids we can find later.
        // In this project we can still rely on getSuratById if caller provides ids; but sync needs list.
        const raw = localStorage.getItem("diskominfo_surat_elektronik");
        return raw ? (JSON.parse(raw) as SuratElektronik[]) : [];
    })();

    let createdSurat = 0;
    suratList.forEach((s) => {
        const exists = getCases().some((c) => c.relatedSuratId === s.id);
        if (!exists) {
            createCaseFromSurat(s);
            createdSurat++;
        }
    });

    return { visitors: createdVisitors, surat: createdSurat };
}

export function canTransition(from: CaseStatus, to: CaseStatus): boolean {
    if (from === to) return true;
    const allowed: Record<CaseStatus, CaseStatus[]> = {
        new: ["triaged", "assigned", "cancelled"],
        triaged: ["assigned", "cancelled"],
        assigned: ["acknowledged", "cancelled"],
        acknowledged: ["in_progress", "escalated", "closed", "cancelled"],
        in_progress: ["escalated", "closed", "cancelled"],
        escalated: ["in_progress", "closed", "cancelled"],
        closed: [],
        cancelled: [],
    };
    return allowed[from].includes(to);
}

export function setCaseStatus(caseId: string, actorUserId: string | null, next: CaseStatus, note?: string): CaseItem | null {
    const current = getCaseById(caseId);
    if (!current) return null;
    if (!canTransition(current.status, next)) return null;

    const updated = updateCase(caseId, { status: next });
    if (!updated) return null;
    addCaseEvent({
        caseId,
        actorUserId,
        eventType:
            next === "acknowledged" ? "acknowledged" :
                next === "closed" ? "closed" :
                    next === "cancelled" ? "cancelled" :
                        next === "escalated" ? "escalated" : "status_changed",
        payloadJson: { from: current.status, to: next, note: note || "" },
    });
    return updated;
}

export function assignCase(input: {
    caseId: string;
    actorUserId: string;
    orgUnitId: string;
    assignedToUserId: string;
    priority?: CasePriority;
}): CaseItem | null {
    const current = getCaseById(input.caseId);
    if (!current) return null;

    const nextStatus: CaseStatus = current.status === "new" ? "assigned" : "assigned";
    const updated = updateCase(input.caseId, {
        orgUnitId: input.orgUnitId,
        assignedToUserId: input.assignedToUserId,
        priority: input.priority || current.priority,
        status: nextStatus,
    });
    if (!updated) return null;
    addCaseEvent({
        caseId: input.caseId,
        actorUserId: input.actorUserId,
        eventType: "assigned",
        payloadJson: { orgUnitId: input.orgUnitId, assignedToUserId: input.assignedToUserId, priority: updated.priority },
    });
    return updated;
}

export function getRelatedVisitor(caseItem: CaseItem): Visitor | null {
    if (!caseItem.relatedVisitorId) return null;
    return getVisitors().find((v) => v.id === caseItem.relatedVisitorId) || null;
}

export function getRelatedSurat(caseItem: CaseItem): SuratElektronik | null {
    if (!caseItem.relatedSuratId) return null;
    return getSuratById(caseItem.relatedSuratId);
}
