"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    addCaseEvent,
    assignCase,
    getCaseById,
    getCaseEvents,
    getRelatedSurat,
    getRelatedVisitor,
    setCaseStatus,
    type CaseItem,
    type CaseStatus,
} from "@/lib/caseStore";
import { getOrgUnits, getLeadContact, getKadisContact } from "@/lib/orgUnitStore";
import { getStaffSession } from "@/lib/staffSession";
import { getStaffUserById, getStaffUsers, type StaffUser } from "@/lib/staffStore";
import { buildWaMeLink } from "@/lib/whatsapp";
import { addWebNotification } from "@/lib/webNotificationStore";

const Icons = {
    back: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>,
    wa: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5A8.48 8.48 0 0 1 21 11v.5z" /></svg>,
};

function shortId(id: string) {
    return id.split("-")[0].toUpperCase();
}

function badge(status: string) {
    const map: Record<string, string> = {
        new: "bg-slate-100 text-slate-600",
        triaged: "bg-blue-50 text-blue-700",
        assigned: "bg-amber-50 text-amber-700",
        acknowledged: "bg-indigo-50 text-indigo-700",
        in_progress: "bg-amber-50 text-amber-700",
        escalated: "bg-red-50 text-red-700",
        closed: "bg-emerald-50 text-emerald-700",
        cancelled: "bg-slate-50 text-slate-400",
    };
    return map[status] || "bg-slate-100 text-slate-600";
}

