"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
    createAttendanceEventRegisterLink,
    createAttendanceEvent,
    getActiveAttendanceEvent,
    getAttendanceEvents,
    type AttendanceEvent,
    updateAttendanceEvent,
} from "@/lib/attendanceStore";

function formatDate(value: string | null): string {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

interface RegisterQrModalState {
    eventCode: string;
    eventName: string;
    url: string;
    expiresAt: string | null;
    isSecure: boolean;
}

export default function AdminEventsPage() {
    const [events, setEvents] = useState<AttendanceEvent[]>([]);
    const [activeEvent, setActiveEvent] = useState<AttendanceEvent | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [form, setForm] = useState({
        code: "",
        name: "",
        eventDate: "",
        isActive: true,
    });
    const [origin, setOrigin] = useState("");
    const [isGeneratingQr, setIsGeneratingQr] = useState(false);
    const [qrModal, setQrModal] = useState<RegisterQrModalState | null>(null);

    const sortedEvents = useMemo(
        () => [...events].sort((a, b) => Number(b.isActive) - Number(a.isActive)),
        [events],
    );

    async function loadData() {
        setIsLoading(true);
        setError("");
        try {
            const [allEvents, currentActive] = await Promise.all([
                getAttendanceEvents(),
                getActiveAttendanceEvent(),
            ]);
            setEvents(allEvents);
            setActiveEvent(currentActive);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Gagal memuat data event.");
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        void loadData();
    }, []);

    useEffect(() => {
        if (typeof window !== "undefined") {
            setOrigin(window.location.origin);
        }
    }, []);

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (isSaving) return;

        setIsSaving(true);
        setError("");
        setMessage("");
        try {
            await createAttendanceEvent({
                code: form.code,
                name: form.name,
                eventDate: form.eventDate || null,
                isActive: form.isActive,
            });
            setMessage("Event berhasil dibuat.");
            setForm({ code: "", name: "", eventDate: "", isActive: true });
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Gagal membuat event.");
        } finally {
            setIsSaving(false);
        }
    }

    async function activateEvent(eventId: string) {
        if (isSaving) return;
        setIsSaving(true);
        setError("");
        setMessage("");
        try {
            await updateAttendanceEvent({ id: eventId, isActive: true });
            setMessage("Event aktif berhasil diperbarui.");
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Gagal mengaktifkan event.");
        } finally {
            setIsSaving(false);
        }
    }

    function buildAbsoluteUrl(path: string): string {
        if (!origin) return path;
        return `${origin}${path}`;
    }

    async function copyLink(url: string) {
        try {
            await navigator.clipboard.writeText(url);
            return true;
        } catch {
            setError("Gagal menyalin link.");
            return false;
        }
    }

    async function copySecureRegisterLink(eventCode: string) {
        setError("");
        setMessage("");
        try {
            const secure = await createAttendanceEventRegisterLink({
                code: eventCode,
                expiresInHours: 72,
            });
            const copied = await copyLink(buildAbsoluteUrl(secure.registerPath));
            if (!copied) return;
            setMessage(`Link register aman berhasil disalin (berlaku hingga ${formatDateTime(secure.expiresAt)}).`);
        } catch (error) {
            setError(error instanceof Error ? error.message : "Gagal membuat secure link event.");
        }
    }

    async function buildRegisterLink(eventCode: string): Promise<{
        url: string;
        expiresAt: string | null;
        isSecure: boolean;
    }> {
        try {
            const secure = await createAttendanceEventRegisterLink({
                code: eventCode,
                expiresInHours: 72,
            });
            return {
                url: buildAbsoluteUrl(secure.registerPath),
                expiresAt: secure.expiresAt,
                isSecure: true,
            };
        } catch {
            return {
                url: buildAbsoluteUrl(`/e/${encodeURIComponent(eventCode)}/register`),
                expiresAt: null,
                isSecure: false,
            };
        }
    }

    async function openRegisterQrModal(event: AttendanceEvent) {
        if (isGeneratingQr) return;
        setIsGeneratingQr(true);
        setError("");
        setMessage("");
        try {
            const link = await buildRegisterLink(event.code);
            setQrModal({
                eventCode: event.code,
                eventName: event.name,
                url: link.url,
                expiresAt: link.expiresAt,
                isSecure: link.isSecure,
            });
            if (link.isSecure && link.expiresAt) {
                setMessage(`QR register aman siap digunakan (berlaku hingga ${formatDateTime(link.expiresAt)}).`);
            } else {
                setMessage("QR register dibuat dengan link standar. Set ATTENDANCE_EVENT_TOKEN_SECRET untuk secure link.");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Gagal membuat QR register.");
            setQrModal(null);
        } finally {
            setIsGeneratingQr(false);
        }
    }

    async function copyQrModalLink() {
        if (!qrModal) return;
        const copied = await copyLink(qrModal.url);
        if (!copied) return;
        setMessage("Link pada QR berhasil disalin.");
    }

    function downloadQrPng() {
        if (!qrModal) return;
        const canvas = document.getElementById("event-register-qr-canvas") as HTMLCanvasElement | null;
        if (!canvas) {
            setError("QR belum siap diunduh.");
            return;
        }
        const dataUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `qr-register-${qrModal.eventCode}.png`;
        link.click();
        setMessage("QR PNG berhasil diunduh.");
    }

    async function copyPlainRegisterLink(eventCode: string) {
        setError("");
        setMessage("");
        const copied = await copyLink(buildAbsoluteUrl(`/e/${encodeURIComponent(eventCode)}/register`));
        if (!copied) return;
        setMessage("Link register event berhasil disalin.");
    }

    async function copyDashboardLink(eventCode: string) {
        setError("");
        setMessage("");
        const copied = await copyLink(buildAbsoluteUrl(`/e/${encodeURIComponent(eventCode)}`));
        if (!copied) return;
        setMessage("Link dashboard event berhasil disalin.");
    }

    return (
        <div className="space-y-6">
            <header className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold text-slate-800">Manajemen Event Absensi</h2>
                <p className="text-sm text-slate-500">
                    Setiap event punya absensi sendiri. Gunakan secure register link agar peserta langsung masuk event yang benar.
                </p>
            </header>

            <section className="bg-white border-2 border-gray-200 rounded-2xl p-5">
                <p className="text-xs uppercase tracking-[0.12em] font-bold text-slate-400 mb-1">Event Aktif</p>
                <p className="text-lg font-bold text-slate-800">{activeEvent?.name || "-"}</p>
                <p className="text-sm text-slate-500 mt-1">Code: <span className="font-mono">{activeEvent?.code || "-"}</span></p>
            </section>

            <section className="bg-white border-2 border-gray-200 rounded-2xl p-5">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Buat Event Baru</h3>
                <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input
                        value={form.code}
                        onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                        placeholder="Code event (contoh: rakor_2026_03_05)"
                        className="px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#009FA9]"
                        required
                    />
                    <input
                        value={form.name}
                        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Nama event"
                        className="px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#009FA9]"
                        required
                    />
                    <input
                        type="date"
                        value={form.eventDate}
                        onChange={(e) => setForm((prev) => ({ ...prev, eventDate: e.target.value }))}
                        className="px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#009FA9]"
                    />
                    <label className="flex items-center gap-2 text-sm text-slate-600 px-3">
                        <input
                            type="checkbox"
                            checked={form.isActive}
                            onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                        />
                        Jadikan event aktif
                    </label>

                    <div className="md:col-span-4">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-5 py-3 bg-[#009FA9] text-white text-sm font-bold rounded-2xl hover:opacity-90 disabled:opacity-50"
                        >
                            {isSaving ? "Menyimpan..." : "Simpan Event"}
                        </button>
                    </div>
                </form>
                {message && <p className="text-sm text-emerald-600 mt-3 font-semibold">{message}</p>}
                {error && <p className="text-sm text-rose-600 mt-3 font-semibold">{error}</p>}
            </section>

            <section className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-slate-800">Daftar Event</h3>
                </div>
                <table className="w-full">
                    <thead>
                        <tr className="bg-slate-50 text-left">
                            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">Nama Event</th>
                            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">Code</th>
                            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">Tanggal</th>
                            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">Status</th>
                            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">Link Publik</th>
                            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-sm">Memuat data event...</td></tr>
                        ) : sortedEvents.length === 0 ? (
                            <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-sm">Belum ada event.</td></tr>
                        ) : (
                            sortedEvents.map((event) => (
                                <tr key={event.id} className="border-t border-gray-100">
                                    <td className="px-4 py-3 text-sm font-semibold text-slate-800">{event.name}</td>
                                    <td className="px-4 py-3 text-xs font-mono text-slate-600">{event.code}</td>
                                    <td className="px-4 py-3 text-sm text-slate-600">{formatDate(event.eventDate)}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${event.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                                            {event.isActive ? "Aktif" : "Nonaktif"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-slate-600">
                                        <div className="flex flex-col gap-1">
                                            <button
                                                onClick={() => copySecureRegisterLink(event.code)}
                                                className="text-left text-[#009FA9] hover:underline font-semibold"
                                                type="button"
                                            >
                                                Copy Secure Register Link
                                            </button>
                                            <button
                                                onClick={() => copyPlainRegisterLink(event.code)}
                                                className="text-left text-[#009FA9] hover:underline font-semibold"
                                                type="button"
                                            >
                                                Copy Register Link
                                            </button>
                                            <button
                                                onClick={() => copyDashboardLink(event.code)}
                                                className="text-left text-[#009FA9] hover:underline font-semibold"
                                                type="button"
                                            >
                                                Copy Dashboard Link
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <button
                                                onClick={() => openRegisterQrModal(event)}
                                                disabled={isGeneratingQr}
                                                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                                            >
                                                Buat QR Register
                                            </button>
                                            {!event.isActive && (
                                                <button
                                                    onClick={() => activateEvent(event.id)}
                                                    disabled={isSaving}
                                                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#009FA9] text-white disabled:opacity-50"
                                                >
                                                    Jadikan Aktif
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </section>

            {qrModal && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/45 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#991b1b]">
                                    QR Register Event
                                </p>
                                <h4 className="mt-1 text-lg font-bold text-slate-800">{qrModal.eventName}</h4>
                                <p className="text-xs font-mono text-slate-500 mt-1">{qrModal.eventCode}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setQrModal(null)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
                                aria-label="Tutup QR"
                            >
                                ×
                            </button>
                        </div>

                        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 grid place-items-center">
                            <QRCodeCanvas
                                id="event-register-qr-canvas"
                                value={qrModal.url}
                                size={260}
                                includeMargin
                                bgColor="#FFFFFF"
                                fgColor="#172B4D"
                            />
                        </div>

                        <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-medium text-slate-600 break-all">
                            {qrModal.url}
                        </div>

                        <div className="mt-3 text-xs font-semibold">
                            {qrModal.isSecure ? (
                                <p className="text-emerald-700">
                                    Link aman aktif {qrModal.expiresAt ? `hingga ${formatDateTime(qrModal.expiresAt)}.` : "dengan token."}
                                </p>
                            ) : (
                                <p className="text-amber-700">
                                    Menggunakan link standar (tanpa token).
                                </p>
                            )}
                        </div>

                        <div className="mt-5 flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={copyQrModalLink}
                                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
                            >
                                Copy Link
                            </button>
                            <button
                                type="button"
                                onClick={downloadQrPng}
                                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#009FA9] text-white hover:brightness-110"
                            >
                                Download PNG
                            </button>
                            <a
                                href={qrModal.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                            >
                                Buka Link
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
