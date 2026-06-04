"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    addCaseEvent,
    assignCase,
    hydrateCasesFromServer,
    getCaseById,
    getCaseEvents,
    getRelatedSurat,
    getRelatedVisitor,
    setCaseStatus,
    type CaseItem,
    type CaseStatus,
} from "@/lib/caseStore";
import { fetchOrgDataFromServer, getOrgUnits, hydrateOrgDataFromServer } from "@/lib/orgUnitStore";
import { getStaffSession } from "@/lib/staffSession";
import { fetchStaffUsersFromServer, getStaffUserById, getStaffUsers, hydrateStaffUsersFromServer, type StaffUser } from "@/lib/staffStore";
import { type Visitor } from "@/lib/visitorStore";
import { getVisitorStatusLabel } from "@/lib/visitorWorkflow";
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
    const [users, setUsers] = useState<StaffUser[]>([]);
    const [orgUnits, setOrgUnits] = useState(() => getOrgUnits());
    const currentUser = useMemo(() => (session ? users.find((u) => u.id === session.userId) || getStaffUserById(session.userId) : null), [session, users]);

    const [item, setItem] = useState<CaseItem | null>(null);
    const [events, setEvents] = useState<any[]>([]);
    const [note, setNote] = useState("");
    const [statusNext, setStatusNext] = useState<CaseStatus | "">("");
    const [relatedSurat, setRelatedSurat] = useState<any | null>(null);

    const [orgUnitId, setOrgUnitId] = useState("");
    const [operatorId, setOperatorId] = useState("");
    const [priority, setPriority] = useState<"normal" | "high" | "urgent">("normal");

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
        const boot = async () => {
            const [staffUsers, orgData] = await Promise.all([
                fetchStaffUsersFromServer(),
                fetchOrgDataFromServer(),
                hydrateStaffUsersFromServer(),
                hydrateOrgDataFromServer(),
            ]);
            setUsers(staffUsers);
            setOrgUnits(orgData.units);
            await hydrateCasesFromServer();
            load();
        };
        void boot();
        const i = setInterval(() => {
            void hydrateCasesFromServer().then(() => {
                if (!caseId) return;
                const c = getCaseById(caseId);
                const evs = getCaseEvents(caseId);
                setItem((prev) => (prev?.id === c?.id && prev?.updatedAt === c?.updatedAt ? prev : c));
                setEvents((prev) => (prev.length === evs.length ? prev : evs));
            });
        }, 60000);
        return () => clearInterval(i);
    }, [caseId]);

    const [relatedVisitor, setRelatedVisitor] = useState<Visitor | null>(null);

    useEffect(() => {
        const loadDocs = async () => {
            if (item) {
                const [visitor, surat] = await Promise.all([
                    getRelatedVisitor(item),
                    getRelatedSurat(item)
                ]);
                setRelatedVisitor(visitor);
                setRelatedSurat(surat);
            } else {
                setRelatedVisitor(null);
                setRelatedSurat(null);
            }
        };
        void loadDocs();
    }, [item]);

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
            if (relatedVisitor) {
                void fetch("/api/visitors/transition", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        visitorId: relatedVisitor.id,
                        caseId: item.id,
                        toStatus: "forwarded_to_unit",
                        note: `Kunjungan diteruskan ke ${orgLabel(orgUnitId)} oleh resepsionis.`,
                        orgUnitId,
                        orgUnitName: orgLabel(orgUnitId),
                        assignedOperatorName: op?.name || null,
                    }),
                });
            }
            void addWebNotification({
                toUserId: operatorId,
                type: "task_assigned",
                title: `Kunjungan diteruskan: ${shortId(item.id)}`,
                body: `Resepsionis meneruskan kunjungan ke ${orgLabel(orgUnitId)}.\n${item.subject}`,
                link: `/admin/cases/${item.id}`,
            });
            users.filter((u) => u.role === "receptionist").forEach((r) => {
                void addWebNotification({
                    toUserId: r.id,
                    type: "status_update",
                    title: `Kunjungan diteruskan ke ${orgLabel(orgUnitId)}`,
                    body: `PIC bidang: ${op?.name || "-"}`,
                    link: `/admin/cases/${item.id}`,
                });
            });
        }
        load();
    };

    const handleVisitorDecision = async (decision: "accepted_by_unit" | "rejected_by_unit") => {
        if (!relatedVisitor || !currentUser) return;
        if (decision === "rejected_by_unit" && !window.confirm("Apakah Anda yakin ingin MENOLAK kunjungan ini? Aksi ini tidak dapat dibatalkan.")) return;
        const noteText = note.trim() || (decision === "accepted_by_unit" ? "Kunjungan disetujui oleh bidang tujuan." : "Kunjungan tidak dapat diterima oleh bidang tujuan.");
        await fetch("/api/visitors/transition", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                visitorId: relatedVisitor.id,
                caseId: item.id,
                toStatus: decision,
                note: noteText,
                orgUnitId: item.orgUnitId,
                orgUnitName: orgLabel(item.orgUnitId),
                assignedOperatorName: currentUser.name,
            }),
        });

        setCaseStatus(item.id, currentUser.id, decision === "accepted_by_unit" ? "closed" : "cancelled", noteText);
        users.filter((u) => u.role === "receptionist" || u.role === "admin").forEach((r) => {
            if (r.id === currentUser.id) return;
            void addWebNotification({
                toUserId: r.id,
                type: decision === "accepted_by_unit" ? "status_update" : "escalation",
                title: decision === "accepted_by_unit"
                    ? `Bidang menerima kunjungan: ${shortId(item.id)}`
                    : `Bidang menolak kunjungan: ${shortId(item.id)}`,
                body: noteText,
                link: `/admin/cases/${item.id}`,
            });
        });
        setNote("");
        load();
    };

    const handleReceptionistAccept = async () => {
        if (!relatedVisitor || !currentUser) return;
        const noteText = note.trim() || "Kunjungan diterima langsung oleh resepsionis/admin tanpa diteruskan ke bidang.";
        await fetch("/api/visitors/transition", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                visitorId: relatedVisitor.id,
                caseId: item.id,
                toStatus: "accepted_by_unit",
                note: noteText,
                assignedOperatorName: currentUser.name,
            }),
        });

        setCaseStatus(item.id, currentUser.id, "closed", noteText);
        users.filter((u) => u.role === "receptionist" || u.role === "admin").forEach((r) => {
            if (r.id === currentUser.id) return;
            void addWebNotification({
                toUserId: r.id,
                type: "status_update",
                title: `Kunjungan diterima langsung: ${shortId(item.id)}`,
                body: noteText,
                link: `/admin/cases/${item.id}`,
            });
        });
        setNote("");
        load();
    };
    const handleNotifyOperator = () => {
        const op = operatorId ? users.find((u) => u.id === operatorId) : null;
        if (!op) return;

        void addWebNotification({
            toUserId: op.id,
            type: "task_assigned",
            title: `Ping: Cek Case ${shortId(item.id)}`,
            body: `Mohon segera cek dan tindak lanjuti case ini.\n${item.subject}`,
            link: `/admin/cases/${item.id}`,
        });

        addCaseEvent({ caseId: item.id, actorUserId: currentUser?.id || null, eventType: "contacted", payloadJson: { to: "operator_web", userId: op.id } });
        load();
    };

    const handleAddNote = () => {
        if (!note.trim()) return;
        addCaseEvent({ caseId: item.id, actorUserId: currentUser?.id || null, eventType: "note_added", payloadJson: { note: note.trim() } });
        // Notify receptionist/admin of operator note.
        users.filter((u) => u.role === "receptionist" || u.role === "admin").forEach((r) => {
            if (currentUser?.id === r.id) return;
            void addWebNotification({
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
            void addWebNotification({
                toUserId: r.id,
                type: "status_update",
                title: `Pembaruan status: Tiket ${shortId(item.id)}`,
                body: `Status baru: ${updated.status}`,
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
                        <p className="text-xs text-slate-400 font-mono">TIKET {shortId(item.id)}</p>
                        <h2 className="text-xl font-extrabold text-slate-800 tracking-tight mt-1">{item.subject}</h2>
                        <p className="text-sm text-slate-500 mt-1">{item.description}</p>
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                            <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded-lg border border-slate-200 ${badge(item.status)}`}>{item.status}</span>
                            <span className="inline-block px-2 py-0.5 text-xs font-bold rounded-lg border border-slate-200 bg-slate-50 text-slate-600">{item.unitTujuan === "UPT_WARROOM" ? "UPT Warroom" : "Diskominfo"}</span>
                            <span className="inline-block px-2 py-0.5 text-xs font-bold rounded-lg border border-slate-200 bg-slate-50 text-slate-600">{orgLabel(item.orgUnitId)}</span>
                        </div>
                    </div>

                    <div className="w-full sm:w-[340px]">
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Tugaskan (Disposisi)</p>
                            <div className="mt-3 grid grid-cols-1 gap-2">
                                <select disabled={!canEditAssignment} value={orgUnitId} onChange={(e) => { setOrgUnitId(e.target.value); setOperatorId(""); }} className="px-3 py-2 bg-white border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#009FA9] disabled:opacity-70">
                                    <option value="">Pilih Bidang/Unit...</option>
                                    {(item.unitTujuan === "UPT_WARROOM"
                                        ? orgUnits.filter((u) => u.id === "UPT_WARROOM")
                                        : orgUnits.filter((u) => ["bidang", "subbag", "sekretariat", "pool"].includes(u.type))
                                    ).map((u) => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                                <select disabled={!canEditAssignment} value={operatorId} onChange={(e) => setOperatorId(e.target.value)} className="px-3 py-2 bg-white border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#009FA9] disabled:opacity-70">
                                    <option value="">Pilih Pegawai...</option>
                                    {operatorOptions.map((u) => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                                <button
                                    disabled={!canEditAssignment || !orgUnitId || !operatorId}
                                    onClick={handleAssign}
                                    className="px-4 py-3 text-xs font-bold text-white bg-[#009FA9] rounded-2xl hover:shadow-xl hover:-translate-y-0.5 transition-all shadow-lg shadow-[#009FA9]/20 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    Tugaskan Ke Pegawai
                                </button>
                                <button
                                    disabled={!canEditAssignment || !operatorId}
                                    onClick={handleNotifyOperator}
                                    className="inline-flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold text-[#009FA9] bg-[#009FA9]/10 rounded-2xl hover:bg-[#009FA9]/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                                    Kirim Notifikasi Panggilan
                                </button>
                            </div>
                            <div className="mt-3 text-xs text-slate-500">
                                Ditugaskan kepada: <span className="font-semibold text-slate-700">{assignedUser?.name || "-"}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {isOperator && !operatorCanAct && (
                    <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-800">
                        Anda login sebagai staf divisi, tapi tiket ini bukan ditugaskan ke akun Anda. Halaman ini hanya bisa dilihat (read-only).
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                        <p className="text-sm font-bold text-slate-800">Informasi Detail</p>
                        {relatedVisitor && (
                            <div className="mt-3 text-sm text-slate-700 space-y-1">
                                <p><span className="text-slate-500">Tracking:</span> <span className="font-mono">{relatedVisitor.trackingId}</span></p>
                                <p><span className="text-slate-500">Nama:</span> {relatedVisitor.name}</p>
                                <p><span className="text-slate-500">Instansi:</span> {relatedVisitor.organization}</p>
                                <p><span className="text-slate-500">Jabatan:</span> {relatedVisitor.jabatan}</p>
                                <p><span className="text-slate-500">NIP/NIK:</span> <span className="font-mono">{relatedVisitor.nip}</span></p>
                                <p><span className="text-slate-500">Keperluan:</span> {relatedVisitor.purpose}</p>
                                <p><span className="text-slate-500">Asal:</span> {relatedVisitor.asalDaerah} / {relatedVisitor.provinsi}</p>
                                <p><span className="text-slate-500">Status Kunjungan:</span> {getVisitorStatusLabel(relatedVisitor.status)}</p>
                                {relatedVisitor.forwardedOrgUnitName && <p><span className="text-slate-500">Diteruskan ke:</span> {relatedVisitor.forwardedOrgUnitName}</p>}
                                {relatedVisitor.assignedOperatorName && <p><span className="text-slate-500">PIC:</span> {relatedVisitor.assignedOperatorName}</p>}
                                {relatedVisitor.decisionNote && <p><span className="text-slate-500">Catatan Keputusan:</span> {relatedVisitor.decisionNote}</p>}
                                <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Arah Penerusan</p>
                                    <p className="mt-2 text-sm text-slate-700">
                                        Form tamu memilih <span className="font-bold text-[#172B4D]">{relatedVisitor.unit || "-"}</span> sebagai tujuan kunjungan.
                                    </p>
                                    <p className="mt-1 text-sm text-slate-600">
                                        Jika perlu diteruskan, resepsionis memilih <span className="font-bold text-[#172B4D]">Org Unit</span> dan <span className="font-bold text-[#172B4D]">operator bidang</span> di bawah.
                                    </p>
                                </div>
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

                    <div className="bg-white border-2 border-gray-100 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 rounded-full bg-[#009FA9]/10 flex items-center justify-center text-[#009FA9]">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                            </div>
                            <p className="text-lg font-extrabold text-slate-800 tracking-tight">Tindakan Lanjutan (Eksekusi)</p>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 relative overflow-hidden group hover:border-[#009FA9]/30 transition-colors">
                                <div className="absolute top-0 left-0 w-1 h-full bg-[#009FA9]" />
                                <p className="text-sm font-bold text-slate-700 mb-2">Pembaruan Tahap Proses</p>
                                <div className="flex gap-2">
                                    <select disabled={!canUpdateStatus} value={statusNext} onChange={(e) => setStatusNext(e.target.value as any)} className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:border-[#009FA9] focus:ring-4 focus:ring-[#009FA9]/10 transition-all disabled:opacity-70 disabled:bg-slate-50">
                                        <option value="">Pilih progres...</option>
                                        <option value="acknowledged">Sudah Dilihat</option>
                                        <option value="in_progress">Sedang Ditangani</option>
                                        <option value="escalated">Butuh Bantuan Atasan</option>
                                        <option value="closed">Selesai Berhasil</option>
                                        <option value="cancelled">Dihentikan / Batal</option>
                                    </select>
                                    <button disabled={!canUpdateStatus || !statusNext} onClick={handleStatusChange} className="px-6 py-3 text-sm font-bold text-white bg-slate-800 rounded-xl hover:bg-[#009FA9] hover:-translate-y-0.5 transition-all shadow-lg disabled:opacity-50 disabled:hover:translate-y-0 disabled:cursor-not-allowed">
                                        Simpan
                                    </button>
                                </div>
                            </div>

                            {relatedVisitor && (operatorCanAct || isReceptionOrAdmin) && (
                                <div className="space-y-3">
                                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400 pl-1">Keputusan Akhir</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {isReceptionOrAdmin && (
                                            <button
                                                disabled={relatedVisitor.status === "accepted_by_unit" || relatedVisitor.status === "rejected_by_unit"}
                                                onClick={() => void handleReceptionistAccept()}
                                                className="col-span-full px-4 py-3.5 text-sm font-extrabold text-white bg-gradient-to-r from-[#009FA9] to-[#04b4c0] rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all disabled:opacity-50 disabled:grayscale disabled:hover:scale-100"
                                            >
                                                Verifikasi Selesai (Resepsionis)
                                            </button>
                                        )}
                                        <button
                                            disabled={relatedVisitor.status === "accepted_by_unit" || relatedVisitor.status === "rejected_by_unit"}
                                            onClick={() => void handleVisitorDecision("accepted_by_unit")}
                                            className="px-4 py-3.5 text-sm font-extrabold text-emerald-700 bg-emerald-50 border-2 border-emerald-200 rounded-xl hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all disabled:opacity-50 disabled:hover:bg-emerald-50 disabled:hover:text-emerald-700 disabled:hover:border-emerald-200"
                                        >
                                            Bidang Setuju Terima
                                        </button>
                                        <button
                                            disabled={relatedVisitor.status === "accepted_by_unit" || relatedVisitor.status === "rejected_by_unit"}
                                            onClick={() => void handleVisitorDecision("rejected_by_unit")}
                                            className="px-4 py-3.5 text-sm font-extrabold text-rose-700 bg-rose-50 border-2 border-rose-200 rounded-xl hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all disabled:opacity-50 disabled:hover:bg-rose-50 disabled:hover:text-rose-700 disabled:hover:border-rose-200"
                                        >
                                            Bidang Menolak
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="pt-2 border-t border-slate-100">
                                <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400 mb-2 block pl-1">Catatan Tambahan</label>
                                <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ketikan instruksi atau pesan keputusan Anda disini..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-[#009FA9] focus:bg-white focus:ring-4 focus:ring-[#009FA9]/10 transition-all min-h-[100px] resize-none" />
                                <div className="mt-3 flex justify-end items-center">
                                    <button disabled={!note.trim()} onClick={handleAddNote} className="px-5 py-2.5 text-xs font-bold text-white bg-slate-400 rounded-xl hover:bg-slate-600 transition-colors disabled:opacity-40">
                                        Simpan Catatan
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
