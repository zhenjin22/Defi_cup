"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  buildScoreDatabaseFields,
  parseOpenGameScoreInput,
  validateOpenGamesForMatch,
} from "@/lib/score-entry";
import { isPairingResultLocked } from "@/lib/pair-lock";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";

function canonicalPair(a: string, b: string) {
  return a < b
    ? { player_a_id: a, player_b_id: b, aSide: "player_a" as const, bSide: "player_b" as const }
    : { player_a_id: b, player_b_id: a, aSide: "player_b" as const, bSide: "player_a" as const };
}

const CreateInvitationsSchema = z.object({
  opponent_ids: z.array(z.string().uuid()).min(1).max(3),
  time_1: z.string().min(1),
  time_2: z.string().min(1),
  time_3: z.string().optional().nullable(),
  time_4: z.string().optional().nullable(),
  time_5: z.string().optional().nullable(),
  booking_responsible: z.enum(["me", "opponent", "undecided"]),
});

export async function createInvitations(formData: FormData) {
  const { selectedPlayer } = await getViewer();
  if (!selectedPlayer) redirect("/choose-child");

  const opponent_ids = formData.getAll("opponent_ids").map(String);
  const parsed = CreateInvitationsSchema.safeParse({
    opponent_ids,
    time_1: formData.get("time_1"),
    time_2: formData.get("time_2"),
    time_3: formData.get("time_3"),
    time_4: formData.get("time_4"),
    time_5: formData.get("time_5"),
    booking_responsible: formData.get("booking_responsible"),
  });

  if (!parsed.success) {
    redirect(`/schedule?error=invalid_form`);
  }

  const { opponent_ids: oppIds, time_1, time_2, time_3, time_4, time_5, booking_responsible } =
    parsed.data;

  const times = [time_1, time_2, time_3, time_4, time_5]
    .filter(Boolean)
    .map((t) => new Date(String(t)).toISOString());

  const supabase = await createSupabaseServerClient();

  // Enforce "max 3 active invitations" for inviter.
  const { count } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("inviter_player_id", selectedPlayer.id)
    .eq("status", "waiting_response");

  const currentActive = count ?? 0;
  const availableSlots = Math.max(0, 3 - currentActive);
  if (availableSlots <= 0) {
    redirect("/schedule?error=max_active");
  }

  if (oppIds.length > availableSlots) {
    redirect("/schedule?error=no_slot");
  }

  const toProcess = oppIds;

  for (const opponentId of toProcess) {
    const pair = canonicalPair(selectedPlayer.id, opponentId);
    const { data: lockedRow } = await supabase
      .from("matches")
      .select("status")
      .eq("player_a_id", pair.player_a_id)
      .eq("player_b_id", pair.player_b_id)
      .maybeSingle();
    if (lockedRow?.status && isPairingResultLocked(lockedRow.status)) {
      redirect("/schedule?error=pair_already_completed");
    }
  }

  /** Blocks new invite row transitions when a concrete match / booking / result is in flight. */
  const blockNewInviteForPair = new Set<string>([
    "scheduled",
    "published",
    "disputed",
    "resolved",
    "accepted",
    "proposed",
    "availability_confirmed",
  ]);

  let remainingSlots = Math.max(0, availableSlots);
  const createdIds: string[] = [];
  const blocked: string[] = [];

  for (const opponentId of toProcess) {
    const pair = canonicalPair(selectedPlayer.id, opponentId);
    const meSide = selectedPlayer.id === pair.player_a_id ? "player_a" : "player_b";
    const opponentSide = meSide === "player_a" ? "player_b" : "player_a";
    const responsible =
      booking_responsible === "me"
        ? meSide
        : booking_responsible === "opponent"
          ? opponentSide
          : ("undecided" as const);

    const rowBase = {
      player_a_id: pair.player_a_id,
      player_b_id: pair.player_b_id,
      inviter_player_id: selectedPlayer.id,
      status: "waiting_response" as const,
      proposed_times: times,
      opponent_available_times: [] as string[],
      selected_time: null as string | null,
      court_name: null as string | null,
      court_number: null as string | null,
      court_address_notes: null as string | null,
      proposed_by: meSide,
      booking_responsible: responsible,
      booking_status: (responsible === "undecided" ? "pending" : "not_started") as
        | "pending"
        | "not_started",
      court_reserved: false,
      cancellation_reason: null as string | null,
      cancelled_at: null as string | null,
      cancelled_by_player_id: null as string | null,
    };

    const { data: existing, error: exErr } = await supabase
      .from("matches")
      .select("id,status,inviter_player_id")
      .eq("player_a_id", pair.player_a_id)
      .eq("player_b_id", pair.player_b_id)
      .maybeSingle();

    if (exErr) redirect(`/schedule?error=${encodeURIComponent(exErr.message)}`);

    if (!existing?.id) {
      if (remainingSlots <= 0) continue;
      const { data: ins, error } = await supabase.from("matches").insert(rowBase).select("id").single();
      if (error) redirect(`/schedule?error=${encodeURIComponent(error.message)}`);
      if (ins?.id) {
        createdIds.push(ins.id);
        remainingSlots--;
      }
      continue;
    }

    if (isPairingResultLocked(existing.status)) {
      redirect("/schedule?error=pair_already_completed");
    }

    if (blockNewInviteForPair.has(existing.status)) {
      blocked.push(opponentId);
      continue;
    }

    if (existing.status === "waiting_response") {
      const { error } = await supabase.from("matches").update(rowBase).eq("id", existing.id);
      if (error) redirect(`/schedule?error=${encodeURIComponent(error.message)}`);
      createdIds.push(existing.id);
      continue;
    }

    if (remainingSlots <= 0) continue;

    const { error } = await supabase.from("matches").update(rowBase).eq("id", existing.id);
    if (error) redirect(`/schedule?error=${encodeURIComponent(error.message)}`);
    createdIds.push(existing.id);
    remainingSlots--;
  }

  if (createdIds.length === 0) {
    if (blocked.length > 0) {
      redirect("/schedule?error=pair_busy");
    }
    redirect("/schedule?error=no_slot");
  }

  const firstId = createdIds[0] ?? null;
  redirect(firstId ? `/matches/${firstId}` : "/");
}

