# Test Cases (Dummy Workflow)
## Diskominfo Guestbook: Lobby -> Resepsionis -> Operator -> Lead/Kadis

Dokumen ini berisi **test case manual** untuk memastikan alur dummy sudah berjalan (tanpa backend dan tanpa WhatsApp bot).

> Catatan penting (dummy):
> - Data tersimpan di `localStorage` (per browser/device).
> - Session login tersimpan di `sessionStorage` (per tab).
> - Notifikasi web (toast + bunyi) bekerja paling baik untuk **2 tab di browser yang sama**.

---

## 0. Akun Dummy
Login di `/admin`:
- Admin: `admin / admin123`
- Resepsionis: `resepsionis / reseps123`
- Operator UPT: `operator-upt / op123`
- Operator APTIKA: `operator-aptika / op123`

---

## 1. TC-01 Lobby Visitor -> UPT Warroom -> Assign Operator -> Operator Ack/In Progress -> Eskalasi Koordinator UPT -> Close
**Tujuan:** memastikan alur utama UPT Warroom berjalan end-to-end.

**Precondition:**
- Buka 2 tab browser.
- Tab A login sebagai `resepsionis`.
- Tab B login sebagai `operator-upt`.

**Steps:**
1. (Tab C / device kiosk) buka `/register`.
2. Isi data visitor:
   - Unit tujuan: `UPT Warroom`
   - Lengkapi sampai tanda tangan, submit.
3. (Tab A) buka `/admin/intake`.
4. Pastikan case baru muncul di tabel “Antrian Baru”.
5. Klik `Buka` pada case.
6. Di halaman case:
   - Pilih `Org Unit`: `UPT Warroom`
   - Pilih `Operator`: `Operator UPT Warroom`
   - Klik `Assign Operator`
7. Pastikan operator menerima **toast + bunyi** (Tab B).
8. (Tab B) buka `/admin/inbox` → klik case tersebut.
9. Operator ubah status:
   - `acknowledged`
   - lalu `in_progress`
10. Operator klik `Eskalasi Lead` (manual membuka WhatsApp link).
11. Operator ubah status `closed`.

**Expected results:**
- Case dibuat otomatis saat register.
- Muncul di `/admin/intake` sebagai `new`.
- Setelah assign, case status menjadi `assigned`.
- Operator melihatnya di `/admin/inbox`.
- Update status tercatat di audit trail (event).
- Tombol `Eskalasi Lead` aktif jika lead contact untuk org unit tersedia.
- Resepsionis menerima notifikasi web (toast + bunyi) untuk status update dan eskalasi.

---

## 2. TC-02 Lobby Visitor -> Diskominfo -> Assign Operator APTIKA -> Operator Koordinasi Antar Operator (Directory) -> Close
**Tujuan:** memastikan routing ke bidang Diskominfo + koordinasi operator.

**Precondition:**
- Tab A login `resepsionis` (atau `admin`).
- Tab B login `operator-aptika`.

**Steps:**
1. Buat visitor lewat `/register` dan pilih `Diskominfo Makassar`.
2. (Tab A) di `/admin/intake` buka case baru.
3. Assign:
   - Org Unit: `BIDANG_APTIKA`
   - Operator: `Operator Bidang APTIKA`
4. (Tab B) pastikan toast bunyi muncul, lalu buka `/admin/inbox` dan buka case.
5. Operator buka `/admin/directory`, cari operator lain (bila ada) dan klik `Chat` (manual wa.me).
6. Operator set status `closed`.

**Expected results:**
- Case masuk intake dan bisa di-assign ke org unit bidang.
- Inbox operator berisi case assigned.
- Directory dapat difilter dan bisa click-to-chat operator.

---

## 3. TC-03 Surat Elektronik -> Case Otomatis -> Assign -> Operator Update Status + Note
**Tujuan:** memastikan surat juga membuat case dan masuk intake.

**Precondition:**
- Tab A login `admin` atau `resepsionis`.
- Tab B login `operator-aptika` (atau operator lain yang dibuat).

**Steps:**
1. Buka `/surat` dan submit surat elektronik sampai sukses.
2. (Tab A) buka `/admin/surat`:
   - Pastikan surat muncul.
   - Kolom `Case` harus berisi link status (atau minimal bisa dibuka dari intake).
3. Buka `/admin/intake`, pastikan ada case jenis `surat`.
4. Buka case, assign operator.
5. Operator buka `/admin/inbox`, ubah status `acknowledged`, tambah `catatan`, lalu `closed`.

**Expected results:**
- Submit surat membuat case otomatis.
- Case bisa ditriase + assign.
- Catatan operator memunculkan notifikasi web ke resepsionis/admin.

---

## 4. TC-04 Notifikasi Web (Toast + Bunyi)
**Tujuan:** memastikan notifikasi internal bekerja tanpa WA bot.

