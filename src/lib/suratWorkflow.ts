export type SuratStatus = "submitted" | "verified" | "in_review" | "paraf" | "approved" | "archived";
export type WorkflowActorRole = "admin" | "receptionist" | "operator";

const NEXT_STATUS_MAP: Record<SuratStatus, SuratStatus | null> = {
  submitted: "verified",
  verified: "in_review",
  in_review: "paraf",
  paraf: "approved",
  approved: "archived",
  archived: null,
};

const LEGACY_STATUS_MAP: Record<string, SuratStatus> = {
  submitted: "submitted",
  received: "verified",
  processing: "in_review",
  completed: "approved",
  archived: "archived",
  verified: "verified",
  in_review: "in_review",
  paraf: "paraf",
  approved: "approved",
};

const TRANSITION_ROLE_MAP: Record<string, WorkflowActorRole[]> = {
  "submitted->verified": ["receptionist", "admin"],
  "verified->in_review": ["operator", "admin"],
  "in_review->paraf": ["admin"],
  "paraf->approved": ["admin"],
  "approved->archived": ["admin"],
};

export function normalizeSuratStatus(value: unknown): SuratStatus | null {
  if (typeof value !== "string") return null;
  return LEGACY_STATUS_MAP[value] || null;
}

export function isSuratStatus(value: unknown): value is SuratStatus {
  return normalizeSuratStatus(value) !== null;
}

export function isWorkflowActorRole(value: unknown): value is WorkflowActorRole {
  return value === "admin" || value === "receptionist" || value === "operator";
}

export function getNextSuratStatus(current: SuratStatus): SuratStatus | null {
  return NEXT_STATUS_MAP[current];
}

export function canTransitionSuratStatus(current: SuratStatus, next: SuratStatus): boolean {
  if (current === next) return false;
  return NEXT_STATUS_MAP[current] === next;
}

export function canRolePerformTransition(role: WorkflowActorRole, current: SuratStatus, next: SuratStatus): boolean {
  if (current === next) return false;
  const key = `${current}->${next}`;
  const allowed = TRANSITION_ROLE_MAP[key] || [];
  return allowed.includes(role);
}

export function getAllowedRolesForTransition(current: SuratStatus, next: SuratStatus): WorkflowActorRole[] {
  const key = `${current}->${next}`;
  return TRANSITION_ROLE_MAP[key] || [];
}

export function getSuratTransitionError(current: SuratStatus, next: SuratStatus): string {
  if (current === next) return `Status ${current} sudah aktif. Pilih status berikutnya.`;
  const allowedNext = NEXT_STATUS_MAP[current];
  if (!allowedNext) {
    return `Status ${current} sudah final dan tidak bisa diubah.`;
  }
  return `Transisi status tidak valid: ${current} -> ${next}. Status berikutnya yang diizinkan adalah ${allowedNext}.`;
}

export function getStatusLabel(status: SuratStatus): string {
  switch (status) {
    case "submitted":
      return "Terkirim";
    case "verified":
      return "Terverifikasi";
    case "in_review":
      return "Diproses";
    case "paraf":
      return "Paraf";
    case "approved":
      return "Disetujui";
    case "archived":
      return "Arsip";
    default:
      return status;
  }
}
