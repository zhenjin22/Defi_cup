"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { DEFAULT_GROUP } from "@/lib/app-constants";
import { isPairingResultLocked } from "@/lib/pair-lock";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";

function canonicalPair(a: string, b: string) {
  return a < b
    ? { player_a_id: a, player_b_id: b }
    : { player_a_id: b, player_b_id: a };
}

const CreateSlotSchema = z.object({
  starts_at: z.string().min(1),
  ends_at: z.string().min(1),
  venue_name: z.string().optional(),
  court_number: z.string().optional(),
  court_address_notes: z.string().optional(),
  court_reserved: z.string().optional(),
});

export async function createAvailabilitySlot(formData: FormData) {
  const { selectedPlayer } = await getViewer();
  if (!selectedPlayer) redirect("/choose-child");

  const parsed = CreateSlotSchema.safeParse({
    starts_at: formData.get("starts_at"),
    ends_at: formData.get("ends_at"),
    venue_name: String(formData.get("venue_name") ?? ""),
    court_number: String(formData.get("court_number") ?? ""),
    court_address_notes: String(formData.get("court_address_notes") ?? ""),
    court_reserved: String(formData.get("court_reserved") ?? ""),
  });
  if (!parsed.success) redirect("/availability?error=invalid_slot");

  const starts = new Date(parsed.data.starts_at);
  const ends = new Date(parsed.data.ends_at);
  if (!Number.isFinite(starts.getTime()) || !Number.isFinite(ends.getTime()) || starts >= ends) {
    redirect("/availability?error=invalid_time_range");
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("availability_slots").insert({
    player_id: selectedPlayer.id,
    group_name: selectedPlayer.group_name ?? DEFAULT_GROUP,
    starts_at: starts.toISOString(),
    ends_at: ends.toISOString(),
    venue_name: (parsed.data.venue_name ?? "").trim() || null,
    court_number: (parsed.data.court_number ?? "").trim() || null,
    court_address_notes: (parsed.data.court_address_notes ?? "").trim() || null,
    court_reserved: parsed.data.court_reserved === "on",
    status: "open",
  });
  if (error) redirect(`/availability?error=${encodeURIComponent(error.message)}`);
  redirect("/availability?msg=slot_created");
}

const SlotIdSchema = z.object({ slot_id: z.string().uuid() });

export async function cancelAvailabilitySlot(formData: FormData) {
  const { selectedPlayer } = await getViewer();
  if (!selectedPlayer) redirect("/choose-child");

  const parsed = SlotIdSchema.safeParse({ slot_id: formData.get("slot_id") });
  if (!parsed.success) redirect("/availability?error=invalid_slot");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("availability_slots")
    .update({ status: "cancelled" })
    .eq("id", parsed.data.slot_id)
    .eq("player_id", selectedPlayer.id)
    .eq("status", "open");
  if (error) redirect(`/availability?error=${encodeURIComponent(error.message)}`);
  redirect("/availability?msg=slot_cancelled");
}

/** Match rows in these states block claiming a slot for the same pair (until cancelled / reset / declined invite). */
const CLAIM_BLOCK_STATUSES = new Set([
  "waiting_response",
  "accepted",
  "proposed",
  "availability_confirmed",
  "booking_failed",
  "scheduled",
  "published",
  "disputed",
  "resolved",
]);

export async function claimAvailabilitySlot(formData: FormData) {
  const { selectedPlayer } = await getViewer();
  if (!selectedPlayer) redirect("/choose-child");
  const claimerId = selectedPlayer.id;

  const parsed = SlotIdSchema.safeParse({ slot_id: formData.get("slot_id") });
  if (!parsed.success) redirect("/schedule?error=invalid_slot");

  const supabase = await createSupabaseServerClient();
  const slotId = parsed.data.slot_id;

  const { data: slot, error: slotErr } = await supabase
    .from("availability_slots")
    .select("*")
    .eq("id", slotId)
    .single();
  if (slotErr || !slot) redirect("/schedule?error=slot_not_found");
  if (slot.status !== "open") redirect("/schedule?error=slot_not_open");
  if (slot.player_id === claimerId) redirect("/schedule?error=self_claim");

  const ownerId = slot.player_id as string;

  const pair = canonicalPair(ownerId, claimerId);
  const { data: existing, error: exErr } = await supabase
    .from("matches")
    .select("id,status")
    .eq("player_a_id", pair.player_a_id)
    .eq("player_b_id", pair.player_b_id)
    .maybeSingle();
  if (exErr) redirect(`/schedule?error=${encodeURIComponent(exErr.message)}`);

  if (existing?.status && isPairingResultLocked(existing.status)) {
    redirect("/schedule?error=pair_already_completed");
  }
  if (existing?.status && CLAIM_BLOCK_STATUSES.has(existing.status)) {
    redirect("/schedule?error=pair_busy");
  }

  const startsAt = slot.starts_at as string;
  const venueName = (slot.venue_name as string | null)?.trim() || null;
  const courtNum = (slot.court_number as string | null)?.trim() || null;
  const courtNotes = (slot.court_address_notes as string | null)?.trim() || null;
  const slotCourtReserved = Boolean(slot.court_reserved);

  const matchPayload = {
    player_a_id: pair.player_a_id,
    player_b_id: pair.player_b_id,
    status: "scheduled" as const,
    inviter_player_id: claimerId,
    proposed_times: [] as string[],
    opponent_available_times: [] as string[],
    selected_time: startsAt,
    court_name: venueName,
    court_number: courtNum,
    court_address_notes: courtNotes,
    proposed_by: null as null,
    booking_responsible: "undecided" as const,
    booking_status: (slotCourtReserved ? "booked" : "not_started") as "booked" | "not_started",
    court_reserved: slotCourtReserved,
    cancellation_reason: null as null,
    cancelled_at: null as null,
    cancelled_by_player_id: null as null,
  };

  const { data: claimedSlot, error: claimErr } = await supabase
    .from("availability_slots")
    .update({
      status: "claimed",
      claimed_by_player_id: claimerId,
    })
    .eq("id", slotId)
    .eq("status", "open")
    .select("id")
    .maybeSingle();

  if (claimErr || !claimedSlot?.id) {
    redirect("/schedule?error=slot_taken");
  }

  let matchId: string | null = existing?.id ?? null;
  if (!matchId) {
    const { data: ins, error: insErr } = await supabase.from("matches").insert(matchPayload).select("id").single();
    if (insErr || !ins?.id) {
      await supabase
        .from("availability_slots")
        .update({ status: "open", claimed_by_player_id: null })
        .eq("id", slotId);
      redirect(`/schedule?error=${encodeURIComponent(insErr?.message ?? "match_create_failed")}`);
    }
    matchId = ins.id;
  } else {
    const existingId = existing!.id;
    const { error: upErr } = await supabase.from("matches").update(matchPayload).eq("id", existingId);
    if (upErr) {
      await supabase
        .from("availability_slots")
        .update({ status: "open", claimed_by_player_id: null })
        .eq("id", slotId);
      redirect(`/schedule?error=${encodeURIComponent(upErr.message)}`);
    }
    matchId = existingId;
  }

  const { error: linkErr } = await supabase.from("availability_slots").update({ match_id: matchId }).eq("id", slotId);
  if (linkErr) {
    redirect(`/matches/${matchId}?error=${encodeURIComponent(linkErr.message)}`);
  }

  redirect(`/matches/${matchId}`);
}

const CancelMatchSchema = z.object({
  match_id: z.string().uuid(),
  reason: z.enum(["no_court_available", "player_unavailable", "other"]),
});

export async function cancelScheduledMatch(formData: FormData) {
  const { selectedPlayer } = await getViewer();
  if (!selectedPlayer) redirect("/choose-child");

  const parsed = CancelMatchSchema.safeParse({
    match_id: formData.get("match_id"),
    reason: formData.get("cancellation_reason"),
  });
  if (!parsed.success) redirect("/schedule?error=invalid_cancel");

  const supabase = await createSupabaseServerClient();
  const { data: m, error: mErr } = await supabase
    .from("matches")
    .select("id,status,player_a_id,player_b_id")
    .eq("id", parsed.data.match_id)
    .single();
  if (mErr || !m) redirect(`/matches/${parsed.data.match_id}?error=not_found`);
  if (m.status !== "scheduled") redirect(`/matches/${m.id}?error=not_scheduled`);

  const isParticipant = m.player_a_id === selectedPlayer.id || m.player_b_id === selectedPlayer.id;
  if (!isParticipant) redirect(`/matches/${m.id}?error=forbidden`);

  const now = new Date().toISOString();
  const { error: u1 } = await supabase
    .from("matches")
    .update({
      status: "cancelled",
      cancellation_reason: parsed.data.reason,
      cancelled_at: now,
      cancelled_by_player_id: selectedPlayer.id,
      booking_status: "not_started",
      court_reserved: false,
    })
    .eq("id", m.id)
    .eq("status", "scheduled");
  if (u1) redirect(`/matches/${m.id}?error=${encodeURIComponent(u1.message)}`);

  await supabase
    .from("availability_slots")
    .update({
      status: "open",
      claimed_by_player_id: null,
      match_id: null,
    })
    .eq("match_id", m.id);

  redirect(`/matches/${m.id}?msg=cancelled`);
}

const UpdateCourtSchema = z.object({
  match_id: z.string().uuid(),
  court_reserved: z.enum(["on", ""]),
  court_number: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().nullable().optional()),
  court_name: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().nullable().optional()),
  court_address_notes: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().nullable().optional()),
});

