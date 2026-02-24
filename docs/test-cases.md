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

