export default function GlobalLoading() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-3xl border border-white/60 bg-white/85 backdrop-blur-xl shadow-[0_24px_60px_-40px_rgba(15,23,42,0.75)] p-8 text-center">
        <div className="mx-auto w-12 h-12 rounded-full border-4 border-slate-200 border-t-[#009FA9] animate-spin" />
        <h2 className="mt-5 text-xl font-bold text-[#172B4D] tracking-tight">Memuat Halaman</h2>
        <p className="mt-2 text-sm font-medium text-slate-500">Mohon tunggu sebentar, sistem sedang menyiapkan data.</p>
      </div>
    </main>
  );
}
