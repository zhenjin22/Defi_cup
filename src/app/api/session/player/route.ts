import { NextResponse } from "next/server";
import { SELECTED_PLAYER_COOKIE } from "@/lib/app-constants";

const LEGACY_DEMO_COOKIE = "dc_demo_mode";

/** Clears session cookie (used by “Switch child”). Selection is set via server action. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SELECTED_PLAYER_COOKIE);
  res.cookies.delete(LEGACY_DEMO_COOKIE);
  return res;
}
