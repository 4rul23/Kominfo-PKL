"use client";

import { useEffect, useMemo, useState } from "react";
import { deleteOrgUnit, getOrgUnitContacts, getOrgUnits, seedDefaultOrgStructure, upsertOrgUnit, upsertOrgUnitContact, type OrgUnit, type OrgUnitContact, type OrgUnitType } from "@/lib/orgUnitStore";

const Icons = {
    trash: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>,
    refresh: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>,
};

export default function OrgUnitsPage() {
    const [units, setUnits] = useState<OrgUnit[]>([]);
    const [contacts, setContacts] = useState<OrgUnitContact[]>([]);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // Create form
    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [type, setType] = useState<OrgUnitType>("bidang");
    const [parentId, setParentId] = useState<string>("");

    const load = () => {
        setUnits(getOrgUnits());
        setContacts(getOrgUnitContacts());
        setLastUpdated(new Date());
    };

    useEffect(() => {
        seedDefaultOrgStructure();
        load();
        const i = setInterval(load, 30000);
        return () => clearInterval(i);
    }, []);

    const unitOptions = useMemo(() => units.slice().sort((a, b) => a.name.localeCompare(b.name)), [units]);

    const leadFor = (orgUnitId: string) => contacts.find((c) => c.orgUnitId === orgUnitId && c.contactType === "lead") || null;
    const kadis = useMemo(() => contacts.find((c) => c.contactType === "kadis") || null, [contacts]);

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        const c = code.trim();
        const n = name.trim();
        if (!c || !n) return;
        const u: OrgUnit = {
            id: c,
            code: c,
            name: n,
            type,
            parentId: parentId || null,
        };
        upsertOrgUnit(u);
        setCode("");
        setName("");
        setParentId("");
        setType("bidang");
        load();
    };

    const setLead = (orgUnitId: string, nameOverride: string, whatsapp: string) => {
        const existing = leadFor(orgUnitId);
        upsertOrgUnitContact({
            id: existing?.id || crypto.randomUUID(),
            orgUnitId,
            contactType: "lead",
            userId: existing?.userId || null,
            nameOverride: nameOverride.trim() || null,
            whatsapp: whatsapp.trim() || "",
        });
        load();
    };

    const setKadis = (nameOverride: string, whatsapp: string) => {
        upsertOrgUnitContact({
            id: kadis?.id || crypto.randomUUID(),
            orgUnitId: "DISKOMINFO_KOTA_MAKASSAR",
            contactType: "kadis",
            userId: null,
            nameOverride: nameOverride.trim() || "Kepala Dinas",
            whatsapp: whatsapp.trim() || "",
        });
        load();
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Org Units</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-slate-500">Master struktur organisasi + lead contact (dummy)</p>
                        {lastUpdated && (
                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Updated: {lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                        )}
                    </div>
                </div>
                <button onClick={load} className="flex items-center gap-1.5 px-4 py-3 text-xs font-bold text-[#505F79] bg-white border-2 border-gray-200 rounded-2xl hover:border-[#009FA9] hover:text-[#009FA9] transition-all shadow-sm">
                    {Icons.refresh}
                    Refresh
                </button>
            </header>

            <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-slate-100">
                    <p className="text-sm font-bold text-slate-800">Kontak Kepala Dinas</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                        <input
                            defaultValue={kadis?.nameOverride || "Kepala Dinas"}
                            placeholder="Nama"
                            onBlur={(e) => setKadis(e.target.value, kadis?.whatsapp || "")}
                            className="px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#009FA9]"
                        />
                        <input
                            defaultValue={kadis?.whatsapp || ""}
                            placeholder="WhatsApp"
                            onBlur={(e) => setKadis(kadis?.nameOverride || "Kepala Dinas", e.target.value)}
                            className="px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#009FA9]"
                        />
                        <p className="text-xs text-slate-400 flex items-center">Dipakai tombol “Eskalasi Kadis” di case detail.</p>
                    </div>
                </div>

                <div className="p-5 border-b border-slate-100">
                    <p className="text-sm font-bold text-slate-800">Tambah Org Unit</p>
                    <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-3">
                        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CODE (ex: BIDANG_XXX)" className="md:col-span-2 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#009FA9]" />
                        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama Org Unit" className="md:col-span-2 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#009FA9]" />
                        <select value={type} onChange={(e) => setType(e.target.value as OrgUnitType)} className="px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#009FA9]">
                            <option value="bidang">bidang</option>
                            <option value="subbag">subbag</option>
                            <option value="sekretariat">sekretariat</option>
                            <option value="upt">upt</option>
                            <option value="pool">pool</option>
                            <option value="root">root</option>
                        </select>
                        <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="md:col-span-4 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#009FA9]">
                            <option value="">Parent (optional)</option>
                            {unitOptions.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                        <button type="submit" className="px-4 py-3 text-xs font-bold text-white bg-[#009FA9] rounded-2xl hover:shadow-xl hover:-translate-y-0.5 transition-all shadow-lg shadow-[#009FA9]/20">
                            Tambah
                        </button>
                    </form>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 text-left border-b border-slate-100">
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Code</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nama</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Parent</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Lead Name</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Lead WhatsApp</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-20">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {units.slice().sort((a, b) => a.name.localeCompare(b.name)).map((u) => {
                                const lead = leadFor(u.id);
                                const parentName = u.parentId ? units.find((x) => x.id === u.parentId)?.name || u.parentId : "-";
                                return (
                                    <tr key={u.id} className="hover:bg-slate-50/50">
                                        <td className="px-4 py-3 text-sm text-slate-600 font-mono">{u.code}</td>
                                        <td className="px-4 py-3 text-sm text-slate-700 font-semibold">{u.name}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{u.type}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{parentName}</td>
                                        <td className="px-4 py-3">
                                            <input
                                                defaultValue={lead?.nameOverride || ""}
                                                placeholder="Nama lead"
                                                onBlur={(e) => setLead(u.id, e.target.value, lead?.whatsapp || "")}
                                                className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#009FA9]"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                defaultValue={lead?.whatsapp || ""}
                                                placeholder="08xxx / +62xxx"
                                                onBlur={(e) => setLead(u.id, lead?.nameOverride || "", e.target.value)}
                                                className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#009FA9] font-mono"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => {
                                                    if (!confirm(`Hapus org unit: ${u.name}?`)) return;
                                                    deleteOrgUnit(u.id);
                                                    load();
                                                }}
                                                className="inline-flex items-center justify-center px-3 py-2 text-xs font-bold text-[#991b1b] bg-white border-2 border-[#991b1b]/30 hover:bg-[#991b1b]/10 rounded-xl transition-colors"
                                            >
                                                {Icons.trash}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

