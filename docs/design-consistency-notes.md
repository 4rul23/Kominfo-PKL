# Design Consistency Notes
## Admin UI (Dummy Workflow)

Tujuan dokumen ini: memastikan semua fitur baru (Intake/Inbox/Cases/Directory/Org Units/Users/Notifications) terasa satu sistem yang sama.

---

## Visual Rules (yang dipakai di implementasi sekarang)
Colors:
- Primary: `#009FA9` (teal)
- Danger: `#991b1b` (red)
- Success: `#36B37E` (green)

Layout:
- Container: `space-y-6`
- Card: `bg-white border-2 border-gray-200 rounded-2xl`
- Card header: `p-4 border-b border-slate-100`

Buttons:
- Outline: `bg-white border-2 border-gray-200` + hover to teal border/text
- Primary: teal solid + shadow
- Danger: red outline + subtle red background hover

Inputs:
- Default: `bg-gray-50 border-2 border-gray-200 rounded-2xl`
- Focus: teal border + light ring

Tables:
- Thead: `bg-slate-50 border-b border-slate-100`
- TH: uppercase small text
- Hover row: `hover:bg-slate-50/50`

---

## Consistency Cleanup
- `/admin/operators` adalah route lama. Sekarang diarahkan ke `/admin/directory` agar tidak ada 2 fitur yang mirip.
- Notifikasi internal web menggunakan toast + bunyi yang konsisten dengan tema admin.

---

## Known Limits
- Notifikasi web hanya lintas-tab (browser yang sama), belum lintas-device.

