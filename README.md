# Diskominfo Guestbook Next

Digital lobby and operations prototype for Diskominfo Kota Makassar. The app combines a public-facing kiosk experience, event-based attendance registration, a surat elektronik intake flow, and an internal admin workspace for triage and follow-up.

## What this project does

- Runs a public lobby dashboard at `/` with live attendance counters and recent guest activity.
- Supports event-specific attendance registration through `/register` and `/e/[eventCode]/register`.
- Stores attendance records in PostgreSQL through Prisma and serves them through Next.js route handlers.
- Provides a surat elektronik wizard at `/surat` plus tracking at `/surat/tracking`.
- Exposes an internal admin area at `/admin` for dashboard, intake, inbox, directory, events, notifications, visitors, and surat management.
- Generates attendance reports in PDF, XLSX, and CSV through Node scripts in `scripts/`.

## Current implementation shape

This codebase has two data patterns today:

- `Attendance` and `AttendanceEvent` use Prisma + PostgreSQL through API routes in `src/app/api/`.
- Visitor, surat, case, staff, org unit, operator, and notification flows are currently browser-side prototype stores backed mostly by `localStorage` in `src/lib/`, while staff login sessions live in `sessionStorage`.

That split matters for deployment and testing: attendance data is shared across users through the database, while most admin workflow data is local to the browser profile unless those modules are migrated to a backend.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Prisma + PostgreSQL
- Tailwind CSS 4
- Framer Motion
- `qrcode.react` for event QR generation
- `pdfkit`, `exceljs`, and custom scripts for report export

## Main user journeys

### 1. Public lobby and attendance

- `src/app/page.tsx` renders the kiosk-style landing page.
- The home page loads the active event, recent attendance entries, and today totals.
- It listens to `/api/attendance/stream` with Server-Sent Events for near real-time updates.
- The page also keeps a polling loop: a fast 5-second fallback when streaming is disabled or disconnected, plus a 30-second refresh while connected.

### 2. Event registration

- `src/app/register/page.tsx` routes users to the correct event-specific registration page if an `event` query is provided.
- `src/app/e/[eventCode]/register/page.tsx` validates the event and optionally enforces signed access tokens.
- `src/components/RegisterPageShell.tsx` and attendance-related components drive the registration UX.
- Submissions are posted to `/api/attendance` and persisted in PostgreSQL.

### 3. Surat elektronik

- `src/app/surat/page.tsx` implements a multi-step form with optional attachments.
- Submission creates a surat record in `localStorage` via `src/lib/suratStore.ts`.
- The same flow also creates a case entry through `src/lib/caseStore.ts` so admin users can triage it.
- `src/app/surat/tracking/page.tsx` lets users check status with a tracking ID.

### 4. Admin operations

- `src/app/admin/layout.tsx` handles dummy authentication, role-based navigation, and access checks.
- Default seeded accounts are browser-local and intended for demo/prototype use.
- Receptionists work primarily from `Intake`.
- Operators work primarily from `Inbox`.
- Admins can access all areas including events, org units, users, and broader oversight screens.

## Route map

### Public routes

- `/` - main lobby dashboard and live attendance overview
- `/register` - event selector or redirect to a specific event registration page
- `/e/[eventCode]` - redirect to the dashboard filtered to an event
- `/e/[eventCode]/register` - event-specific registration page
- `/surat` - surat elektronik submission wizard
- `/surat/tracking` - surat status tracking page

### Admin routes

- `/admin` - admin dashboard overview
- `/admin/intake` - receptionist queue and triage view
- `/admin/inbox` - operator work inbox
- `/admin/directory` - operator and lead contact directory with WhatsApp links
- `/admin/notifications` - browser notification inbox
- `/admin/visitors` - visitor management view
- `/admin/surat` - surat management, SLA, filtering, and export
- `/admin/events` - attendance event management and QR link generation
- `/admin/operators` - operator route entry/redirect page
- `/admin/org-units` - organizational unit management
- `/admin/users` - dummy user management
- `/admin/cases/[id]` - detailed case workflow screen

### API routes

- `GET /api/attendance` - list attendance entries, optionally filtered by `source`
- `POST /api/attendance` - create a validated attendance entry
- `DELETE /api/attendance` - clear all attendance records
- `GET /api/attendance/stream` - Server-Sent Events stream for attendance updates
- `GET /api/attendance-events` - list attendance events and active event
- `POST /api/attendance-events` - create an attendance event
- `PATCH /api/attendance-events` - update event name/date/active state
- `POST /api/attendance-events/token` - generate signed event register links

## Project structure

```text
diskominfo-guestbook-next/
|- src/
|  |- app/                  # App Router pages, layouts, and API handlers
|  |- components/           # UI building blocks and workflow components
|  \- lib/                 # Domain logic, stores, utilities, Prisma client
|- prisma/
|  \- schema.prisma        # PostgreSQL data model
|- scripts/                # Seeding and report export scripts
|- data/                   # Seed/input JSON data
|- docs/                   # Architecture notes, plans, and handoff docs
|- public/                 # Static images and logos
\- reports/                # Generated export examples
```

## Data model

### Prisma-backed entities

Defined in `prisma/schema.prisma`:

- `Attendance`
  - attendee identity and organization fields
  - participant grouping fields (`participantId`, `participantLabel`, `participantRole`)
  - optional `selfieDataUrl`
  - `source` used as the event/source key
  - indexed by `createdAt`, `source`, and `participantId`
