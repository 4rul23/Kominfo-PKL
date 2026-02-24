# WhatsApp Bot Plan (Future)
## Diskominfo Guestbook: Notifications for Case Workflow

This document describes the **future WhatsApp automation** work. The current app is a **dummy/POC** that only uses **click-to-chat** (`wa.me`) links.

Related docs:
- `docs/whatsapp-qrcode-plan.md` (broad WhatsApp + QR plan)
- `docs/backend-implementation-plan.md` (backend prerequisites)

---

## 1. Goals
- Automatically notify the right person when:
  - a case is assigned to an operator
  - a case is escalated to lead (Kabid/Kasubbag/Koordinator UPT)
  - a case is escalated to Kepala Dinas
- Maintain audit logs: what message was sent, when, to whom, by which trigger.
- Keep messages consistent with operational flow:
  - Resepsionis is dispatcher
  - Operator handles execution
  - Lead/Kadis only receives escalations

---

## 2. Recommended Phasing
### Phase A (Current)
- Click-to-chat links from UI:
  - Notify operator
  - Eskalasi lead
  - Eskalasi kadis

### Phase B (POC automation)
- Use `whatsapp-web.js` (or Baileys) for internal POC.
- Add server queue table and worker:
  - `notification_queue` in DB
  - background worker sending WhatsApp messages

### Phase C (Production)
- Migrate to **WhatsApp Business API** (official) for stability/compliance.

---

## 3. Data Requirements (Backend)
Minimum backend must exist first:
- Auth + RBAC
- `cases` and `case_events`
- `org_unit_contacts` with WhatsApp numbers
- `users` (operators) with WhatsApp numbers

Add table:
### notification_queue
- `id` (uuid)
- `channel` (whatsapp)
- `to_number`
- `template_key` (assigned, escalated_lead, escalated_kadis, etc.)
- `message_text`
- `case_id` (nullable)
- `status` (pending, sent, failed, cancelled)
- `attempt_count`
- `scheduled_at`, `sent_at`
- `last_error`
- timestamps

---

## 4. Triggers
### 4.1 On case assigned
When resepsionis assigns operator:
- enqueue message to operator WhatsApp
- log event in `case_events` as `contacted`

### 4.2 On escalation to lead
When operator clicks escalate lead (or case status changes to `escalated`):
- resolve lead contact by `org_unit_contacts(contact_type=lead, org_unit_id=case.org_unit_id)`
- enqueue message
- log event

### 4.3 On escalation to kadis
When operator clicks escalate kadis:
- resolve kadis contact by `org_unit_contacts(contact_type=kadis, org_unit_id=DISKOMINFO_ROOT)`
- enqueue message
- log event

Optional:
- SLA reminder triggers (cron every X minutes)

---

## 5. Message Template (Text)
All messages must include:
- Case code (short id)
- Case type (visitor/surat)
- Summary (visitor name+purpose OR surat tracking+perihal)
- Unit tujuan + org unit
- Link to case detail

Template example: `assigned`
```
[GUESTBOOK] Case ABC123
Jenis: visitor
Unit: UPT Warroom
Org Unit: UPT Warroom
Nama: ...
NIP/NIK: ...
Keperluan: ...

Detail: https://.../admin/cases/<id>
```

Template example: `escalated_lead`
```
[GUESTBOOK] Eskalasi Case ABC123
Org Unit: Bidang APTIKA
Ringkas: ...

Detail: https://.../admin/cases/<id>
```

---

## 6. Safety + Operational Concerns
- Rate limiting per number (avoid spam loops).
- Idempotency: do not send duplicate notifications for the same trigger.
- Message retries with backoff.
- Opt-out / deactivation for a contact number.
- Auditability: store `message_id` returned by provider when available.

---

## 7. Definition of Done (Bot Phase B)
- Assign case -> operator receives WhatsApp within 10s (POC).
- Escalate lead/kadis -> contact receives WhatsApp.
- Every sent message has an audit record:
  - queue row `sent`
  - `case_events.contacted`
- Failures are visible to admin in a simple "Notifications" page.

