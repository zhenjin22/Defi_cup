import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_GROUP, SELECTED_PLAYER_COOKIE } from "@/lib/app-constants";

const LEGACY_DEMO_COOKIE = "dc_demo_mode";

/** Lets the client see whether the httpOnly child cookie is present (no value leaked). */
export async function GET() {
  const cookieStore = await cookies();
  const v = cookieStore.get(SELECTED_PLAYER_COOKIE)?.value;
  return NextResponse.json({ ok: true, hasPlayerCookie: Boolean(v?.trim()) });
}

/**
 * Restores child session from trusted client context (same validation as choose-child).
 * Used when admin/auth flows left localStorage intact but the httpOnly cookie was dropped.
 */
export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ ok: false, error: "missing_env" }, { status: 500 });
  }

  const body = (await request.json()) as { player_id?: string };
  if (!body.player_id || typeof body.player_id !== "string") {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const supabase = createClient(url, anonKey);
  const { data, error } = await supabase
    .from("players")
    .select("id,group_name")
    .eq("id", body.player_id.trim())
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 400 });
  }
  if (data.group_name !== DEFAULT_GROUP) {
    return NextResponse.json({ ok: false, error: "wrong_group" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SELECTED_PLAYER_COOKIE, data.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
  res.cookies.delete(LEGACY_DEMO_COOKIE);
  return res;
}

/** Clears session cookie (used by “Switch child”). */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SELECTED_PLAYER_COOKIE);
  res.cookies.delete(LEGACY_DEMO_COOKIE);
  return res;
}
