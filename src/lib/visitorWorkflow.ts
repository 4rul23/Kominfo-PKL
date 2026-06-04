export type VisitorStatus =
  | "submitted"
  | "reviewed_by_receptionist"
  | "forwarded_to_unit"
  | "accepted_by_unit"
  | "rejected_by_unit";

export interface VisitorStatusHistoryEntry {
  status: VisitorStatus;
  timestamp: string;
  note?: string;
}

export function getVisitorStatusLabel(status: VisitorStatus): string {
  switch (status) {
    case "submitted":
      return "Terkirim";
    case "reviewed_by_receptionist":
      return "Diverifikasi Resepsionis";
    case "forwarded_to_unit":
      return "Diteruskan ke Bidang";
    case "accepted_by_unit":
      return "Diterima Bidang";
    case "rejected_by_unit":
      return "Ditolak Bidang";
    default:
      return status;
  }
}

export function createVisitorTrackingId(now: Date = new Date()): string {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `VIS-${yyyy}${mm}-${rand}`;
}

export function isVisitorStatus(value: unknown): value is VisitorStatus {
  return value === "submitted"
    || value === "reviewed_by_receptionist"
    || value === "forwarded_to_unit"
    || value === "accepted_by_unit"
    || value === "rejected_by_unit";
}

const NEXT_VISITOR_STATUS: Record<VisitorStatus, VisitorStatus[]> = {
  submitted: ["reviewed_by_receptionist", "forwarded_to_unit", "accepted_by_unit", "rejected_by_unit"],
  reviewed_by_receptionist: ["forwarded_to_unit"],
  forwarded_to_unit: ["accepted_by_unit", "rejected_by_unit"],
  accepted_by_unit: [],
  rejected_by_unit: [],
};

export function canTransitionVisitorStatus(from: VisitorStatus, to: VisitorStatus): boolean {
  return NEXT_VISITOR_STATUS[from].includes(to);
}

export function getVisitorStatusTransitionError(from: VisitorStatus, to: VisitorStatus): string {
  if (!canTransitionVisitorStatus(from, to)) {
    return `Transisi status kunjungan tidak valid: ${from} -> ${to}.`;
  }
  return "";
}
