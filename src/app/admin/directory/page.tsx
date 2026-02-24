"use client";

import { useEffect, useMemo, useState } from "react";
import { getStaffUsers, type StaffUser } from "@/lib/staffStore";
import { getOrgUnits, getOrgUnitContacts, type OrgUnit } from "@/lib/orgUnitStore";
import { buildWaMeLink } from "@/lib/whatsapp";

const Icons = {
    search: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
    wa: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5A8.48 8.48 0 0 1 21 11v.5z" /></svg>,
};

function orgUnitLabel(units: OrgUnit[], id: string | null): string {
    if (!id) return "-";
    return units.find((u) => u.id === id)?.name || id;
}

export default function DirectoryPage() {
    const [users, setUsers] = useState<StaffUser[]>([]);
    const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);
    const [contacts, setContacts] = useState<ReturnType<typeof getOrgUnitContacts>>([]);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const [searchQuery, setSearchQuery] = useState("");
    const [instansiFilter, setInstansiFilter] = useState("all");
    const [orgUnitFilter, setOrgUnitFilter] = useState("all");

    const load = () => {
        setUsers(getStaffUsers());
        setOrgUnits(getOrgUnits());
        setContacts(getOrgUnitContacts());
        setLastUpdated(new Date());
    };

    useEffect(() => {
        load();
        const i = setInterval(load, 30000);
        return () => clearInterval(i);
    }, []);

    const operatorUsers = useMemo(() => users.filter((u) => u.role === "operator" && u.isActive), [users]);
    const instansis = useMemo(() => [...new Set(operatorUsers.map((u) => u.instansi))], [operatorUsers]);
    const orgUnitOptions = useMemo(() => orgUnits.filter((u) => ["bidang", "subbag", "upt", "pool", "sekretariat"].includes(u.type)), [orgUnits]);

    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return operatorUsers.filter((u) => {
            const matchesSearch = !q ||
                u.name.toLowerCase().includes(q) ||
                u.username.toLowerCase().includes(q) ||
                (u.nipNik || "").toLowerCase().includes(q) ||
                (u.whatsapp || "").toLowerCase().includes(q) ||
                orgUnitLabel(orgUnits, u.orgUnitId).toLowerCase().includes(q);

            const matchesInstansi = instansiFilter === "all" || u.instansi === instansiFilter;
            const matchesOrg = orgUnitFilter === "all" || (u.orgUnitId || "-") === orgUnitFilter;
            return matchesSearch && matchesInstansi && matchesOrg;
        });
    }, [operatorUsers, searchQuery, instansiFilter, orgUnitFilter, orgUnits]);

    const leadContacts = useMemo(() => {
        // Show: Kadis + all "lead" contacts
        return contacts.filter((c) => c.contactType === "kadis" || c.contactType === "lead");
    }, [contacts]);

    return (
        <div className="space-y-6">
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Direktori Kontak</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-slate-500">Operator per bidang/subbag/UPT + kontak pimpinan</p>
                        {lastUpdated && (
                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                Updated: {lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                        )}
                    </div>
                </div>
            </header>

            <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center gap-3">
                    <div className="flex-1 relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{Icons.search}</div>
                        <input
                            type="text"
                            placeholder="Cari nama, org unit, atau WA..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#009FA9] focus:ring-1 focus:ring-[#009FA9]/20"
                        />
                    </div>
                    <select value={instansiFilter} onChange={(e) => setInstansiFilter(e.target.value)} className="px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#009FA9]">
                        <option value="all">Semua Instansi</option>
                        {instansis.map((i) => <option key={i} value={i}>{i}</option>)}
                    </select>
                    <select value={orgUnitFilter} onChange={(e) => setOrgUnitFilter(e.target.value)} className="px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#009FA9]">
                        <option value="all">Semua Org Unit</option>
                        {orgUnitOptions.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 text-left border-b border-slate-100">
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-12">#</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nama</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Instansi</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Org Unit</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">WhatsApp</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.length === 0 ? (
                                <tr><td colSpan={6} className="px-4 py-16 text-center text-slate-400 text-sm">Tidak ada data</td></tr>
                            ) : (
                                filtered.map((u, idx) => {
                                    const msg = `Halo ${u.name}, saya mau koordinasi terkait tugas/case.`;
                                    const href = buildWaMeLink(u.whatsapp, msg);
                                    return (
                                        <tr key={u.id} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3 text-sm text-slate-400">{idx + 1}</td>
                                            <td className="px-4 py-3 text-sm font-medium text-slate-800">{u.name}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{u.instansi}</td>
                                            <td className="px-4 py-3 text-sm">
                                                <span className="inline-block px-2 py-0.5 bg-[#009FA9]/10 text-[#009FA9] text-xs font-bold rounded-lg border border-[#009FA9]/20">
                                                    {orgUnitLabel(orgUnits, u.orgUnitId)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600 font-mono">{u.whatsapp || "-"}</td>
                                            <td className="px-4 py-3">
                                                {href ? (
                                                    <a
                                                        href={href}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-[#36B37E] rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-sm"
                                                    >
                                                        {Icons.wa}
                                                        Chat
                                                    </a>
                                                ) : (
                                                    <span className="text-xs text-slate-400">No WA</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
                    Menampilkan {filtered.length} dari {operatorUsers.length} operator
                </div>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                    <p className="text-sm font-bold text-slate-800">Kontak Pimpinan (Lead)</p>
                    <p className="text-xs text-slate-400 mt-1">Dipakai untuk eskalasi (Kabid/Kasubbag/Koordinator UPT/Kadis)</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 text-left border-b border-slate-100">
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-12">#</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Org Unit</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nama</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">WhatsApp</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {leadContacts.length === 0 ? (
                                <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400 text-sm">Belum ada lead contact</td></tr>
                            ) : (
                                leadContacts.map((c, idx) => {
                                    const ou = orgUnitLabel(orgUnits, c.orgUnitId);
                                    const name = c.nameOverride || "-";
                                    const msg = `Halo ${name}, saya ingin eskalasi/koordinasi terkait tugas/case.`;
                                    const href = buildWaMeLink(c.whatsapp, msg);
                                    return (
                                        <tr key={c.id} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3 text-sm text-slate-400">{idx + 1}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{ou}</td>
                                            <td className="px-4 py-3 text-sm font-medium text-slate-800">{name}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600 font-mono">{c.whatsapp || "-"}</td>
                                            <td className="px-4 py-3">
                                                {href ? (
                                                    <a
                                                        href={href}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-[#36B37E] rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-sm"
                                                    >
                                                        {Icons.wa}
                                                        Chat
                                                    </a>
                                                ) : (
                                                    <span className="text-xs text-slate-400">No WA</span>
                                                )}
                                            </td>
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