export default function CaseDetailPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const caseId = params?.id;

    const session = useMemo(() => getStaffSession(), []);
    const currentUser = useMemo(() => (session ? getStaffUserById(session.userId) : null), [session]);

    const [item, setItem] = useState<CaseItem | null>(null);
    const [events, setEvents] = useState<any[]>([]);
    const [users, setUsers] = useState<StaffUser[]>([]);
    const [note, setNote] = useState("");
    const [statusNext, setStatusNext] = useState<CaseStatus | "">("");

    const [orgUnitId, setOrgUnitId] = useState("");
    const [operatorId, setOperatorId] = useState("");
    const [priority, setPriority] = useState<"normal" | "high" | "urgent">("normal");

    const orgUnits = useMemo(() => getOrgUnits(), []);

    const orgLabel = (id: string | null) => {
        if (!id) return "-";
        return orgUnits.find((u) => u.id === id)?.name || id;
    };

    const load = () => {
        if (!caseId) return;
        const c = getCaseById(caseId);
        setItem(c);
        setEvents(getCaseEvents(caseId));
        setUsers(getStaffUsers());
        if (c) {
            setOrgUnitId(c.orgUnitId || "");
            setOperatorId(c.assignedToUserId || "");
            setPriority(c.priority);
        }
    };

    useEffect(() => {
        load();
        const i = setInterval(load, 30000);
        return () => clearInterval(i);
    }, [caseId]);

    const relatedVisitor = useMemo(() => (item ? getRelatedVisitor(item) : null), [item]);
    const relatedSurat = useMemo(() => (item ? getRelatedSurat(item) : null), [item]);

    const isReceptionOrAdmin = currentUser?.role === "admin" || currentUser?.role === "receptionist";
    const isOperator = currentUser?.role === "operator";
    const operatorCanAct = isOperator && item?.assignedToUserId === currentUser?.id;

    const operatorOptions = useMemo(() => {
        const ops = users.filter((u) => u.role === "operator" && u.isActive);
        if (!orgUnitId) return ops;
        return ops.filter((u) => (u.orgUnitId || "") === orgUnitId);
    }, [users, orgUnitId]);

    if (!caseId) return null;

    if (!item) {
        return (
            <div className="space-y-4">
                <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-xs font-bold text-[#505F79] bg-white border-2 border-gray-200 rounded-2xl px-4 py-2 hover:border-[#009FA9] hover:text-[#009FA9] transition-all">
                    {Icons.back}
                    Kembali
                </button>
                <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
                    <p className="text-sm font-bold text-slate-800">Case tidak ditemukan</p>
                    <p className="text-sm text-slate-500 mt-1">ID: <span className="font-mono">{caseId}</span></p>
                </div>
            </div>
        );
    }

    const assignedUser = item.assignedToUserId ? users.find((u) => u.id === item.assignedToUserId) : null;

    const baseMessage = () => {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const link = `${origin}/admin/cases/${item.id}`;
        const lines: string[] = [];
        lines.push(`[GUESTBOOK] Case ${shortId(item.id)}`);
        lines.push(`Jenis: ${item.caseType}`);
        lines.push(`Unit: ${item.unitTujuan === "UPT_WARROOM" ? "UPT Warroom" : "Diskominfo"}`);
        if (item.orgUnitId) lines.push(`Org Unit: ${orgLabel(item.orgUnitId)}`);
        if (relatedVisitor) {
            lines.push(`Nama: ${relatedVisitor.name}`);
            lines.push(`Instansi: ${relatedVisitor.organization}`);
            lines.push(`NIP/NIK: ${relatedVisitor.nip}`);
            lines.push(`Keperluan: ${relatedVisitor.purpose}`);
        }
        if (relatedSurat) {
            lines.push(`Perihal: ${relatedSurat.perihal}`);
            lines.push(`Pengirim: ${relatedSurat.namaPengirim} (${relatedSurat.instansiPengirim})`);
            lines.push(`Tracking: ${relatedSurat.trackingId}`);
        }
        lines.push(`Link: ${link}`);
        return lines.join("\n");
    };

    const handleAssign = () => {
        if (!currentUser) return;
        if (!orgUnitId || !operatorId) return;
        const updated = assignCase({
            caseId: item.id,
            actorUserId: currentUser.id,
            orgUnitId,
            assignedToUserId: operatorId,
            priority,
        });
        if (updated) {
            const op = users.find((u) => u.id === operatorId);
            addWebNotification({
                toUserId: operatorId,
                type: "task_assigned",
                title: `Tugas baru: Case ${shortId(item.id)}`,
                body: `${item.caseType} • ${orgLabel(orgUnitId)}\n${item.subject}`,
                link: `/admin/cases/${item.id}`,
            });
            // Optional: notify receptionist too (assignment happened)
            users.filter((u) => u.role === "receptionist").forEach((r) => {
                addWebNotification({
                    toUserId: r.id,
                    type: "status_update",
                    title: `Assigned: Case ${shortId(item.id)}`,
                    body: `Ke operator: ${op?.name || "-"}`,
                    link: `/admin/cases/${item.id}`,
                });
            });
        }
        load();
    };

    const handleNotifyOperator = () => {
        const op = operatorId ? users.find((u) => u.id === operatorId) : null;
        if (!op) return;
        const href = buildWaMeLink(op.whatsapp, baseMessage());
        if (!href) return;
        window.open(href, "_blank", "noreferrer");
        addCaseEvent({ caseId: item.id, actorUserId: currentUser?.id || null, eventType: "contacted", payloadJson: { to: "operator", userId: op.id } });
        load();
    };

    const handleEscalateLead = () => {
        if (!item.orgUnitId) return;
        const lead = getLeadContact(item.orgUnitId);
        if (!lead) return;
        const href = buildWaMeLink(lead.whatsapp, `${baseMessage()}\n\n[Eskalasi] Mohon arahan/koordinasi.`);
        if (!href) return;
        window.open(href, "_blank", "noreferrer");
        addCaseEvent({ caseId: item.id, actorUserId: currentUser?.id || null, eventType: "contacted", payloadJson: { to: "lead", orgUnitId: item.orgUnitId } });
        users.filter((u) => u.role === "receptionist").forEach((r) => {
            addWebNotification({
                toUserId: r.id,
                type: "escalation",
                title: `Eskalasi lead: Case ${shortId(item.id)}`,
                body: orgLabel(item.orgUnitId),
                link: `/admin/cases/${item.id}`,
            });
        });
        load();
    };

    const handleEscalateKadis = () => {
        const kadis = getKadisContact();
        if (!kadis) return;
        const href = buildWaMeLink(kadis.whatsapp, `${baseMessage()}\n\n[Eskalasi] Mohon arahan Kepala Dinas.`);
        if (!href) return;
        window.open(href, "_blank", "noreferrer");
        addCaseEvent({ caseId: item.id, actorUserId: currentUser?.id || null, eventType: "contacted", payloadJson: { to: "kadis" } });
        users.filter((u) => u.role === "receptionist").forEach((r) => {
            addWebNotification({
                toUserId: r.id,
                type: "escalation",
                title: `Eskalasi kadis: Case ${shortId(item.id)}`,
                body: orgLabel(item.orgUnitId),
                link: `/admin/cases/${item.id}`,
            });
        });
        load();
    };

    const handleAddNote = () => {
        if (!note.trim()) return;
        addCaseEvent({ caseId: item.id, actorUserId: currentUser?.id || null, eventType: "note_added", payloadJson: { note: note.trim() } });
        // Notify receptionist/admin of operator note.
        users.filter((u) => u.role === "receptionist" || u.role === "admin").forEach((r) => {
            if (currentUser?.id === r.id) return;
            addWebNotification({
                toUserId: r.id,
                type: "note",
                title: `Catatan baru: Case ${shortId(item.id)}`,
                body: note.trim().slice(0, 200),
                link: `/admin/cases/${item.id}`,
            });
        });
        setNote("");
        load();
    };

    const handleStatusChange = () => {
        if (!statusNext) return;
        const updated = setCaseStatus(item.id, currentUser?.id || null, statusNext);
        if (!updated) return;
        // Notify receptionist/admin when operator updates status.
        users.filter((u) => u.role === "receptionist" || u.role === "admin").forEach((r) => {
            if (currentUser?.id === r.id) return;
            addWebNotification({
                toUserId: r.id,
                type: "status_update",
                title: `Status update: Case ${shortId(item.id)}`,
                body: `Status: ${updated.status}`,
                link: `/admin/cases/${item.id}`,
            });
        });
        setStatusNext("");
        load();
    };

    const canEditAssignment = isReceptionOrAdmin;
    const canUpdateStatus = (isReceptionOrAdmin || operatorCanAct);

    const statusOptions: CaseStatus[] = ["acknowledged", "in_progress", "escalated", "closed", "cancelled"];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-xs font-bold text-[#505F79] bg-white border-2 border-gray-200 rounded-2xl px-4 py-2 hover:border-[#009FA9] hover:text-[#009FA9] transition-all">
                    {Icons.back}
                    Kembali
                </button>
                <div className="flex items-center gap-2 flex-wrap">
                    <Link href="/admin/directory" className="px-4 py-2 text-xs font-bold text-[#505F79] bg-white border-2 border-gray-200 rounded-2xl hover:border-[#009FA9] hover:text-[#009FA9] transition-all">Direktori</Link>
                    <Link href="/admin/intake" className="px-4 py-2 text-xs font-bold text-[#505F79] bg-white border-2 border-gray-200 rounded-2xl hover:border-[#009FA9] hover:text-[#009FA9] transition-all">Intake</Link>
                    <Link href="/admin/inbox" className="px-4 py-2 text-xs font-bold text-[#505F79] bg-white border-2 border-gray-200 rounded-2xl hover:border-[#009FA9] hover:text-[#009FA9] transition-all">Inbox</Link>
                </div>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                        <p className="text-xs text-slate-400 font-mono">CASE {shortId(item.id)}</p>
                        <h2 className="text-xl font-extrabold text-slate-800 tracking-tight mt-1">{item.subject}</h2>
                        <p className="text-sm text-slate-500 mt-1">{item.description}</p>
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                            <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded-lg border border-slate-200 ${badge(item.status)}`}>{item.status}</span>
                            <span className="inline-block px-2 py-0.5 text-xs font-bold rounded-lg border border-slate-200 bg-slate-50 text-slate-600">{item.priority}</span>
                            <span className="inline-block px-2 py-0.5 text-xs font-bold rounded-lg border border-slate-200 bg-slate-50 text-slate-600">{item.unitTujuan === "UPT_WARROOM" ? "UPT Warroom" : "Diskominfo"}</span>
                            <span className="inline-block px-2 py-0.5 text-xs font-bold rounded-lg border border-slate-200 bg-slate-50 text-slate-600">{orgLabel(item.orgUnitId)}</span>
                        </div>
                    </div>

                    <div className="w-full sm:w-[340px]">
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Assignment</p>
                            <div className="mt-3 grid grid-cols-1 gap-2">
                                <select disabled={!canEditAssignment} value={orgUnitId} onChange={(e) => { setOrgUnitId(e.target.value); setOperatorId(""); }} className="px-3 py-2 bg-white border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#009FA9] disabled:opacity-70">
                                    <option value="">Pilih Org Unit...</option>
                                    {(item.unitTujuan === "UPT_WARROOM"
                                        ? orgUnits.filter((u) => u.id === "UPT_WARROOM")
                                        : orgUnits.filter((u) => ["bidang", "subbag", "sekretariat", "pool"].includes(u.type))
                                    ).map((u) => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                                <select disabled={!canEditAssignment} value={operatorId} onChange={(e) => setOperatorId(e.target.value)} className="px-3 py-2 bg-white border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#009FA9] disabled:opacity-70">
                                    <option value="">Pilih Operator...</option>
                                    {operatorOptions.map((u) => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                                <select disabled={!canEditAssignment} value={priority} onChange={(e) => setPriority(e.target.value as any)} className="px-3 py-2 bg-white border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#009FA9] disabled:opacity-70">
                                    <option value="normal">normal</option>
                                    <option value="high">high</option>
                                    <option value="urgent">urgent</option>
                                </select>
                                <button
                                    disabled={!canEditAssignment || !orgUnitId || !operatorId}
                                    onClick={handleAssign}
                                    className="px-4 py-3 text-xs font-bold text-white bg-[#009FA9] rounded-2xl hover:shadow-xl hover:-translate-y-0.5 transition-all shadow-lg shadow-[#009FA9]/20 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    Assign Operator
                                </button>
                                <button
                                    disabled={!canEditAssignment || !operatorId}
                                    onClick={handleNotifyOperator}
                                    className="inline-flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold text-white bg-[#36B37E] rounded-2xl hover:shadow-xl hover:-translate-y-0.5 transition-all shadow-lg shadow-[#36B37E]/20 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {Icons.wa}
                                    Notify via WhatsApp
                                </button>
                            </div>
                            <div className="mt-3 text-xs text-slate-500">
                                Assigned to: <span className="font-semibold text-slate-700">{assignedUser?.name || "-"}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {isOperator && !operatorCanAct && (
                    <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-800">
                        Kamu login sebagai operator, tapi case ini bukan ditugaskan ke akun kamu. Halaman ini hanya read-only.
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                        <p className="text-sm font-bold text-slate-800">Detail Data</p>
                        {relatedVisitor && (
                            <div className="mt-3 text-sm text-slate-700 space-y-1">
                                <p><span className="text-slate-500">Nama:</span> {relatedVisitor.name}</p>
                                <p><span className="text-slate-500">Instansi:</span> {relatedVisitor.organization}</p>
                                <p><span className="text-slate-500">Jabatan:</span> {relatedVisitor.jabatan}</p>
                                <p><span className="text-slate-500">NIP/NIK:</span> <span className="font-mono">{relatedVisitor.nip}</span></p>
                                <p><span className="text-slate-500">Keperluan:</span> {relatedVisitor.purpose}</p>
                                <p><span className="text-slate-500">Asal:</span> {relatedVisitor.asalDaerah} / {relatedVisitor.provinsi}</p>
                            </div>
                        )}
                        {relatedSurat && (
                            <div className="mt-3 text-sm text-slate-700 space-y-1">
                                <p><span className="text-slate-500">Perihal:</span> {relatedSurat.perihal}</p>
                                <p><span className="text-slate-500">Pengirim:</span> {relatedSurat.namaPengirim} ({relatedSurat.instansiPengirim})</p>
                                <p><span className="text-slate-500">Tracking:</span> <span className="font-mono">{relatedSurat.trackingId}</span></p>
                                <p><span className="text-slate-500">Prioritas:</span> {relatedSurat.prioritas}</p>
                            </div>
                        )}
                        {!relatedVisitor && !relatedSurat && (
                            <p className="text-sm text-slate-500 mt-3">No related data.</p>
                        )}
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                        <p className="text-sm font-bold text-slate-800">Aksi Operator</p>
                        <div className="mt-3 grid grid-cols-1 gap-2">
                            <div className="flex gap-2">
                                <select disabled={!canUpdateStatus} value={statusNext} onChange={(e) => setStatusNext(e.target.value as any)} className="flex-1 px-3 py-2 bg-white border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#009FA9] disabled:opacity-70">
                                    <option value="">Ubah status...</option>
                                    {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <button disabled={!canUpdateStatus || !statusNext} onClick={handleStatusChange} className="px-4 py-2 text-xs font-bold text-white bg-[#009FA9] rounded-2xl disabled:opacity-60 disabled:cursor-not-allowed">
                                    Update
                                </button>
                            </div>

                            <div className="flex gap-2 flex-wrap">
                                <button
                                    disabled={!canUpdateStatus || !item.orgUnitId || !getLeadContact(item.orgUnitId)}
                                    onClick={handleEscalateLead}
                                    className="inline-flex items-center gap-2 px-4 py-3 text-xs font-bold text-white bg-[#36B37E] rounded-2xl hover:shadow-xl hover:-translate-y-0.5 transition-all shadow-lg shadow-[#36B37E]/20 disabled:opacity-60 disabled:cursor-not-allowed"
                                    title={!item.orgUnitId ? "Org Unit belum ditentukan" : !getLeadContact(item.orgUnitId) ? "Lead contact belum diset" : "Eskalasi ke lead"}
                                >
                                    {Icons.wa}
                                    Eskalasi Lead
                                </button>
                                <button
                                    disabled={!canUpdateStatus || !getKadisContact()}
                                    onClick={handleEscalateKadis}
                                    className="inline-flex items-center gap-2 px-4 py-3 text-xs font-bold text-white bg-[#991b1b] rounded-2xl hover:shadow-xl hover:-translate-y-0.5 transition-all shadow-lg shadow-[#991b1b]/20 disabled:opacity-60 disabled:cursor-not-allowed"
                                    title={!getKadisContact() ? "Kontak Kepala Dinas belum diset" : "Eskalasi ke Kepala Dinas"}
                                >
                                    {Icons.wa}
                                    Eskalasi Kadis
                                </button>
                            </div>

                            <div className="mt-2">
                                <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Tambah catatan..." className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#009FA9] min-h-[90px]" />
                                <div className="mt-2 flex justify-end">
                                    <button disabled={!note.trim()} onClick={handleAddNote} className="px-4 py-2 text-xs font-bold text-[#505F79] bg-white border-2 border-gray-200 rounded-2xl hover:border-[#009FA9] hover:text-[#009FA9] transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                                        Simpan Catatan
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                    <p className="text-sm font-bold text-slate-800">Audit Trail</p>
                    <p className="text-xs text-slate-400 mt-1">Semua aksi dicatat sebagai event (dummy localStorage)</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 text-left border-b border-slate-100">
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-44">Waktu</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Event</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actor</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Payload</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {events.length === 0 ? (
                                <tr><td colSpan={4} className="px-4 py-12 text-center text-slate-400 text-sm">Belum ada event</td></tr>
                            ) : (
                                events.map((e: any) => {
                                    const actor = e.actorUserId ? users.find((u) => u.id === e.actorUserId) : null;
                                    return (
                                        <tr key={e.id} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3 text-sm text-slate-500 font-mono">{new Date(e.createdAt).toLocaleString("id-ID", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                                            <td className="px-4 py-3 text-sm text-slate-700 font-semibold">{e.eventType}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{actor?.name || "-"}</td>
                                            <td className="px-4 py-3 text-xs text-slate-500 font-mono whitespace-pre-wrap">{JSON.stringify(e.payloadJson)}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
