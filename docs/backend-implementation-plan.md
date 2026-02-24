# Backend Implementation Plan (Future)
## Diskominfo Guestbook: Cases + RBAC + Persistence

This document describes the **future backend** work. The current app intentionally runs as a **dummy/POC** using `localStorage` for all data and `sessionStorage` for staff sessions.

---

## 1. Goals
- Centralize data for multi-device use (staff/visitor).
- Proper authentication + RBAC (`admin`, `receptionist`, `operator`).
- Persist and query operational workflow objects: `cases` + `case_events`.
- Make WhatsApp/bot integration feasible via server-side triggers.

Non-goals for first backend cut:
- Complex approval workflow for Kabid/Kadis (they can stay as contact-only).
- Full-blown ticketing system features (SLA engine, escalation policies, etc.).

---

## 2. Target Stack
- Next.js API Routes (`src/app/api/*`)
- PostgreSQL
- ORM: Drizzle (recommended)
- Auth: Custom JWT (access + refresh cookie)
- Validation: Zod
- Background jobs: (later) BullMQ + Redis

---

## 3. Data Model (DB)
### 3.1 users
- `id` (uuid pk)
- `username` (unique)
- `name`
- `nip_nik` (unique, nullable)
- `instansi` (enum: diskominfo, upt)
- `role` (enum: admin, receptionist, operator)
- `org_unit_id` (fk org_units.id, nullable)
- `whatsapp` (nullable)
- `is_active` (bool)
- `password_hash`
- timestamps

### 3.2 org_units
- `id` (string code pk, ex: `BIDANG_APTIKA`)
- `code` (unique)
- `name`
- `type` (enum: root, sekretariat, subbag, bidang, upt, pool)
- `parent_id` (fk org_units.id, nullable)
- timestamps

### 3.3 org_unit_contacts
- `id` (uuid pk)
- `org_unit_id` (fk)
- `contact_type` (enum: lead, backup, receptionist, kadis)
- `user_id` (fk users.id, nullable)
- `name_override` (nullable)
- `whatsapp` (nullable)
- timestamps

### 3.4 visitors
Mirror the existing `Visitor` object currently stored in localStorage.

### 3.5 surat_elektronik
Mirror the existing `SuratElektronik` object currently stored in localStorage.

### 3.6 cases
- `id` (uuid pk)
- `case_type` (enum: visitor, surat)
- `status` (enum: new, triaged, assigned, acknowledged, in_progress, escalated, closed, cancelled)
- `priority` (enum: normal, high, urgent)
- `unit_tujuan` (enum: upt_warroom, diskominfo)
- `org_unit_id` (fk, nullable)
- `assigned_to_user_id` (fk users.id, nullable)
- `subject`, `description`
- `created_by_user_id` (fk users.id, nullable)
- `source` (enum: walkin, register, qr, whatsapp, surat_form)
- `related_visitor_id` (fk visitors.id, nullable)
- `related_surat_id` (fk surat_elektronik.id, nullable)
- `sla_due_at` (nullable)
- timestamps

### 3.7 case_events
- `id` (uuid pk)
- `case_id` (fk)
- `actor_user_id` (fk users.id, nullable)
- `event_type` (enum)
- `payload_json` (jsonb)
- `created_at`

Indexes:
- cases: `(status)`, `(assigned_to_user_id, status)`, `(related_visitor_id)`, `(related_surat_id)`
- case_events: `(case_id, created_at)`

---

## 4. API Endpoints (Phase 1)
Auth:
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`

Org structure:
- `GET/POST /api/org-units`
- `PATCH/DELETE /api/org-units/:id`
- `GET/POST /api/org-unit-contacts`

Users:
- `GET/POST /api/users` (admin only)
- `PATCH/DELETE /api/users/:id`

Cases:
- `GET/POST /api/cases` (role-limited)
- `GET/PATCH /api/cases/:id`
- `GET/POST /api/cases/:id/events`

Visitors/Surat:
- `POST /api/visitors` should create both `visitors` and a linked `case`
- `POST /api/surat` should create both `surat_elektronik` and a linked `case`

---

## 5. Frontend Migration Plan
1. Keep UI as-is, add a `dataProvider` abstraction:
   - `localStorageProvider` (current)
   - `apiProvider` (new)
2. Start migrating route by route:
   - `/admin/intake`, `/admin/inbox`, `/admin/cases/:id` first
   - then `/admin/directory`, `/admin/users`, `/admin/org-units`
   - then visitors/surat pages
3. Add server-side guard via middleware once auth exists.

---

## 6. Data Migration (Dummy -> DB)
Because dummy data lives in browsers, migration is optional.
If needed:
- Add admin-only "Import JSON" tool that accepts exported dumps and writes to DB.
- Or ship a one-time script that reads dump files and inserts rows.

---

## 7. Definition of Done (Backend Phase 1)
- Staff can login from any device.
- Cases created from visitor and surat submissions persist in DB.
- Resepsionis can triage+assign operator; operator can update status, add note, escalate (event logged).
- Directory page reads from DB (users + contacts).
- Audit trail (`case_events`) is complete and queryable.