const AvailabilitySchema = z.object({
  match_id: z.string().uuid(),
  available_times: z
    .array(z.string().min(1))
    .min(1, "Select at least one available time"),
});

export async function submitAvailability(formData: FormData) {
  const available = formData.getAll("available_times").map(String);
  const parsed = AvailabilitySchema.safeParse({
    match_id: formData.get("match_id"),
    available_times: available,
  });
  if (!parsed.success) redirect(`/matches/${String(formData.get("match_id") ?? "")}?error=invalid_availability`);

  const supabase = await createSupabaseServerClient();
  const { data: match, error: matchErr } = await supabase
    .from("matches")
    .select("proposed_times")
    .eq("id", parsed.data.match_id)
    .single();
  if (matchErr) redirect(`/matches/${parsed.data.match_id}?error=${encodeURIComponent(matchErr.message)}`);

  const proposedTimes = (match?.proposed_times ?? []) as string[];
  const safeAvailable = parsed.data.available_times.filter((t) => proposedTimes.includes(t));

  const { error } = await supabase
    .from("matches")
    .update({
      status: "accepted",
      opponent_available_times: safeAvailable,
      selected_time: null,
      booking_status: "not_started",
    })
    .eq("id", parsed.data.match_id);

  if (error) redirect(`/matches/${parsed.data.match_id}?error=${encodeURIComponent(error.message)}`);
  redirect(`/matches/${parsed.data.match_id}`);
}

const DeclineSchema = z.object({
  match_id: z.string().uuid(),
});

export async function declineInvitation(formData: FormData) {
  const parsed = DeclineSchema.safeParse({
    match_id: formData.get("match_id"),
  });
  if (!parsed.success) redirect("/?error=invalid_decline");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("matches")
    .update({ status: "declined" })
    .eq("id", parsed.data.match_id)
    .eq("status", "waiting_response");
  if (error) redirect(`/matches/${parsed.data.match_id}?error=${encodeURIComponent(error.message)}`);
  redirect(`/matches/${parsed.data.match_id}`);
}

