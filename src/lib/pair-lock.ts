import type { Match, MatchStatus } from "@/lib/db/types";

/** Pairing is consumed for round-robin (one meeting only) — no new invites or manual results until admin reset. */
const LOCKED_STATUSES = new Set<MatchStatus>(["published", "disputed", "resolved"]);

export function isPairingResultLocked(status: Match["status"]): boolean {
  return LOCKED_STATUSES.has(status);
}

/** Opponent ids that already have a locked (completed) result with `meId`. */
export function lockedOpponentIdsForPlayer(meId: string, matches: Match[]): Set<string> {
  const out = new Set<string>();
  for (const m of matches) {
    if (!isPairingResultLocked(m.status)) continue;
    if (m.player_a_id === meId) out.add(m.player_b_id);
    else if (m.player_b_id === meId) out.add(m.player_a_id);
  }
  return out;
}

/** Opponents you already have an in-flight scheduling/booking row with — hide their open slots (V2). */
const ACTIVE_SCHEDULING = new Set<MatchStatus>([
  "waiting_response",
  "accepted",
  "proposed",
  "availability_confirmed",
  "booking_failed",
  "scheduled",
]);

export function opponentsWithActiveScheduling(meId: string, matches: Match[]): Set<string> {
  const out = new Set<string>();
  for (const m of matches) {
    if (m.status === "cancelled" || m.status === "not_scheduled") continue;
    if (!ACTIVE_SCHEDULING.has(m.status)) continue;
    if (m.player_a_id === meId) out.add(m.player_b_id);
    else if (m.player_b_id === meId) out.add(m.player_a_id);
  }
  return out;
}
