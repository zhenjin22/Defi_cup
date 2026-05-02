import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Match, Player, Score } from "@/lib/db/types";
import { DEFAULT_GROUP } from "@/lib/app-constants";

export async function fetchGroupPlayers(groupName: string = DEFAULT_GROUP) {
  const supabase = await createSupabaseServerClient();
  const { data = [], error } = await supabase
    .from("players")
    .select("*")
    .eq("group_name", groupName)
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });
  if (error) throw new Error(error.message);
  return data as Player[];
}

export async function fetchGroupMatches(groupName: string = DEFAULT_GROUP) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("players")
    .select("id")
    .eq("group_name", groupName);

  const players = (data ?? []) as Array<{ id: string }>;
  const ids = players.map((p) => p.id);
  if (ids.length === 0) return [] as Match[];

  const { data: matchesData = [], error } = await supabase
    .from("matches")
    .select("*")
    .in("player_a_id", ids)
    .in("player_b_id", ids);
  if (error) throw new Error(error.message);
  return matchesData as Match[];
}

export async function fetchScoresByMatchIds(matchIds: string[]) {
  if (matchIds.length === 0) return new Map<string, Score>();
  const supabase = await createSupabaseServerClient();
  const { data = [], error } = await supabase
    .from("scores")
    .select("*")
    .in("match_id", matchIds);
  if (error) throw new Error(error.message);

  const map = new Map<string, Score>();
  for (const s of data as Score[]) map.set(s.match_id, s);
  return map;
}

export function getMatchKey(aId: string, bId: string) {
  return aId < bId ? `${aId}:${bId}` : `${bId}:${aId}`;
}

