import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Player } from "@/lib/db/types";
import { DEFAULT_GROUP, SELECTED_PLAYER_COOKIE } from "@/lib/app-constants";

export { DEFAULT_GROUP, LOCAL_SELECTED_PLAYER_KEY, SELECTED_PLAYER_COOKIE } from "@/lib/app-constants";

export async function getViewer() {
  const cookieStore = await cookies();
  const selectedId =
    cookieStore.get(SELECTED_PLAYER_COOKIE)?.value?.trim() ?? null;

  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("players")
    .select("*")
    .eq("group_name", DEFAULT_GROUP)
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  const players = (data ?? []) as Player[];
  let selectedPlayer =
    (selectedId ? players.find((p) => p.id === selectedId) : null) ?? null;

  if (selectedId && !selectedPlayer) {
    const { data: row } = await supabase
      .from("players")
      .select("*")
      .eq("id", selectedId)
      .eq("group_name", DEFAULT_GROUP)
      .maybeSingle();
    if (row) {
      selectedPlayer = row as Player;
      if (!players.some((p) => p.id === row.id)) {
        players.push(selectedPlayer);
      }
    }
  }

  return { players, selectedPlayer };
}
