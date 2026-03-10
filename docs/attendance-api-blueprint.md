# Attendance Event API Blueprint

## Objective

Standardize attendance APIs around an event-centric resource model so event identity lives in the URL path, while query params are used only for optional filters.

## Design principles

- Event identity in path: `/api/events/{eventCode}`
- Collection operations on `/api/events`
- Attendance data nested under event resource
- Stream channel scoped to event
- Keep existing `/api/attendance*` and `/api/attendance-events*` temporarily for backward compatibility

## API contract

### Events collection

- `GET /api/events`
  - Returns list of events and active event
  - Response: `{ events: AttendanceEvent[], activeEvent: AttendanceEvent | null }`

- `POST /api/events`
  - Admin only
  - Body: `{ code: string, name: string, eventDate?: string | null, isActive?: boolean }`
  - Response: `{ event: AttendanceEvent }`

### Single event

- `GET /api/events/{eventCode}`
  - Returns event detail
  - Response: `{ event: AttendanceEvent }`

- `PATCH /api/events/{eventCode}`
  - Admin only
  - Body: `{ name?: string, eventDate?: string | null, isActive?: boolean }`
  - Response: `{ event: AttendanceEvent }`

### Event attendance

- `GET /api/events/{eventCode}/attendance`
  - Returns attendance entries for that event
  - Response: `{ entries: AttendanceEntry[] }`

- `POST /api/events/{eventCode}/attendance`
  - Public registration endpoint (validation still enforced)
  - Body: attendance payload without `id/createdAt`
  - Response: `{ entry: AttendanceEntry }`

- `GET /api/events/{eventCode}/attendance/stream`
  - SSE stream scoped to a single event

### Event register link

- `POST /api/events/{eventCode}/register-link`
  - Admin only
  - Body: `{ expiresInHours?: number }`
  - Response:
    - `{ token, expiresAt, eventCode, registerPath, dashboardPath }`

## Migration plan

1. Add new `/api/events/...` routes (done)
2. Move client store consumers to new routes (done)
3. Keep old routes for compatibility (current release)
4. Mark old routes deprecated in docs and remove after clients are migrated

## Deprecation targets

- `/api/attendance`
- `/api/attendance/stream`
- `/api/attendance-events`
- `/api/attendance-events/token`

These remain functional for now to avoid breaking older clients.
