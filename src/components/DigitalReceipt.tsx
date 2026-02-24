import Image from "next/image";
import { SuratElektronik } from "@/lib/suratStore";

export default function DigitalReceipt({ surat }: { surat: SuratElektronik }) {
    return (
        <div className="bg-white hidden print:block text-black relative overflow-hidden print:w-[210mm] print:h-[297mm] print:overflow-hidden mx-auto" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
            {/* Outer Border for Official Feel */}
            <div className="p-8 h-full flex flex-col relative justify-between">

                {/* Background Watermark */}
                <div className="absolute inset-0 z-0 opacity-[0.04] pointer-events-none flex items-center justify-center">
                    <Image
                        src="/kominfos.svg"
                        alt="Watermark"
                        width={600}
                        height={600}
                        className="object-contain grayscale"
                    />
                </div>

                <div className="relative z-10 flex-1 flex flex-col">
                    {/* KOP SURAT */}
                    <header className="flex items-center gap-6 border-b-[4px] border-double border-black pb-6 mb-8">
                        <div className="w-[85px] h-[100px] relative flex-shrink-0 grayscale contrast-125">
                            <Image
                                src="/kominfos.svg"
                                alt="Logo Pemkot"
                                fill
                                className="object-contain"
                            />
                        </div>
                        <div className="text-center flex-1">
                            <h2 className="text-[14pt] font-serif uppercase tracking-widest text-black">Pemerintah Kota Makassar</h2>
                            <h1 className="text-[19pt] font-bold font-serif uppercase tracking-[0.1em] leading-tight mb-2 text-black scale-y-95">Dinas Komunikasi dan Informatika</h1>
                            <p className="text-[10pt] font-serif italic text-black">Jl. A. P. Pettarani No.62, Kota Makassar, Sulawesi Selatan</p>
                            <p className="text-[9pt] font-serif text-black">Website: diskominfo.makassar.go.id | Email: info@makassar.go.id</p>
                        </div>
                    </header>

                    {/* JUDUL DOKUMEN */}
                    <div className="text-center mb-10">
                        <h3 className="text-[16pt] font-bold uppercase underline decoration-[2px] underline-offset-4 tracking-wide text-black">Tanda Terima Dokumen Elektronik</h3>
                        <p className="text-[11pt] mt-2 text-black">Nomor Registrasi: <span className="font-bold tracking-wider font-mono bg-gray-100 px-2 border border-gray-300">{surat.trackingId}</span></p>
                    </div>

                    {/* ISI DOKUMEN */}
                    <div className="mb-8 text-[12pt] leading-relaxed text-black flex-1">
                        <p className="mb-6 text-justify indent-8">
                            Telah diterima dokumen elektronik melalui <span className="italic">Sistem Buku Tamu & Persuratan Digital Diskominfo Makassar</span> pada hari <span className="font-bold">{new Date(surat.date).toLocaleDateString("id-ID", { weekday: 'long' })}</span>, tanggal <span className="font-bold">{new Date(surat.date).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}</span>, dengan rincian sebagai berikut:
                        </p>

                        <div className="border border-black p-6 relative">
                            <span className="absolute -top-3 left-4 bg-white px-2 text-[10pt] font-bold italic">Rincian Surat</span>
                            <table className="w-full border-collapse text-[12pt]">
                                <tbody>
                                    <tr>
                                        <td className="py-2 w-48 align-top text-black">Waktu Penerimaan</td>
                                        <td className="py-2 align-top text-black font-semibold">: {new Date(surat.lastUpdated || surat.date).toLocaleString("id-ID", { dateStyle: 'full', timeStyle: 'short' })} WITA</td>
                                    </tr>
                                    <tr>
                                        <td className="py-2 w-48 align-top text-black">Pengirim</td>
                                        <td className="py-2 align-top text-black capitalize">: {surat.namaPengirim}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-2 w-48 align-top text-black">Instansi / Unit</td>
                                        <td className="py-2 align-top text-black uppercase">: {surat.instansiPengirim}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-2 w-48 align-top text-black">Ditujukan Kepada</td>
                                        <td className="py-2 align-top text-black font-bold">: {surat.tujuanUnit}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-2 w-48 align-top text-black">Jenis Surat</td>
                                        <td className="py-2 align-top text-black capitalize">: {surat.jenisSurat}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-2 w-48 align-top text-black">Perihal</td>
                                        <td className="py-2 align-top text-black italic text-justify block w-full" style={{ textIndent: '-0.7em', paddingLeft: '0.7em' }}>: "{surat.perihal}"</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* FOOTER & SIGNATURE */}
                    <div className="flex items-end justify-between mt-12 mb-8">
                        <div className="text-[9pt] italic text-black max-w-[60%] border-l-4 border-gray-300 pl-4 py-1">
                            <p className="font-bold mb-1">Catatan Sistem:</p>
                            <ul className="list-disc ml-4 space-y-0.5">
                                <li>Dokumen ini diterbitkan secara otomatis oleh sistem TNDE.</li>
                                <li>Simpan <b>Nomor Registrasi</b> atau <b>QR Code</b> untuk pengecekan status.</li>
                                <li>Validitas dokumen ini dapat diverifikasi melalui scan QR Code.</li>
                            </ul>
                        </div>

                        <div className="text-center w-[160px]">
                            <p className="text-[10pt] mb-4">Makassar, {new Date().toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            <div className="w-full h-auto border-2 border-black p-1 bg-white mb-2 mx-auto inline-block">
                                <div className="w-24 h-24 bg-black pattern-grid-lg flex items-center justify-center text-white text-[6pt] relative grayscale contrast-200">
                                    {/* MOCK QR CODE */}
                                    <div className="absolute inset-0 p-1 flex flex-wrap content-start">
                                        {Array.from({ length: 64 }).map((_, i) => (
                                            <div key={i} className={`w-[12.5%] h-[12.5%] ${Math.random() > 0.4 ? 'bg-white' : 'bg-transparent'}`} />
                                        ))}
                                        <div className="absolute top-0.5 left-0.5 w-6 h-6 border-2 border-white bg-black" />
                                        <div className="absolute top-0.5 right-0.5 w-6 h-6 border-2 border-white bg-black" />
                                        <div className="absolute bottom-0.5 left-0.5 w-6 h-6 border-2 border-white bg-black" />
                                    </div>
                                </div>
                            </div>
                            <p className="text-[8pt] font-mono font-bold tracking-widest border-t border-black pt-1">{surat.trackingId}</p>
                            <p className="text-[8pt] font-bold mt-0.5 uppercase">Layanan TNDE</p>
                        </div>
                    </div>
                </div>

                {/* BOTTOM TEAR-OFF LINE (Optional styling) */}
                <div className="border-t-2 border-dashed border-gray-400 pt-2 text-center">
                    <p className="text-[8pt] text-gray-500 uppercase tracking-[0.3em]">----- Gunting di sini -----</p>
                </div>
            </div>
        </div>
    );
}
