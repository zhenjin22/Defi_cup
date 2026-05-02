"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { assertAdminSupabase } from "@/lib/admin";

function adminErr(msg: string): never {
  redirect(`/admin?error=${encodeURIComponent(msg)}`);
}

const MATCH_STATUSES = [
  "not_scheduled",
  "waiting_response",
  "accepted",
  "declined",
  "closed_by_other_acceptance",
  "proposed",
  "availability_confirmed",
  "booking_failed",
  "scheduled",
  "published",
  "disputed",
  "resolved",
] as const;

const UpdatePlayerSchema = z.object({
  id: z.string().uuid(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  birth_year: z.coerce.number().int().min(1990).max(2020),
  level: z.string().min(1),
});

export async function adminUpdatePlayer(formData: FormData) {
  const { supabase } = await assertAdminSupabase();
  const parsed = UpdatePlayerSchema.safeParse({
    id: formData.get("id"),
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    birth_year: formData.get("birth_year"),
    level: formData.get("level"),
  });
  if (!parsed.success) adminErr("Invalid player form");

  const rawPhone = String(formData.get("parent_phone") ?? "").replace(/[^\d]/g, "").trim();
  const parent_phone = rawPhone.length >= 6 ? rawPhone : null;

  const { error } = await supabase
    .from("players")
    .update({
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      birth_year: parsed.data.birth_year,
      level: parsed.data.level,
      parent_phone,
    })
    .eq("id", parsed.data.id);

  if (error) adminErr(error.message);
  revalidatePath("/admin");
  redirect("/admin?msg=player_saved");
}

const MatchStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(MATCH_STATUSES),
});

export async function adminUpdateMatchStatus(formData: FormData) {
  const { supabase } = await assertAdminSupabase();
  const parsed = MatchStatusSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });
  if (!parsed.success) adminErr("Invalid match");

  const { error } = await supabase.from("matches").update({ status: parsed.data.status }).eq("id", parsed.data.id);
  if (error) adminErr(error.message);
  revalidatePath("/admin");
  redirect("/admin?msg=match_saved");
}

const MatchIdSchema = z.object({ id: z.string().uuid() });

export async function adminResetMatch(formData: FormData) {
  const { supabase } = await assertAdminSupabase();
  const parsed = MatchIdSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) adminErr("Invalid match");

  await supabase.from("scores").delete().eq("match_id", parsed.data.id);

  const { error } = await supabase
    .from("matches")
    .update({
      status: "not_scheduled",
      proposed_times: [],
      opponent_available_times: [],
      selected_time: null,
      court_name: null,
      court_number: null,
      court_address_notes: null,
      proposed_by: null,
      inviter_player_id: null,
      booking_responsible: "undecided",
      booking_status: "not_started",
    })
    .eq("id", parsed.data.id);

  if (error) adminErr(error.message);
  revalidatePath("/admin");
  redirect("/admin?msg=match_reset");
}

const ReopenSchema = z.object({
  id: z.string().uuid(),
  inviter_player_id: z.string().uuid(),
});

export async function adminReopenInvitation(formData: FormData) {
  const { supabase } = await assertAdminSupabase();
  const parsed = ReopenSchema.safeParse({
    id: formData.get("id"),
    inviter_player_id: formData.get("inviter_player_id"),
  });
  if (!parsed.success) adminErr("Invalid reopen form");

  const { error } = await supabase
    .from("matches")
    .update({
      status: "waiting_response",
      inviter_player_id: parsed.data.inviter_player_id,
      booking_status: "not_started",
      booking_responsible: "undecided",
    })
    .eq("id", parsed.data.id);

  if (error) adminErr(error.message);
  revalidatePath("/admin");
  redirect("/admin?msg=invitation_reopened");
}

const ScoreTextSchema = z.object({
  match_id: z.string().uuid(),
  score_text: z.string().min(1),
});

export async function adminUpdateScoreText(formData: FormData) {
  const { supabase } = await assertAdminSupabase();
  const parsed = ScoreTextSchema.safeParse({
    match_id: formData.get("match_id"),
    score_text: formData.get("score_text"),
  });
  if (!parsed.success) adminErr("Invalid score");

  const { data: score } = await supabase.from("scores").select("id").eq("match_id", parsed.data.match_id).maybeSingle();
  if (!score?.id) adminErr("Score row not found");

  const { error } = await supabase
    .from("scores")
    .update({ score_text: parsed.data.score_text })
    .eq("id", score.id);

  if (error) adminErr(error.message);
  revalidatePath("/admin");
  redirect("/admin?msg=score_saved");
}

const ResolveSchema = z.object({
  match_id: z.string().uuid(),
  score_text: z.string().min(3),
});

export async function adminResolveDispute(formData: FormData) {
  const { supabase } = await assertAdminSupabase();
  const parsed = ResolveSchema.safeParse({
    match_id: formData.get("match_id"),
    score_text: formData.get("score_text"),
  });
  if (!parsed.success) adminErr("Invalid dispute resolution");

  const { error: e1 } = await supabase
    .from("scores")
    .update({
      score_text: parsed.data.score_text,
      score_status: "resolved",
    })
    .eq("match_id", parsed.data.match_id);

  if (e1) adminErr(e1.message);

  const { error: e2 } = await supabase.from("matches").update({ status: "resolved" }).eq("id", parsed.data.match_id);
  if (e2) adminErr(e2.message);

  revalidatePath("/admin");
  redirect("/admin?msg=dispute_resolved");
}

const MatchOnlySchema = z.object({ match_id: z.string().uuid() });

export async function adminMarkDisputeResolved(formData: FormData) {
  const { supabase } = await assertAdminSupabase();
  const parsed = MatchOnlySchema.safeParse({ match_id: formData.get("match_id") });
  if (!parsed.success) adminErr("Invalid match");

  const { error: e1 } = await supabase
    .from("scores")
    .update({ score_status: "resolved" })
    .eq("match_id", parsed.data.match_id);

  if (e1) adminErr(e1.message);

  const { error: e2 } = await supabase.from("matches").update({ status: "resolved" }).eq("id", parsed.data.match_id);
  if (e2) adminErr(e2.message);

  revalidatePath("/admin");
  redirect("/admin?msg=dispute_resolved");
}
