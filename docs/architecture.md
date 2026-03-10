# Architecture Guide

## Overview

`diskominfo-guestbook-next` is a Next.js App Router application that mixes a real backend for attendance with browser-local prototype modules for internal operations.

At a high level the system is split into four layers:

1. Public experience layer
2. Admin workflow layer
3. Attendance backend layer
4. Reporting and support scripts layer

## Layer breakdown

### 1. Public experience layer

Main files:

- `src/app/page.tsx`
- `src/app/register/page.tsx`
- `src/app/e/[eventCode]/page.tsx`
- `src/app/e/[eventCode]/register/page.tsx`
- `src/app/surat/page.tsx`
- `src/app/surat/tracking/page.tsx`
- `src/components/RegisterPageShell.tsx`
- `src/components/AttendanceWizard.tsx`
- `src/components/RegistrationWizard.tsx`

Responsibilities:

- Render the digital lobby UI.
- Show live attendance counts and recent attendees.
- Support event-aware registration.
- Collect surat elektronik submissions.
- Provide tracking for submitted surat.

### 2. Admin workflow layer

Main files:

- `src/app/admin/layout.tsx`
- `src/app/admin/page.tsx`
- `src/app/admin/intake/page.tsx`
- `src/app/admin/inbox/page.tsx`
- `src/app/admin/directory/page.tsx`
- `src/app/admin/notifications/page.tsx`
- `src/app/admin/surat/page.tsx`
- `src/app/admin/events/page.tsx`
- `src/app/admin/visitors/page.tsx`
- `src/app/admin/users/page.tsx`
- `src/app/admin/org-units/page.tsx`
- `src/app/admin/cases/[id]/page.tsx`

Responsibilities:

- Perform dummy sign-in and session management.
- Route users based on role.
- Present dashboard and operational queues.
- Manage event configuration and secure registration links.
- Handle receptionist triage and operator follow-up.
- Surface browser notifications and WhatsApp escalation shortcuts.

### 3. Attendance backend layer

Main files:

- `src/app/api/attendance/route.ts`
- `src/app/api/attendance/stream/route.ts`
- `src/app/api/attendance-events/route.ts`
- `src/app/api/attendance-events/token/route.ts`
- `src/lib/attendanceStore.ts`
- `src/lib/attendanceCore.ts`
- `src/lib/attendanceRealtimeHub.ts`
- `src/lib/attendanceEventUtils.ts`
- `src/lib/eventAccessToken.ts`
- `src/lib/prisma.ts`
- `prisma/schema.prisma`

Responsibilities:

- Validate attendance submissions.
- Read and write attendance rows through Prisma.
- Manage active events and event metadata.
- Generate and verify signed event registration links.
- Push attendance updates to browsers through SSE.

### 4. Reporting and support scripts layer

Main files:

- `scripts/seed-attendance-db.mjs`
- `scripts/export-attendance-report-pdf.mjs`
- `scripts/export-attendance-report-xlsx.mjs`
- `scripts/export-attendance-report-csv.mjs`
- `data/attendance.json`
- `reports/*`

Responsibilities:

- Seed attendance data into PostgreSQL.
- Export reports from attendance records.
- Produce example artifacts used for stakeholder review.

## Runtime model

### Public attendance flow

1. Home page loads events from `/api/attendance-events`.
2. It determines the selected event source from query string, active event, or default source.
3. It fetches attendance entries from `/api/attendance?source=...`.
4. It subscribes to `/api/attendance/stream?source=...`.
5. New attendance submissions trigger `emitAttendanceUpdated(...)` on the server.
6. Connected clients refresh their snapshots.

### Event registration flow

1. User opens `/register` or `/e/[eventCode]/register`.
2. Event code is normalized with helpers in `attendanceEventUtils.ts`.
3. If token enforcement is enabled, `eventAccessToken.ts` verifies the signed query token.
4. Registration form collects attendee data.
5. Submission posts to `/api/attendance`.
6. `attendanceCore.ts` validates and normalizes the entry.
7. Prisma persists the row.
8. SSE clients receive an update event.

### Surat to case workflow

1. User submits the wizard at `/surat`.
2. `suratStore.ts` creates a local surat record with tracking ID, status history, and SLA.
3. `caseStore.ts` immediately creates a related operational case.
4. Receptionist sees the case in `/admin/intake`.
5. Operator sees assigned work in `/admin/inbox`.
6. Surat management screens use the same browser-local records for status updates and disposisi.

This workflow is functionally connected in the UI, but persistence is still client-local.

## Storage architecture

### Database-backed modules

#### `Attendance`

Stored in PostgreSQL with these practical responsibilities:

- attendee identity and contact data
- organization and job title
- event/source classification
- participant role grouping
- timestamps for reporting and dashboard counts

