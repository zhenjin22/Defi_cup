/** English UI strings for match lifecycle (shared across dashboard, matrix, detail). */
export function matchStatusBadgeClass(status: string): string {
  switch (status) {
    case "waiting_response":
      return "bg-foreground/5 text-muted";
    case "accepted":
      return "bg-tennis-blue/15 text-foreground";
    case "declined":
      return "bg-foreground/5 text-muted";
    case "closed_by_other_acceptance":
      return "bg-foreground/5 text-muted";
    case "proposed":
      return "bg-tennis-yellow/30 text-foreground";
    case "availability_confirmed":
      return "bg-tennis-blue/15 text-foreground";
    case "booking_failed":
      return "bg-red-50 text-red-700 border border-red-200";
    case "scheduled":
      return "bg-tennis-green/15 text-foreground";
    case "cancelled":
      return "bg-foreground/5 text-muted";
    case "published":
      return "bg-foreground/10 text-foreground";
    case "disputed":
      return "bg-red-50 text-red-700 border border-red-200";
    case "resolved":
      return "bg-tennis-green/25 text-foreground";
    default:
      return "bg-foreground/5 text-muted";
  }
}

export const MATCH_STATUS_LABEL_EN: Record<string, string> = {
  waiting_response: "Awaiting reply",
  accepted: "Accepted",
  declined: "Declined",
  closed_by_other_acceptance: "Closed (other acceptance)",
  proposed: "Proposed",
  availability_confirmed: "Availability confirmed",
  booking_failed: "Court unavailable",
  scheduled: "Court booked",
  cancelled: "Cancelled",
  published: "Result published",
  disputed: "Result disputed",
  resolved: "Dispute settled",
};

export function matchStatusLabel(status: string): string {
  return MATCH_STATUS_LABEL_EN[status] ?? status.replaceAll("_", " ");
}