**Precondition:**
- Buka 2 tab browser (profil yang sama).
- Tab A login `resepsionis`.
- Tab B login `operator-upt`.

**Steps:**
1. Buat case visitor baru (via `/register`).
2. (Tab A) assign operator.
3. (Tab B) verifikasi toast + bunyi.
4. (Tab B) update status `acknowledged`.
5. (Tab A) verifikasi toast + bunyi status update.

**Expected results:**
- Toast muncul di kanan atas.
- Bunyi beep terdengar (kalau `Sound ON`).
- Tombol `Desktop ON` meminta permission dan jika granted akan memunculkan desktop notification.

---

## 5. TC-05 Lead Contact Missing (Eskalasi Disabled)
**Tujuan:** memastikan edge case “lead belum diset” menghasilkan UI yang jelas.

**Precondition:**
- Login `admin`.

**Steps:**
1. Buka `/admin/org-units`.
2. Pilih salah satu org unit bidang, kosongkan `Lead WhatsApp`.
3. Buat case dan assign operator ke bidang tersebut.
4. Login operator dan buka case.

**Expected results:**
- Tombol `Eskalasi Lead` disabled.
- Tooltip / title menyebut “Lead contact belum diset”.

---

## 6. TC-06 RBAC Navigation
**Tujuan:** memastikan menu dan akses halaman sesuai role.

**Steps:**
1. Login sebagai `resepsionis`.
   - Expected: bisa akses `/admin/intake`, `/admin/directory`, `/admin/visitors`, `/admin/surat`, `/admin/notifications`.
   - Expected: tidak bisa akses `/admin/users` dan `/admin/org-units` (harus ada halaman “Tidak punya akses”).
2. Login sebagai `operator-aptika`.
   - Expected: bisa akses `/admin/inbox`, `/admin/directory`, `/admin/notifications`.
   - Expected: tidak bisa akses `/admin/intake`, `/admin/users`, `/admin/org-units`, `/admin/visitors`, `/admin/surat`.
3. Login sebagai `admin`.
   - Expected: semua halaman bisa diakses.

---

## 7. Catatan Pengujian (Dummy Limitations)
- Lintas device (resepsionis laptop -> operator HP) belum bisa untuk notifikasi web.
- Untuk lintas device perlu backend realtime (WebSocket/SSE) atau push notifications.

---

## 8. Test Cases Mode Absensi Rapat Lontara+ (Dummy JSON)

### TC-ABS-01 Submit valid
**Tujuan:** memastikan submit field wajib tersimpan ke JSON lokal.

**Steps:**
1. Buka `/register`.
2. Isi langkah 1: `Nama Lengkap`.
3. Isi langkah 2: pilih `Jabatan/Unit Peserta` dari dropdown lampiran surat.
4. Klik `Simpan Kehadiran`.

**Expected:**
- Muncul layar sukses.
- Data tersimpan di localStorage key `diskominfo_attendance_temp_json`.
- Entry berisi `name`, `jabatan`, `instansi`, `participantId`, `participantLabel`, `source`, `createdAt`.

### TC-ABS-02 Required validation
**Tujuan:** form tidak bisa lanjut/submit jika field wajib belum terisi.

**Steps:**
1. Biarkan nama kosong di langkah 1.
2. Coba klik `Lanjut`.
3. Isi nama lalu di langkah 2 jangan pilih dropdown.
4. Coba klik `Lanjut`.
5. Pilih dropdown lalu cek tombol submit aktif.

**Expected:**
- Tombol tetap disabled pada tiap langkah invalid.
- Pesan error tampil saat submit final invalid.

### TC-ABS-03 Success auto-reset
**Tujuan:** layar sukses kembali ke form kosong otomatis untuk peserta berikutnya.

**Steps:**
1. Submit satu data absensi valid.
2. Diamkan layar sukses tanpa klik apa pun.

**Expected:**
- Dalam rentang 3.8 - 4.2 detik, wizard kembali ke langkah 1.
- Seluruh input kosong.

### TC-ABS-04 Dropdown per surat (27 opsi)
**Tujuan:** memastikan semua opsi lampiran surat tersedia.

**Steps:**
1. Buka langkah 2 dropdown `Jabatan/Unit Peserta`.
2. Scroll daftar sampai bawah.

**Expected:**
- Jumlah opsi sesuai 27 baris daftar peserta lampiran surat.
- Opsi terakhir: `Admin Lontara+ Dinas Komunikasi dan Informatika Kota Makassar`.

### TC-ABS-05 Home sync
**Tujuan:** data absensi terbaru tampil di beranda.

**Steps:**
1. Submit 1 peserta dari `/register`.
2. Buka `/`.

