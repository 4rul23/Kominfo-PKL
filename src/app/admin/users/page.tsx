"use client";

import { useEffect, useMemo, useState } from "react";
import { deleteStaffUser, getStaffUsers, seedDefaultStaffUsers, upsertStaffUser, type StaffInstansi, type StaffRole, type StaffUser } from "@/lib/staffStore";
import { getOrgUnits } from "@/lib/orgUnitStore";

const Icons = {
    trash: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>,
    refresh: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>,
};

export default function UsersPage() {
    const [users, setUsers] = useState<StaffUser[]>([]);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const orgUnits = useMemo(() => getOrgUnits(), []);

    // Create form
    const [username, setUsername] = useState("");
    const [name, setName] = useState("");
    const [nipNik, setNipNik] = useState("");
    const [instansi, setInstansi] = useState<StaffInstansi>("Diskominfo Makassar");
    const [role, setRole] = useState<StaffRole>("operator");
    const [orgUnitId, setOrgUnitId] = useState("");
    const [whatsapp, setWhatsapp] = useState("");
    const [password, setPassword] = useState("");

    const load = () => {
        setUsers(getStaffUsers());
        setLastUpdated(new Date());
    };

    useEffect(() => {
        seedDefaultStaffUsers();
        load();
        const i = setInterval(load, 30000);
        return () => clearInterval(i);
    }, []);

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim() || !name.trim() || !password) return;
        upsertStaffUser({
            id: crypto.randomUUID(),
            username: username.trim(),
            name: name.trim(),
            nipNik: (nipNik || "-").trim(),
            instansi,
            role,
            orgUnitId: orgUnitId || null,
            whatsapp: (whatsapp || "-").trim(),
            isActive: true,
            password,
        });
        setUsername("");
        setName("");
        setNipNik("");
        setWhatsapp("");
        setPassword("");
        setOrgUnitId("");
        setRole("operator");
        setInstansi("Diskominfo Makassar");
        load();
    };

    const patchUser = (u: StaffUser, patch: Partial<StaffUser>) => {
        upsertStaffUser({ ...u, ...patch, id: u.id });
        load();
    };

    const orgLabel = (id: string | null) => {
        if (!id) return "-";
        return orgUnits.find((o) => o.id === id)?.name || id;
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Users (Staff)</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-slate-500">Akun dummy untuk login resepsionis/operator/admin</p>
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
                    <p className="text-sm font-bold text-slate-800">Tambah User</p>
                    <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-6 gap-3 mt-3">
                        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username (login)" className="md:col-span-1 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#009FA9]" />
                        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama" className="md:col-span-2 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#009FA9]" />
                        <input value={nipNik} onChange={(e) => setNipNik(e.target.value)} placeholder="NIP/NIK" className="md:col-span-1 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#009FA9]" />
                        <select value={instansi} onChange={(e) => setInstansi(e.target.value as StaffInstansi)} className="md:col-span-1 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#009FA9]">
                            <option value="Diskominfo Makassar">Diskominfo Makassar</option>
                            <option value="UPT Warroom">UPT Warroom</option>
                        </select>
                        <select value={role} onChange={(e) => setRole(e.target.value as StaffRole)} className="md:col-span-1 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#009FA9]">
                            <option value="operator">operator</option>
                            <option value="receptionist">receptionist</option>
                            <option value="admin">admin</option>
                        </select>
                        <select value={orgUnitId} onChange={(e) => setOrgUnitId(e.target.value)} className="md:col-span-3 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#009FA9]">
                            <option value="">Org Unit (optional)</option>
                            {orgUnits.slice().sort((a, b) => a.name.localeCompare(b.name)).map((u) => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                        <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="WhatsApp (08xxx / +62xxx)" className="md:col-span-2 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#009FA9]" />
                        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (dummy)" type="password" className="md:col-span-1 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#009FA9]" />
                        <button type="submit" className="md:col-span-6 px-4 py-3 text-xs font-bold text-white bg-[#009FA9] rounded-2xl hover:shadow-xl hover:-translate-y-0.5 transition-all shadow-lg shadow-[#009FA9]/20">
                            Tambah User
                        </button>
                    </form>
                    <p className="text-xs text-slate-400 mt-3">Catatan: password disimpan plaintext di localStorage untuk demo. Nanti diganti backend + hash.</p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 text-left border-b border-slate-100">
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Username</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nama</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Instansi</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Org Unit</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">WA</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Active</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-20">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {users.length === 0 ? (
                                <tr><td colSpan={8} className="px-4 py-16 text-center text-slate-400 text-sm">Tidak ada user</td></tr>
                            ) : (
                                users.slice().sort((a, b) => a.username.localeCompare(b.username)).map((u) => (
                                    <tr key={u.id} className="hover:bg-slate-50/50">
                                        <td className="px-4 py-3 text-sm text-slate-600 font-mono">{u.username}</td>
                                        <td className="px-4 py-3 text-sm text-slate-800 font-semibold">{u.name}</td>
                                        <td className="px-4 py-3">
                                            <select value={u.role} onChange={(e) => patchUser(u, { role: e.target.value as StaffRole })} className="px-3 py-2 bg-white border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#009FA9]">
                                                <option value="operator">operator</option>
                                                <option value="receptionist">receptionist</option>
                                                <option value="admin">admin</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-3">
                                            <select value={u.instansi} onChange={(e) => patchUser(u, { instansi: e.target.value as StaffInstansi })} className="px-3 py-2 bg-white border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#009FA9]">
                                                <option value="Diskominfo Makassar">Diskominfo Makassar</option>
                                                <option value="UPT Warroom">UPT Warroom</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{orgLabel(u.orgUnitId)}</td>
                                        <td className="px-4 py-3">
                                            <input defaultValue={u.whatsapp} onBlur={(e) => patchUser(u, { whatsapp: e.target.value })} className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#009FA9] font-mono" />
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => patchUser(u, { isActive: !u.isActive })}
                                                className={`px-3 py-2 text-xs font-bold rounded-xl border-2 ${u.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}
                                            >
                                                {u.isActive ? "Active" : "Inactive"}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => {
                                                    if (!confirm(`Hapus user: ${u.username}?`)) return;
                                                    deleteStaffUser(u.id);
                                                    load();
                                                }}
                                                className="inline-flex items-center justify-center px-3 py-2 text-xs font-bold text-[#991b1b] bg-white border-2 border-[#991b1b]/30 hover:bg-[#991b1b]/10 rounded-xl transition-colors"
                                            >
                                                {Icons.trash}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

