"use client";

import { useEffect, useState } from "react";

type UnitStatus = "available" | "busy" | "unavailable";
type UnitStatusData = Record<string, { status: UnitStatus; note: string }>;

const UNIT_LIST = [
    "UPT Warroom",
    "Sekretariat Diskominfo",
    "Bidang IKP",
    "Bidang APTIKA",
    "Bidang PDE Statistik",
    "Bidang Persandian dan Keamanan Informasi"
];

export default function UnitStatusWidget() {
    const [statuses, setStatuses] = useState<UnitStatusData>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [editingUnit, setEditingUnit] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ status: UnitStatus; note: string }>({ status: "available", note: "" });

    useEffect(() => {
        fetch("/api/units/status")
            .then(res => res.json())
            .then(data => {
                setStatuses(data || {});
                setIsLoading(false);
            })
            .catch(() => setIsLoading(false));
    }, []);

    const handleEdit = (unit: string) => {
        setEditingUnit(unit);
        setEditForm(statuses[unit] || { status: "available", note: "" });
    };

    const handleSave = async () => {
        if (!editingUnit) return;
        setIsSaving(true);
        const nextStatuses = { ...statuses, [editingUnit]: editForm };
        try {
            await fetch("/api/units/status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(nextStatuses)
            });
            setStatuses(nextStatuses);
            setEditingUnit(null);
        } catch (error) {
            alert("Gagal menyimpan status.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="bg-white border-2 border-gray-200 rounded-2xl p-5 w-full text-center text-sm text-slate-400">Memuat status unit...</div>;
    }

    return (
        <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden flex flex-col w-full h-full">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-slate-800">Status Ketersediaan Bidang</h3>
                    <p className="text-xs text-slate-500">Berikan catatan kepada tamu saat memilih unit tujuan.</p>
                </div>
            </div>
            <div className="divide-y divide-gray-100 flex-1 overflow-auto max-h-[300px]">
                {UNIT_LIST.map(unit => {
                    const statusData = statuses[unit] || { status: "available", note: "" };
                    const isEditing = editingUnit === unit;

                    return (
                        <div key={unit} className="p-4 hover:bg-slate-50 transition-colors flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2.5 h-2.5 rounded-full ${statusData.status === "available" ? "bg-emerald-500" : statusData.status === "busy" ? "bg-amber-500" : "bg-red-500"}`} />
                                    <span className="text-sm font-semibold text-slate-700">{unit}</span>
                                </div>
                                {!isEditing && (
                                    <button onClick={() => handleEdit(unit)} className="text-xs font-bold text-[#009FA9] hover:underline">
                                        Edit
                                    </button>
                                )}
                            </div>

                            {isEditing ? (
                                <div className="mt-2 bg-slate-100 p-3 rounded-xl border border-slate-200 flex flex-col gap-3">
                                    <div className="flex gap-2">
                                        <select
                                            value={editForm.status}
                                            onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value as UnitStatus }))}
                                            className="px-2 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-[#009FA9]"
                                        >
                                            <option value="available">🟢 Tersedia</option>
                                            <option value="busy">🟡 Sedang Sibuk</option>
                                            <option value="unavailable">🔴 Tidak Tersedia</option>
                                        </select>
                                    </div>
                                    <input
                                        type="text"
                                        value={editForm.note}
                                        onChange={e => setEditForm(prev => ({ ...prev, note: e.target.value }))}
                                        placeholder="Contoh: Sedang rapat, mohon tunggu 30 menit."
                                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-[#009FA9]"
                                    />
                                    <div className="flex gap-2 self-end">
                                        <button onClick={() => setEditingUnit(null)} disabled={isSaving} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700">Batal</button>
                                        <button onClick={handleSave} disabled={isSaving} className="px-3 py-1.5 text-xs font-bold text-white bg-[#009FA9] rounded-lg hover:shadow-md transition-all disabled:opacity-50">
                                            {isSaving ? "Menyimpan..." : "Simpan"}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-xs text-slate-500 pl-5.5">
                                    {statusData.note ? (
                                        <span className="italic">"{statusData.note}"</span>
                                    ) : (
                                        <span className="text-slate-300">Tidak ada catatan</span>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
