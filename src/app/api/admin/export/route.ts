import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function esc(v: unknown) {
  const s = v == null ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function csv(headers: string[], rows: Record<string, unknown>[]) {
  const lines = [
    headers.map((h) => esc(h)).join(","),
    ...rows.map((r) => headers.map((h) => esc(r[h])).join(",")),
  ];
  return "\uFEFF" + lines.join("\n");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  if (type !== "players" && type !== "matches" && type !== "scores") {
    return NextResponse.json({ error: "bad_type" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  if (type === "players") {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const headers = [
      "id",
      "created_at",
      "first_name",
      "last_name",
      "birth_year",
      "level",
      "group_name",
      "parent_email",
      "parent_phone",
    ];
    const body = csv(headers, (data ?? []) as Record<string, unknown>[]);
    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="players.csv"',
      },
    });
  }

  if (type === "matches") {
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const headers = [
      "id",
      "created_at",
      "player_a_id",
      "player_b_id",
      "inviter_player_id",
      "status",
      "proposed_times",
      "opponent_available_times",
      "selected_time",
      "court_name",
      "court_number",
      "court_address_notes",
      "proposed_by",
      "booking_responsible",
      "booking_status",
    ];
    const rows = (data ?? []).map((r) => ({
      ...r,
      proposed_times: JSON.stringify(r.proposed_times ?? []),
      opponent_available_times: JSON.stringify(r.opponent_available_times ?? []),
    }));
    const body = csv(headers, rows as Record<string, unknown>[]);
    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="matches.csv"',
      },
    });
  }

  const { data, error } = await supabase
    .from("scores")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const headers = [
    "id",
    "created_at",
    "match_id",
    "score_text",
    "score_status",
    "winner_player_id",
    "final_score_preset",
    "no_show_status",
    "disputed_by_player_id",
    "dispute_note",
    "disputed_at",
    "note",
  ];
  const body = csv(headers, (data ?? []) as Record<string, unknown>[]);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="scores.csv"',
    },
  });
}
