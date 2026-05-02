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
