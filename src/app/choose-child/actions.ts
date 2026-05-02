"use server";

import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEFAULT_GROUP, SELECTED_PLAYER_COOKIE } from "@/lib/app-constants";

const LEGACY_DEMO_COOKIE = "dc_demo_mode";

export type EnterChildState =
  | null
  | { ok: true; playerId: string }
  | { ok: false; error: string };

export async function enterChild(
  _prev: EnterChildState,
  formData: FormData,
): Promise<EnterChildState> {
  const raw = formData.get("player_id");
  const player_id = typeof raw === "string" ? raw.trim() : "";
  if (!player_id) {
    return { ok: false, error: "invalid" };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("players")
    .select("id,group_name")
    .eq("id", player_id)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: "not_found" };
  }
  if (data.group_name !== DEFAULT_GROUP) {
    return { ok: false, error: "wrong_group" };
  }

  const cookieStore = await cookies();
  cookieStore.set(SELECTED_PLAYER_COOKIE, data.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
  cookieStore.delete(LEGACY_DEMO_COOKIE);

  return { ok: true, playerId: data.id };
}
