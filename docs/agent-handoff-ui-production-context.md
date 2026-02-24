# UI Production Handoff
## Diskominfo Guestbook -> Temporary Attendance Mode (Lontara+)

Last updated: 2026-02-24  
Working branch: `feature/pengabsenan-2026-02-24`

---

## 1) Why This Pivot Exists
This app is temporarily repurposed for **attendance intake** for the Lontara+ coordination meeting, while still preserving the design language and most existing structure of the guestbook app.

Current operational priority:
1. Fast lobby input for participants.
2. Stable UI flow for operators.
3. Dummy/local mode only (no backend, no WA bot automation).

---

## 2) Current Production Scope (Active)
### Active pages
- `/register`: full-screen attendance wizard (2 required input steps + completion screen).
- `/`: home dashboard showing attendance count and latest participants.

### Data persistence mode
- `localStorage` only.
- No server persistence yet.
- No multi-device sync guarantee.

### Out of scope for now
- Backend API migration.
- WhatsApp bot automation.
- DB/auth hardening.

---

## 3) What Has Been Implemented

### Register flow revamp
- File: `src/app/register/page.tsx`
- Now renders `AttendanceWizard` (full-screen old-style wizard visual), replacing simple card form.

### New attendance wizard component
- File: `src/components/AttendanceWizard.tsx`
- Steps:
1. `Nama Lengkap` (required)
2. `Jabatan/Unit Peserta` from official invitation list (required)
- Submit behavior:
  - Save to local JSON storage.
  - Show modern completion card in full-focus mode (header hidden).
  - Completion content: status sukses + nama + jabatan/unit.
  - Auto-reset in 4 seconds for next participant.
  - Manual continue button remains available.
- UX target:
  - Large typography and controls (older PNS friendly).
  - Quick repetitive lobby input.

### Attendance schema upgrade + backward compatibility
- File: `src/lib/attendanceStore.ts`
- New `AttendanceEntry` shape:
  - `id`
  - `name`
  - `jabatan`
  - `instansi`
  - `participantId`
  - `participantLabel`
  - `source` (`"lontara_2026_02_23"`)
  - `createdAt`
- Storage key remains:
  - `diskominfo_attendance_temp_json`
- Backward compatibility:
  - Older entries (`name` + `jabatan` only) are normalized with safe fallback.

### Official participant master list
- File: `src/lib/meetingParticipants.ts`
- Contains 27 participant options (per invitation attachment row).
- Includes expected attendance count aggregate:
  - `LONTARA_EXPECTED_PARTICIPANTS = 61`

### Home page sync updates
- File: `src/app/page.tsx`
- Reads live attendance data from `attendanceStore`.
- `Peserta Terbaru` now reflects stored attendance entries.
- Stats card now shows:
  - total attendance today
  - progress `hadir / 61`

### Accessibility tuning (register scope)
- File: `src/app/globals.css`
- Added scoped classes:
  - `.register-a11y-root`
  - `.register-a11y-input`
  - `.register-a11y-select`
  - `.register-a11y-btn`
- Purpose:
  - larger text
  - larger hit area
  - better readability for older operators

### Test coverage docs update
- File: `docs/test-cases.md`
- Added section:
  - `Test Cases Mode Absensi Rapat Lontara+ (Dummy JSON)` (`TC-ABS-01` to `TC-ABS-08`)

---

## 4) UI Contract (Do Not Break)
When other agents continue UI work, keep these contracts stable:

1. Required register fields must stay exactly 2:
   - `Nama Lengkap`
   - `Jabatan/Unit Peserta` (dropdown from master list)
2. Success completion must use full-focus layout (header hidden while success is shown).
3. Completion content is intentionally concise: `nama + jabatan/unit` only.
4. Success screen must auto-reset around 4 seconds while preserving manual continue button.
5. Storage key must remain `diskominfo_attendance_temp_json`.
6. Entry fields above must remain available in stored JSON.
7. Register page must stay quick for kiosk/lobby repeated entry.

---

## 5) Known Technical Context
1. Repo contains many pre-existing modified files (ongoing refactor and feature work).
2. Global `npm run lint` currently fails mostly in older/legacy modules not related to this attendance pivot.
3. Targeted lint + TypeScript checks for new attendance files pass.
4. This is still dummy mode: behavior is browser-local, not centralized.

---

## 6) Suggested UI Workstream For Other Agents
Recommended order for UI agents:

1. **Visual polish pass (register)**
   - Improve motion/transitions while keeping current flow/contract.
   - Keep high readability and large controls.

2. **Home dashboard polish**
   - Improve latest participant card hierarchy.
   - Keep progress metric (`hadir / 61`) visible.

3. **Consistency pass across public pages**
   - Align spacing, button styles, and typography between `/` and `/register`.
   - Avoid introducing a different visual language.

4. **Device QA pass**
   - Desktop kiosk (primary)
   - Laptop
   - Tablet/mobile fallback layout

---

## 7) Agent Guardrails
For any UI-only continuation on this branch:
1. Do not add backend/API dependencies.
2. Do not remove existing attendance fields from JSON schema.
3. Do not replace dropdown list source with ad-hoc text input.
4. Keep fonts and sizing friendly for older staff users.
5. Keep `/register` fast and minimal in interaction cost.

---

## 8) Validation Checklist (Before Merge)
1. Register can submit valid data end-to-end.
2. Invalid step cannot proceed.
3. Completion auto-reset works in ~4 seconds and manual continue works instantly.
4. Home reflects recent submitted participants.
5. Data in localStorage includes new fields.
6. UI remains readable on lobby display.

---

## 9) Related Docs
- `docs/test-cases.md`
- `docs/design-consistency-notes.md`
- `docs/backend-implementation-plan.md` (future, not active now)
- `docs/whatsapp-bot-plan.md` (future, not active now)
