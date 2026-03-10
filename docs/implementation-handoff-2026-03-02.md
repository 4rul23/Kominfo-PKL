# Diskominfo Guestbook -> Attendance Mode
## Implementation Handoff (Updated: 2026-03-02)

This document captures the current production context and what has been implemented so far for the temporary attendance use-case (Rapat Koordinasi Lontara+).

## 1) Current Product Scope

The app is currently repurposed from general guestbook flow into **attendance intake** with these core goals:

1. Record meeting attendance quickly from a single kiosk/desktop station.
2. Enforce participant quota based on invitation list.
3. Show near-realtime attendance summary on the main dashboard.
4. Produce reporting outputs (PDF, XLSX, CSV) from database data.

Primary user flow:

1. Operator opens `/register`.
2. Fills participant data.
3. Saves attendance.
4. Dashboard `/` updates automatically.
5. Data exported for reporting when needed.

## 2) Data Layer (Now on PostgreSQL + Prisma)

Attendance is now persisted in PostgreSQL (Neon), not browser localStorage.

### Prisma model
File: `prisma/schema.prisma`

Table `attendances` with fields:

- `id`
- `name`
- `jabatan`
- `instansi`
- `phoneNumber`
- `nip`
- `participantId`
- `participantLabel`
- `participantRole`
- `selfieDataUrl` (nullable)
- `source`
- `createdAt`

Indexes:

- `createdAt DESC`
- `(source, createdAt)`
- `(participantId, createdAt)`

## 3) API + Realtime

### Attendance API
File: `src/app/api/attendance/route.ts`

Endpoints:

- `GET /api/attendance` -> list attendance rows (newest first)
- `POST /api/attendance` -> validates and inserts one attendance row
- `DELETE /api/attendance` -> clear all attendance rows

### Realtime stream (SSE)
Files:

- `src/app/api/attendance/stream/route.ts`
- `src/lib/attendanceRealtimeHub.ts`

Behavior:

- Server emits `attendance-updated` events on create/delete.
- Keep-alive comment sent periodically.
- Dashboard client subscribes using `EventSource`.

### Dashboard auto-update behavior
File: `src/app/page.tsx`

Implemented:

1. Realtime stream enabled by default.
2. `NEXT_PUBLIC_ENABLE_ATTENDANCE_STREAM=false` can disable stream explicitly.
3. Fast fallback polling every 5s when stream unavailable/disconnected.
4. Slow reconciliation polling every 30s when stream connected.

## 4) Register UI (Attendance Wizard)

File: `src/components/AttendanceWizard.tsx`

Current wizard structure:

1. Step 1: Nama Lengkap
2. Step 2: Nomor HP
3. Step 3: NIP/NIK
4. Step 4: Jabatan/Unit + role selector (for SKPD items with role split)
5. Completion screen:
   - Focused success UI
   - Auto reset 4 seconds
   - Manual reset button (`Peserta Berikutnya`)

Important UX rules:

- Camera/swafoto step is disabled from active flow.
- Inputs for HP and NIP are digit-only at UI level.
- NIP input capped at 20 chars.

## 5) Validation + Anti-Abuse Rules (Backend-Enforced)

Core validation location:

- `src/lib/attendanceCore.ts`

### Name validation

- Required
- Max 80 chars
- Allowed letters/punctuation only
- Minimum 4 letters (compact)
- Reject repeated-character spam pattern
- Reject obvious dummy strings (`asd`, `qwe`, `test`, etc.)

### Phone validation

- Required
- Normalized to Indonesian format `62...`
- Must match Indonesian mobile pattern (`628...`)

### NIP/NIK validation

- Required
- Digits only
- Length 8 to 20 digits
- Reject fully repeated-digit values

### Attendance quota and duplication

- Total daily source quota cannot exceed invitation target.
- Per participant unit quota enforced.
- Per role quota enforced for SKPD split roles (e.g., Kepala/Operator).
- Duplicate NIP rejected for same day/source.
- Duplicate name in same unit/day rejected.

## 6) Mobile Restriction + Typography

### Mobile block overlay
Files:

- `src/components/MobileUnsupportedOverlay.tsx`
- `src/app/layout.tsx`

Behavior:

- Detects mobile-like devices (screen width + coarse pointer / mobile user agent).
- Shows blocking overlay with Kominfo logo and message:
  `Untuk sekarang gak ada support Mobile :)`

### Font
File: `src/app/layout.tsx`

- App uses `Space Grotesk` as primary UI font.

## 7) Reporting / Export Tools

All scripts in `scripts/` and wired in `package.json`.

### PDF export
File: `scripts/export-attendance-report-pdf.mjs`
Command:

```bash
npm run report:attendance:pdf -- --all
```

Outputs:

- Attendance detail
- Per-unit recap
- Remaining slots (not yet attended)
- Includes Kominfo logo (`public/kominfos.svg`)

### XLSX export
File: `scripts/export-attendance-report-xlsx.mjs`
Command:

```bash
npm run report:attendance:xlsx -- --all
```

Sheets:

1. `Ringkasan`
2. `Peserta Hadir`
3. `Belum Hadir`

### CSV export (raw data via Prisma ORM)
File: `scripts/export-attendance-report-csv.mjs`
Command:

```bash
npm run report:attendance:csv -- --all
```

CSV fields include:

- Raw attendance columns from DB
- Extra `createdAtMakassar` formatted timestamp

## 8) Seed Utility

File: `scripts/seed-attendance-db.mjs`
Command:

```bash
npm run db:seed:attendance
```

Behavior:

- Reads `data/attendance.json`
- Clears existing attendance
- Inserts rows into DB

## 9) Environment Requirements

Minimum env:

- `DATABASE_URL` (Neon/PostgreSQL)

Optional env:

- `NEXT_PUBLIC_ENABLE_ATTENDANCE_STREAM=false` to disable realtime stream

## 10) Current Known Constraints / Notes

1. This mode is optimized for single-kiosk operation.
2. Some older docs still mention localStorage; this handoff doc reflects latest state.
3. Export scripts write into `reports/` and generated artifacts are gitignored.
4. Attendance source default is fixed to `lontara_2026_02_23` unless overridden by script flags.

## 11) Quick Runbook

### Run app
```bash
npm install
npm run dev
```

### Generate all reports
```bash
npm run report:attendance:pdf -- --all
npm run report:attendance:xlsx -- --all
npm run report:attendance:csv -- --all
```

### Export for one date (Makassar local date)
```bash
npm run report:attendance:pdf -- --date 2026-02-26
npm run report:attendance:xlsx -- --date 2026-02-26
npm run report:attendance:csv -- --date 2026-02-26
```

## 12) File Map (Important)

- `src/components/AttendanceWizard.tsx`
- `src/lib/attendanceCore.ts`
- `src/lib/attendanceStore.ts`
- `src/app/api/attendance/route.ts`
- `src/app/api/attendance/stream/route.ts`
- `src/lib/attendanceRealtimeHub.ts`
- `src/app/page.tsx`
- `src/components/MobileUnsupportedOverlay.tsx`
- `src/app/layout.tsx`
- `scripts/export-attendance-report-pdf.mjs`
- `scripts/export-attendance-report-xlsx.mjs`
- `scripts/export-attendance-report-csv.mjs`
- `scripts/seed-attendance-db.mjs`