**Expected:**
- Nama peserta muncul di card `Peserta Terbaru`.
- Statistik progress menunjukkan `total hadir / 61`.

### TC-ABS-06 Backward compatibility data lama
**Tujuan:** data lama schema lama (`name` + `jabatan`) tidak membuat crash.

**Steps:**
1. Isi localStorage `diskominfo_attendance_temp_json` dengan entry lama (tanpa `instansi/participant*`).
2. Reload `/`.

**Expected:**
- Aplikasi tetap jalan normal.
- Nilai field baru diberi fallback default.

### TC-ABS-07 A11y PNS
**Tujuan:** memastikan keterbacaan tinggi untuk operator senior.

**Steps:**
1. Buka `/register` di monitor lobby.
2. Periksa ukuran teks judul, input, tombol, dan jarak antar elemen.

**Expected:**
- Teks utama besar dan kontras.
- Area klik tombol/input cukup luas dan nyaman.

### TC-ABS-08 JSON export compatibility
**Tujuan:** memastikan struktur data siap dipakai rekap.

**Steps:**
1. Isi beberapa data absensi.
2. Buka DevTools -> Application -> Local Storage.
3. Salin nilai `diskominfo_attendance_temp_json`.

**Expected:**
- Tiap objek memiliki field:
  `id`, `name`, `jabatan`, `instansi`, `participantId`, `participantLabel`, `source`, `createdAt`.

---

## 9. Test Cases Completion Screen Civic Premium (`/register`)

### TC-COMP-01 Full focus mode
**Tujuan:** memastikan completion tampil fokus penuh tanpa header form.

**Steps:**
1. Buka `/register`.
2. Isi data valid sampai submit.

**Expected:**
- Setelah submit sukses, header atas (`Absensi Rapat / Tutup`) tidak tampil.
- Completion menjadi fokus utama di tengah layar.

### TC-COMP-02 Content scope (nama + jabatan)
**Tujuan:** memastikan konten completion ringkas sesuai kontrak.

**Steps:**
1. Submit data absensi valid.
2. Observasi konten completion.

**Expected:**
- Hanya menampilkan status sukses + `Nama` + `Jabatan/Unit`.
- Tidak menampilkan `instansi` dan tidak menampilkan card progress hadir/target.

### TC-COMP-03 Auto-reset ~4 detik
**Tujuan:** memastikan timeout resmi berjalan sesuai ketentuan.

**Steps:**
1. Submit data valid.
2. Ukur jeda dari completion muncul sampai form kembali ke langkah awal.

**Expected:**
- Wizard reset otomatis dalam rentang 3.8 - 4.2 detik.
- Form kembali ke langkah 1 dengan input kosong.

### TC-COMP-04 Manual reset button
**Tujuan:** memastikan operator bisa lanjut peserta berikutnya tanpa menunggu timeout.

**Steps:**
1. Submit data valid.
2. Klik tombol `Peserta Berikutnya` di completion.

**Expected:**
- Reset terjadi instan.
- Kembali ke langkah 1 tanpa delay.

### TC-COMP-05 Long label handling
**Tujuan:** memastikan jabatan panjang tidak merusak layout.

**Steps:**
1. Pilih salah satu opsi jabatan paling panjang dari daftar.
2. Submit sampai completion.

**Expected:**
- Teks jabatan wrap rapi multi-line.
- Tidak overflow keluar card dan tidak memunculkan scroll horizontal.

### TC-COMP-06 Keyboard + aria-live
**Tujuan:** memastikan aksesibilitas completion untuk keyboard/screen-reader.

**Steps:**
1. Submit data valid.
2. Verifikasi fokus keyboard otomatis berada pada tombol `Peserta Berikutnya`.
3. Tekan `Enter` atau `Space` di tombol tersebut.

**Expected:**
- `Enter/Space` memicu reset seperti klik.
- Region status sukses dibaca sebagai update polite (`aria-live=polite`).

### TC-COMP-07 Responsive checkpoints
**Tujuan:** memastikan layout completion tetap stabil di berbagai resolusi.

**Steps:**
1. Uji di viewport:
   - `1920x1080`
   - `1366x768`
   - `768x1024`
   - `390x844`
2. Submit data valid di masing-masing viewport.

**Expected:**
- Elemen utama tetap center dan terbaca.
- Tombol tidak keluar layar.
- Tidak ada clipping visual pada seal/countdown.

### TC-COMP-08 Reduced motion fallback
**Tujuan:** memastikan mode motion minimal tetap usable.

**Steps:**
1. Aktifkan `prefers-reduced-motion` di OS/browser.
2. Submit data valid dan lihat completion.

**Expected:**
- UI tetap jelas tanpa animasi intens.
- Countdown tetap memiliki indikasi visual statis.
- Interaksi tombol tetap normal.