export async function updateMatchCourtBooking(formData: FormData) {
  const { selectedPlayer } = await getViewer();
  if (!selectedPlayer) redirect("/choose-child");

  const parsed = UpdateCourtSchema.safeParse({
    match_id: formData.get("match_id"),
    court_reserved: formData.get("court_reserved") === "on" ? "on" : "",
    court_number: formData.get("court_number"),
    court_name: formData.get("court_name"),
    court_address_notes: formData.get("court_address_notes"),
  });
  if (!parsed.success) redirect("/schedule?error=invalid_court_update");

  const supabase = await createSupabaseServerClient();
  const { data: m, error: mErr } = await supabase
    .from("matches")
    .select("id,status,player_a_id,player_b_id")
    .eq("id", parsed.data.match_id)
    .single();
  if (mErr || !m) redirect(`/matches/${parsed.data.match_id}?error=not_found`);
  if (m.status !== "scheduled") redirect(`/matches/${m.id}?error=not_scheduled`);

  const isParticipant = m.player_a_id === selectedPlayer.id || m.player_b_id === selectedPlayer.id;
  if (!isParticipant) redirect(`/matches/${m.id}?error=forbidden`);

  const reserved = parsed.data.court_reserved === "on";
  const { error } = await supabase
    .from("matches")
    .update({
      court_reserved: reserved,
      court_number: parsed.data.court_number?.trim() || null,
      court_name: parsed.data.court_name?.trim() || null,
      court_address_notes: parsed.data.court_address_notes?.trim() || null,
      booking_status: reserved ? "booked" : "not_started",
    })
    .eq("id", m.id);
  if (error) redirect(`/matches/${m.id}?error=${encodeURIComponent(error.message)}`);
  redirect(`/matches/${m.id}?msg=court_saved`);
}