#### `AttendanceEvent`

Stored in PostgreSQL and used for:

- active event selection
- event-specific dashboards
- event register link generation
- event-based filtering in the public lobby

### Browser-local modules

Stored in browser storage:

- `diskominfo_visitors`
- `diskominfo_surat_elektronik`
- `diskominfo_cases`
- `diskominfo_case_events`
- `diskominfo_staff_users`
- `diskominfo_org_units`
- `diskominfo_org_unit_contacts`
- `diskominfo_staff_session` in `sessionStorage`
- web notification storage

Implications:

- data is not shared between browsers
- clearing browser storage removes operational history
- dummy auth is not secure
- surat attachments are stored as base64 strings, so browser quota and local-device privacy both matter
- browser-only modules are suitable for demos and workflow prototyping, not production operations

## Role model

Roles are defined in `src/lib/staffStore.ts`:

- `admin`
- `receptionist`
- `operator`

Access is enforced in `src/app/admin/layout.tsx` through route checks.

Typical access:

- `admin`: full access
- `receptionist`: dashboard, intake, visitors, surat, notifications, cases, directory
- `operator`: inbox, notifications, directory, cases

## Event security model

Signed event links are generated by `src/app/api/attendance-events/token/route.ts`.

Mechanism:

- payload contains version, purpose, event code, and expiry timestamp
- payload is encoded as Base64URL
- signature is `HMAC-SHA256(payloadB64, ATTENDANCE_EVENT_TOKEN_SECRET)`
- final token format is `payload.signature`

Validation happens in `src/lib/eventAccessToken.ts`.

This gives basic integrity and expiry control for event-specific registration links without introducing full user authentication.

## Realtime architecture

Attendance realtime updates are handled by an in-memory hub in `src/lib/attendanceRealtimeHub.ts`.

Properties:

- transport: Server-Sent Events
- server runtime: Node.js route handlers
- client subscription: `EventSource`
- fallback: periodic 5-second polling when stream is disabled or disconnected
- steady-state refresh: additional 30-second polling even when the stream is connected

Current limitation:

- subscriptions exist only inside the current app process
- multi-instance deployment will not propagate updates across instances

## Reporting architecture

The export scripts connect directly to Prisma and query attendance rows for a source/date context.

Notable behavior:

- PDF export contains custom formatting and participant quota logic tailored to Lontara+
- report scripts accept `--source`, `--date`, and `--all`, but participant expectation logic is still Lontara+-specific
- reports write to `reports/`
- scripts are operationally useful, but some assumptions are event-specific and should be parameterized before broader reuse

### Attendance caveats

- attendance event records are multi-event, but participant validation and quota enforcement still come from `src/lib/meetingParticipants.ts`
- `getTodayKey()` in `src/lib/attendanceCore.ts` uses a UTC day boundary, while report scripts use `Asia/Makassar`; counts can diverge around midnight local time
- `DELETE /api/attendance` clears all attendance rows and currently has no auth guard

## Important source files by concern

### UI shell

- `src/app/layout.tsx`
- `src/app/globals.css`

### Attendance domain

- `src/lib/attendanceCore.ts`
- `src/lib/attendanceStore.ts`
- `src/lib/meetingParticipants.ts`

### Event configuration

- `src/lib/attendanceEventUtils.ts`
- `src/lib/eventAccessToken.ts`
- `src/app/admin/events/page.tsx`

### Admin workflow domain

- `src/lib/caseStore.ts`
- `src/lib/suratStore.ts`
- `src/lib/visitorStore.ts`
- `src/lib/staffStore.ts`
- `src/lib/orgUnitStore.ts`
- `src/lib/webNotificationStore.ts`

## Operational notes

### Setup dependencies

- A valid PostgreSQL database is required for attendance APIs.
- Prisma client is generated during `postinstall`, but `prisma db push` still needs to run against the target database.

### Seed behavior

- `scripts/seed-attendance-db.mjs` deletes all current attendance rows before reseeding.
- Use it only when replacing the attendance dataset is acceptable.

### Production-readiness checklist

Before treating this as a production system, address at least the following:

- migrate browser-local operational data to server persistence
- replace dummy client-side auth with secure server-side auth
- move role enforcement to backend-protected resources
- replace in-memory SSE hub with shared realtime infrastructure
- add automated tests around route handlers and core domain logic
- remove hard-coded report assumptions and make them event-configurable
- create secret management and deployment-specific environment handling
- protect destructive attendance endpoints before any non-demo deployment

## Documentation map

- `README.md` - onboarding, setup, route map, scripts, limitations
- `docs/architecture.md` - this file
- `docs/backend-architecture-plan.md` - earlier planning notes
- `docs/backend-implementation-plan.md` - earlier backend implementation plan
- `docs/test-cases.md` - manual testing references
