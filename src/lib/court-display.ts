import type { Match } from "@/lib/db/types";

/** One readable line where the match is played — shown to parents and children. */
export function formatCourtDetails(m: Pick<Match, "court_name" | "court_number" | "court_address_notes">): string {
  const parts: string[] = [];
  if (m.court_name?.trim()) parts.push(m.court_name.trim());
  const num = String(m.court_number ?? "").trim();
  if (num) parts.push(`Court ${num}`);
  const notes = String(m.court_address_notes ?? "").trim();
  if (notes) parts.push(notes);
  return parts.join(" • ") || "Venue not set yet";
}