export async function acceptInvitationAndCloseOthers(formData: FormData) {
  const { selectedPlayer } = await getViewer();
  if (!selectedPlayer) redirect("/choose-child");

  const available = formData.getAll("available_times").map(String);
  const matchId = String(formData.get("match_id") ?? "");
  if (!matchId) redirect("/?error=invalid_accept");

  const supabase = await createSupabaseServerClient();
  const { data: match, error: matchErr } = await supabase
    .from("matches")
    .select("id,status,inviter_player_id,proposed_times")
    .eq("id", matchId)
    .single();
  if (matchErr || !match) redirect(`/matches/${matchId}?error=not_found`);

  if (match.status !== "waiting_response") {
    redirect(`/matches/${matchId}?error=already_handled`);
  }

  const proposedTimes = (match.proposed_times ?? []) as string[];
  const safeAvailable = available.filter((t) => proposedTimes.includes(t));
  if (safeAvailable.length === 0) redirect(`/matches/${matchId}?error=no_availability`);

  // Accept this one
  const { error } = await supabase
    .from("matches")
    .update({
      status: "accepted",
      opponent_available_times: safeAvailable,
      booking_status: "not_started",
    })
    .eq("id", matchId)
    .eq("status", "waiting_response");
  if (error) redirect(`/matches/${matchId}?error=${encodeURIComponent(error.message)}`);

  // Close others from same inviter still waiting
  if (match.inviter_player_id) {
    await supabase
      .from("matches")
      .update({ status: "closed_by_other_acceptance" })
      .eq("inviter_player_id", match.inviter_player_id)
      .eq("status", "waiting_response")
      .neq("id", matchId);
  }

  redirect(`/matches/${matchId}`);
}

const SetResponsibleSchema = z.object({
  match_id: z.string().uuid(),
  responsible: z.enum(["player_a", "player_b"]),
});

export async function setBookingResponsible(formData: FormData) {
  const parsed = SetResponsibleSchema.safeParse({
    match_id: formData.get("match_id"),
    responsible: formData.get("responsible"),
  });
  if (!parsed.success) redirect("/?error=invalid_responsible");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("matches")
    .update({
      booking_responsible: parsed.data.responsible,
      booking_status: "not_started",
    })
    .eq("id", parsed.data.match_id);

  if (error) redirect(`/matches/${parsed.data.match_id}?error=${encodeURIComponent(error.message)}`);
  redirect(`/matches/${parsed.data.match_id}`);
}

const BookCourtSchema = z.object({
  match_id: z.string().uuid(),
  selected_time: z.string().min(1),
  court_name: z.string().min(2),
  court_number: z.string().optional().nullable(),
  court_address_notes: z.string().optional().nullable(),
});

export async function bookCourt(formData: FormData) {
  const parsed = BookCourtSchema.safeParse({
    match_id: formData.get("match_id"),
    selected_time: formData.get("selected_time"),
    court_name: formData.get("court_name"),
    court_number: formData.get("court_number"),
    court_address_notes: formData.get("court_address_notes"),
  });
  if (!parsed.success) redirect(`/matches/${String(formData.get("match_id") ?? "")}?error=invalid_booking`);

  const courtNum = String(parsed.data.court_number ?? "").trim() || null;
  const addrNotes = String(parsed.data.court_address_notes ?? "").trim() || null;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("matches")
    .update({
      status: "scheduled",
      booking_status: "booked",
      court_reserved: true,
      selected_time: new Date(parsed.data.selected_time).toISOString(),
      court_name: parsed.data.court_name.trim(),
      court_number: courtNum,
      court_address_notes: addrNotes,
    })
    .eq("id", parsed.data.match_id);
  if (error) redirect(`/matches/${parsed.data.match_id}?error=${encodeURIComponent(error.message)}`);
  redirect(`/matches/${parsed.data.match_id}`);
}

const BookingFailedSchema = z.object({
  match_id: z.string().uuid(),
});