- `AttendanceEvent`
  - `code`, `name`, `eventDate`, `isActive`
  - used to drive multi-event registration and dashboard filtering

### Browser-local prototype entities

Managed under `src/lib/` using browser storage:

- `visitorStore.ts` - visitor records and dashboard statistics
- `suratStore.ts` - incoming digital letters, status history, disposisi, priority, SLA
- `caseStore.ts` - operational case tracking for visitors and surat
- `staffStore.ts` - dummy users and credentials
- `orgUnitStore.ts` - org structure and escalation contacts
- `staffSession.ts` - current staff login session in `sessionStorage`
- `webNotificationStore.ts` - in-browser notification center

Important caveat: surat attachments are stored as base64 strings in browser storage, so large uploads can hit browser quota limits quickly and keep sensitive files on the local machine.

## Environment variables

Use `.env.example` as the safe template. Do not commit live secrets.

Required:

- `DATABASE_URL` - PostgreSQL connection string used by Prisma; adjust SSL options if your local Postgres does not use SSL

Optional:

- `ATTENDANCE_EVENT_TOKEN_SECRET` - HMAC secret for signed event register links
- `ATTENDANCE_REQUIRE_EVENT_TOKEN` - when `true`, `/e/[eventCode]/register` requires a valid token
- `NEXT_PUBLIC_ENABLE_ATTENDANCE_STREAM` - set to `false` to disable SSE-based attendance streaming in the browser

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env`, then set a valid `DATABASE_URL`.

Example commands:

```bash
# macOS / Linux
cp .env.example .env

# Windows Command Prompt
copy .env.example .env
```

### 3. Prepare Prisma

```bash
npm run prisma:generate
npm run prisma:push
```

### 4. Optional: seed attendance data

```bash
npm run db:seed:attendance
```

This imports `data/attendance.json` into the `Attendance` table and replaces existing attendance records.

### 5. Run the app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Available scripts

- `npm run dev` - start the development server
- `npm run build` - create a production build
- `npm run start` - run the production server
- `npm run lint` - run ESLint
- `npm run prisma:generate` - generate Prisma client
- `npm run prisma:push` - push schema to the database
- `npm run prisma:studio` - open Prisma Studio
- `npm run db:seed:attendance` - seed attendance table from `data/attendance.json`
- `npm run report:attendance:pdf` - export attendance report PDF
- `npm run report:attendance:xlsx` - export attendance report XLSX
- `npm run report:attendance:csv` - export attendance report CSV

## Reporting

The report scripts in `scripts/` read attendance data from Prisma and write files into `reports/`.

- `export-attendance-report-pdf.mjs` builds a formatted PDF attendance report.
- `export-attendance-report-xlsx.mjs` exports spreadsheet output.
- `export-attendance-report-csv.mjs` exports raw CSV output.

The report scripts support `--source`, `--date`, and `--all` flags, but the participant expectation logic is still tailored to the Lontara+ meeting scenario. Update that logic before treating the exports as generic multi-event reports.

## Authentication and roles

Admin authentication is currently demo-only:

- credentials are stored in browser `localStorage`
- sessions are stored in browser `sessionStorage`
- role checks are performed in `src/app/admin/layout.tsx`

Seeded demo accounts:

- `admin` / `admin123`
- `resepsionis` / `reseps123`
- `operator-upt` / `op123`
- `operator-aptika` / `op123`

Do not treat the current admin implementation as production-ready security.

## Real-time behavior

- Attendance updates broadcast through an in-memory stream hub in `src/lib/attendanceRealtimeHub.ts`.
- The browser subscribes using EventSource from the home page.
- The home page also performs periodic refreshes, even when the stream is healthy.
- This works for a single running app instance but is not a distributed pub/sub solution.

If you deploy behind multiple instances or serverless workers, replace the in-memory hub with a shared transport such as Redis Pub/Sub, database notifications, or a dedicated realtime service.

## Known limitations

- Only attendance and attendance events are persisted to PostgreSQL.
- Most admin workflow modules are still prototype-only and local to a browser session.
- Dummy credentials are stored in plain text in browser storage.
- Attendance deletion is currently exposed through unauthenticated `DELETE /api/attendance`; treat it as dev/demo-only until protected.
- Event streaming is process-local and not horizontally scalable.
- The socket placeholder route at `src/app/socket.io/route.ts` is not the primary realtime mechanism; attendance currently relies on SSE plus polling.
- Attendance validation, quotas, and participant lists are still tied to `src/lib/meetingParticipants.ts` and the Lontara+ dataset, so event creation is more flexible than attendance validation.
- "Today" attendance counts use a UTC day boundary, while report scripts filter by `Asia/Makassar`, so totals can differ around local midnight.
- Some report scripts are event-specific rather than fully generic.

## Recommended next engineering steps

- Move visitor, surat, case, staff, and notification modules from `localStorage` to a real backend.
- Replace dummy auth with server-side authentication and authorization.
- Introduce shared realtime infrastructure for multi-instance deployment.
- Add automated tests for attendance APIs, event token logic, and admin workflow stores.
- Generalize report scripts so event code, date window, and participant definitions are configurable.

## Additional docs

- `docs/architecture.md` - system architecture, storage model, route responsibilities, and workflow details
- `docs/implementation-handoff-2026-03-02.md` - implementation context from earlier work
- `docs/backend-architecture-plan.md` - earlier architecture planning notes
- `docs/backend-implementation-plan.md` - backend implementation planning notes
- `docs/test-cases.md` - manual test references
