"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { getVisitorByTrackingIdFromServer, type Visitor } from "@/lib/visitorStore";
import { getVisitorStatusLabel } from "@/lib/visitorWorkflow";

function formatTimeline(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).replace(",", " •");
}

export default function GuestTrackingPage() {
  const searchParams = useSearchParams();
  const [trackingId, setTrackingId] = useState("");
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [unitStatuses, setUnitStatuses] = useState<Record<string, { status: "available" | "busy" | "unavailable"; note: string }>>({});

  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    const id = searchParams.get("id") || "";
    if (id) {
      setTrackingId(id);
      void handleSearch(id);
    }
  }, [searchParams]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPolling && trackingId) {
      interval = setInterval(async () => {
        try {
          const result = await getVisitorByTrackingIdFromServer(trackingId);
          if (result) {
            setVisitor(result);

            // Re-fetch unit statuses to keep the "Resepsionis" note real-time updated too
            const res = await fetch(`/api/units/status?_t=${Date.now()}`);
            const data = await res.json();
            setUnitStatuses(data || {});

            // Stop polling if the visit has concluded
            if (result.status === 'accepted_by_unit' || result.status === 'rejected_by_unit') {
              setIsPolling(false);
            }
          }
        } catch (err) {
          console.error("Background poll failed", err);
        }
      }, 2000); // Poll every 2 seconds for real-time feel
    }
    return () => clearInterval(interval);
  }, [isPolling, trackingId]);

  const handleSearch = async (forcedId?: string) => {
    const target = (forcedId || trackingId).trim();
    if (!target) {
      setError("Masukkan tracking ID kunjungan.");
      setVisitor(null);
      setIsPolling(false);
      return;
    }

    setIsLoading(true);
    setError("");
    const result = await getVisitorByTrackingIdFromServer(target);
    setVisitor(result);
    if (!result) {
      setError("Tracking kunjungan tidak ditemukan.");
      setIsPolling(false);
    } else {
      setIsPolling(result.status !== 'accepted_by_unit' && result.status !== 'rejected_by_unit');
      try {
        const res = await fetch("/api/units/status");
        const data = await res.json();
        setUnitStatuses(data || {});
      } catch (err) {
        console.error("Failed to fetch unit statuses", err);
      }
    }
    setIsLoading(false);
  };

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-50px_rgba(15,23,42,0.75)]">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#991b1b]">Tracking Kunjungan</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#172B4D]">Lacak Status Kunjungan Tamu</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">Pantau apakah kunjungan sudah diteruskan ke bidang, diterima, atau ditolak.</p>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-50px_rgba(15,23,42,0.75)]">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              placeholder="VIS-202603-ABC123"
              className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-[#172B4D] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#009FA9]/20 focus:border-[#009FA9]"
            />
            <button onClick={() => void handleSearch()} className="rounded-2xl bg-[#009FA9] px-5 py-3 text-sm font-bold text-white hover:brightness-110 disabled:opacity-60" disabled={isLoading}>
              {isLoading ? "Memuat..." : "Cari Tracking"}
            </button>
          </div>
          {error && <p className="mt-3 text-sm font-semibold text-[#991b1b]">{error}</p>}
        </section>

        {visitor && (
          <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="flex flex-col gap-4">
              {unitStatuses[visitor.unit] && unitStatuses[visitor.unit].status !== "available" && (
                <div className={`rounded-2xl border ${unitStatuses[visitor.unit].status === 'busy' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'} p-5`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${unitStatuses[visitor.unit].status === 'busy' ? 'bg-amber-500' : 'bg-red-500'}`} />
                    <h3 className={`text-sm font-bold ${unitStatuses[visitor.unit].status === 'busy' ? 'text-amber-800' : 'text-red-800'}`}>
                      Info dari Resepsionis: {visitor.unit} {unitStatuses[visitor.unit].status === 'busy' ? 'Sedang Sibuk' : 'Tidak Tersedia'}
                    </h3>
                  </div>
                  {unitStatuses[visitor.unit].note && (
                    <p className={`text-sm font-medium ${unitStatuses[visitor.unit].status === 'busy' ? 'text-amber-700' : 'text-red-700'}`}>
                      "{unitStatuses[visitor.unit].note}"
                    </p>
                  )}
                </div>
              )}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-50px_rgba(15,23,42,0.75)] flex-1">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Ringkasan Kunjungan</p>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <p><span className="font-bold text-slate-800">Tracking ID:</span> <span className="font-mono">{visitor.trackingId}</span></p>
                  <p><span className="font-bold text-slate-800">Nama:</span> {visitor.name}</p>
                  <p><span className="font-bold text-slate-800">Instansi:</span> {visitor.organization}</p>
                  <p><span className="font-bold text-slate-800">Unit Tujuan:</span> {visitor.unit}</p>
                  <p><span className="font-bold text-slate-800">Keperluan:</span> {visitor.purpose}</p>
                  <div className="pt-3">
                    <span className="inline-flex rounded-full bg-[#009FA9]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-[#009FA9] border border-[#009FA9]/20">
                      {getVisitorStatusLabel(visitor.status)}
                    </span>
                  </div>
                  {visitor.forwardedOrgUnitName && <p><span className="font-bold text-slate-800">Diteruskan ke:</span> {visitor.forwardedOrgUnitName}</p>}
                  {visitor.assignedOperatorName && <p><span className="font-bold text-slate-800">PIC Bidang:</span> {visitor.assignedOperatorName}</p>}
                  {visitor.decisionNote && <p><span className="font-bold text-slate-800">Catatan:</span> {visitor.decisionNote}</p>}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-50px_rgba(15,23,42,0.75)]">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Progres Kunjungan</p>
              <div className="mt-4 space-y-3">
                {visitor.statusHistory.map((entry, index) => (
                  <div key={`${entry.timestamp}-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-[#172B4D]">{getVisitorStatusLabel(entry.status)}</p>
                      <span className="text-xs font-semibold text-slate-400">{formatTimeline(entry.timestamp)}</span>
                    </div>
                    {entry.note && <p className="mt-1 text-sm text-slate-500">{entry.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <div className="flex justify-center">
          <Link href="/guest" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-[#172B4D] hover:border-[#009FA9]/30 hover:text-[#009FA9] transition-all">
            Kembali ke Buku Tamu
          </Link>
        </div>
      </div>
    </main>
  );
}