export async function markBookingFailed(formData: FormData) {
  const parsed = BookingFailedSchema.safeParse({
    match_id: formData.get("match_id"),
  });
  if (!parsed.success) redirect("/?error=invalid_booking_failed");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("matches")
    .update({
      status: "booking_failed",
      booking_status: "failed",
      court_reserved: false,
      selected_time: null,
      court_name: null,
      court_number: null,
      court_address_notes: null,
    })
    .eq("id", parsed.data.match_id);
  if (error) redirect(`/matches/${parsed.data.match_id}?error=${encodeURIComponent(error.message)}`);
  redirect(`/matches/${parsed.data.match_id}`);
}

const AbsenceEnum = z.enum(["none", "player_a_absent", "player_b_absent", "both_absent"]);

function emptyStrToUndef(v: unknown): unknown {
  if (typeof v !== "string") return v;
  const t = v.trim();
  return t === "" ? undefined : t;
}

const ScoreFormSchema = z
  .object({
    match_id: z.string().uuid(),
    absence: AbsenceEnum,
    winner_player_id: z.preprocess(emptyStrToUndef, z.string().uuid().optional()),
    open_games_score: z.preprocess(emptyStrToUndef, z.string().optional()),
    note: z.string().optional().nullable(),
  })
  .superRefine((d, ctx) => {
    if (d.absence === "none") {
      if (!d.winner_player_id) {
        ctx.addIssue({ code: "custom", message: "winner_required", path: ["winner_player_id"] });
      }
      const og = (d.open_games_score ?? "").trim();
      if (og.length < 3) {
        ctx.addIssue({ code: "custom", message: "games_required", path: ["open_games_score"] });
      } else if (!parseOpenGameScoreInput(og)) {
        ctx.addIssue({ code: "custom", message: "games_invalid", path: ["open_games_score"] });
      }
    }
  });

export async function submitScore(formData: FormData) {
  const parsed = ScoreFormSchema.safeParse({
    match_id: formData.get("match_id"),
    absence: formData.get("absence"),
    winner_player_id: formData.get("winner_player_id") || undefined,
    open_games_score: formData.get("open_games_score") || undefined,
    note: formData.get("note"),
  });
  const midFallback = String(formData.get("match_id") ?? "");
  if (!parsed.success) redirect(`/matches/${midFallback}?error=invalid_score`);

  const matchId = parsed.data.match_id;
  const supabase = await createSupabaseServerClient();

  const { data: row, error: mErr } = await supabase
    .from("matches")
    .select("player_a_id,player_b_id,status")
    .eq("id", matchId)
    .single();
  if (mErr || !row) redirect(`/matches/${matchId}?error=not_found`);
  if (row.status === "cancelled") {
    redirect(`/matches/${matchId}?error=match_cancelled`);
  }
  if (isPairingResultLocked(row.status)) {
    redirect(`/matches/${matchId}?error=pair_already_completed`);
  }

  const matchPair = { player_a_id: row.player_a_id, player_b_id: row.player_b_id };

  const { data: pl } = await supabase
    .from("players")
    .select("id,first_name,last_name")
    .in("id", [row.player_a_id, row.player_b_id]);
  const pmap = new Map((pl ?? []).map((p) => [p.id, p]));
  const pa = pmap.get(row.player_a_id);
  const pb = pmap.get(row.player_b_id);
  if (!pa || !pb) redirect(`/matches/${matchId}?error=players`);

  const names = {
    a: `${pa.first_name} ${pa.last_name}`.trim(),
    b: `${pb.first_name} ${pb.last_name}`.trim(),
  };

  if (parsed.data.absence === "none" && parsed.data.winner_player_id) {
    if (
      parsed.data.winner_player_id !== row.player_a_id &&
      parsed.data.winner_player_id !== row.player_b_id
    ) {
      redirect(`/matches/${matchId}?error=invalid_winner`);
    }
    const v = validateOpenGamesForMatch(
      String(parsed.data.open_games_score ?? "").trim(),
      parsed.data.winner_player_id,
      row.player_a_id,
      row.player_b_id,
    );
    if (v.ok !== true) {
      redirect(`/matches/${matchId}?error=${v.reason}`);
    }
  }

  const built = buildScoreDatabaseFields(matchPair, names, {
    absence: parsed.data.absence,
    winner_player_id: parsed.data.absence === "none" ? (parsed.data.winner_player_id ?? null) : null,
    open_games_score: parsed.data.absence === "none" ? (parsed.data.open_games_score ?? null) : null,
    note: parsed.data.note ?? null,
  });

  const { data: existing } = await supabase.from("scores").select("id").eq("match_id", matchId).maybeSingle();

  const payload = {
    ...built,
    score_status: "published" as const,
    disputed_by_player_id: null as null,
    dispute_note: null as null,
    disputed_at: null as null,
  };

  if (existing?.id) {
    const { error } = await supabase.from("scores").update(payload).eq("id", existing.id);
    if (error) redirect(`/matches/${matchId}?error=${encodeURIComponent(error.message)}`);
  } else {
    const { error } = await supabase.from("scores").insert({
      match_id: matchId,
      ...payload,
    });
    if (error) redirect(`/matches/${matchId}?error=${encodeURIComponent(error.message)}`);
  }

  await supabase.from("matches").update({ status: "published" }).eq("id", matchId);

  redirect(`/matches/${matchId}`);
}

const DirectResultSchema = z
  .object({
    opponent_id: z.string().uuid(),
    absence: AbsenceEnum,
    winner_player_id: z.preprocess(emptyStrToUndef, z.string().uuid().optional()),
    open_games_score: z.preprocess(emptyStrToUndef, z.string().optional()),
    match_date: z.string().optional().nullable(),
    note: z.string().optional().nullable(),
  })
  .superRefine((d, ctx) => {
    if (d.absence === "none") {
      if (!d.winner_player_id) {
        ctx.addIssue({ code: "custom", message: "winner_required", path: ["winner_player_id"] });
      }
      const og = (d.open_games_score ?? "").trim();
      if (og.length < 3) {
        ctx.addIssue({ code: "custom", message: "games_required", path: ["open_games_score"] });
      } else if (!parseOpenGameScoreInput(og)) {
        ctx.addIssue({ code: "custom", message: "games_invalid", path: ["open_games_score"] });
      }
    }
  });

export async function publishDirectResult(formData: FormData) {
  const { selectedPlayer } = await getViewer();
  if (!selectedPlayer) redirect("/choose-child");

  const parsed = DirectResultSchema.safeParse({
    opponent_id: formData.get("opponent_id"),
    absence: formData.get("absence"),
    winner_player_id: formData.get("winner_player_id") || undefined,
    open_games_score: formData.get("open_games_score") || undefined,
    match_date: formData.get("match_date"),
    note: formData.get("note"),
  });
  if (!parsed.success) redirect("/result?error=invalid");

  const supabase = await createSupabaseServerClient();
  const pair = canonicalPair(selectedPlayer.id, parsed.data.opponent_id);

  const { data: existing } = await supabase
    .from("matches")
    .select("id,status")
    .or(
      `and(player_a_id.eq.${selectedPlayer.id},player_b_id.eq.${parsed.data.opponent_id}),and(player_a_id.eq.${parsed.data.opponent_id},player_b_id.eq.${selectedPlayer.id})`,
    )
    .maybeSingle();

  if (existing?.id && isPairingResultLocked(existing.status)) {
    redirect("/result?error=pair_already_completed");
  }

  const selectedTime = parsed.data.match_date
    ? new Date(String(parsed.data.match_date)).toISOString()
    : null;

  let matchId = existing?.id ?? null;
  if (!matchId) {
    const { data: created, error } = await supabase
      .from("matches")
      .insert({
        player_a_id: pair.player_a_id,
        player_b_id: pair.player_b_id,
        status: "published",
        proposed_times: [],
        opponent_available_times: [],
        selected_time: selectedTime,
        court_name: null,
        court_number: null,
        court_address_notes: null,
        proposed_by: null,
        booking_responsible: "undecided",
        booking_status: "not_started",
        court_reserved: false,
        cancellation_reason: null,
        cancelled_at: null,
        cancelled_by_player_id: null,
      })
      .select("id")
      .single();
    if (error || !created?.id) redirect(`/result?error=${encodeURIComponent(error?.message ?? "create_failed")}`);
    matchId = created.id;
  } else {
    await supabase
      .from("matches")
      .update({
        status: "published",
        selected_time: selectedTime,
        cancellation_reason: null,
        cancelled_at: null,
        cancelled_by_player_id: null,
      })
      .eq("id", matchId);
  }

  const matchRowIds = {
    player_a_id: pair.player_a_id,
    player_b_id: pair.player_b_id,
  };

  const { data: pl } = await supabase
    .from("players")
    .select("id,first_name,last_name")
    .in("id", [pair.player_a_id, pair.player_b_id]);
  const pmap = new Map((pl ?? []).map((p) => [p.id, p]));
  const pa = pmap.get(pair.player_a_id);
  const pb = pmap.get(pair.player_b_id);
  if (!pa || !pb) redirect(`/result?error=players`);

  const names = {
    a: `${pa.first_name} ${pa.last_name}`.trim(),
    b: `${pb.first_name} ${pb.last_name}`.trim(),
  };

  if (parsed.data.absence === "none" && parsed.data.winner_player_id) {
    if (
      parsed.data.winner_player_id !== pair.player_a_id &&
      parsed.data.winner_player_id !== pair.player_b_id
    ) {
      redirect("/result?error=invalid_winner");
    }
    const v = validateOpenGamesForMatch(
      String(parsed.data.open_games_score ?? "").trim(),
      parsed.data.winner_player_id,
      pair.player_a_id,
      pair.player_b_id,
    );
    if (v.ok !== true) {
      redirect(`/result?error=${v.reason}`);
    }
  }

  const built = buildScoreDatabaseFields(matchRowIds, names, {
    absence: parsed.data.absence,
    winner_player_id: parsed.data.absence === "none" ? (parsed.data.winner_player_id ?? null) : null,
    open_games_score: parsed.data.absence === "none" ? (parsed.data.open_games_score ?? null) : null,
    note: parsed.data.note ?? null,
  });

  const noteOnly = parsed.data.note ?? null;

  const { data: existingScore } = await supabase
    .from("scores")
    .select("id")
    .eq("match_id", matchId)
    .maybeSingle();

  const payload = {
    ...built,
    note: noteOnly,
    score_status: "published" as const,
    disputed_by_player_id: null as null,
    dispute_note: null as null,
    disputed_at: null as null,
  };

  if (existingScore?.id) {
    const { error } = await supabase.from("scores").update(payload).eq("id", existingScore.id);
    if (error) redirect(`/result?error=${encodeURIComponent(error.message)}`);
  } else {
    const { error } = await supabase.from("scores").insert({
      match_id: matchId,
      ...payload,
    });
    if (error) redirect(`/result?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/matches/${matchId}`);
}

const DisputeSchema = z.object({
  match_id: z.string().uuid(),
  dispute_note: z.string().min(3),
});

export async function reportScoreDispute(formData: FormData) {
  const { selectedPlayer } = await getViewer();
  if (!selectedPlayer) redirect("/choose-child");

  const parsed = DisputeSchema.safeParse({
    match_id: formData.get("match_id"),
    dispute_note: formData.get("dispute_note"),
  });
  if (!parsed.success) redirect(`/matches/${String(formData.get("match_id") ?? "")}?error=invalid_dispute`);

  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("scores")
    .update({
      score_status: "disputed",
      disputed_by_player_id: selectedPlayer.id,
      dispute_note: parsed.data.dispute_note,
      disputed_at: now,
    })
    .eq("match_id", parsed.data.match_id);
  if (error) redirect(`/matches/${parsed.data.match_id}?error=${encodeURIComponent(error.message)}`);

  await supabase.from("matches").update({ status: "disputed" }).eq("id", parsed.data.match_id);
  redirect(`/matches/${parsed.data.match_id}`);
}
