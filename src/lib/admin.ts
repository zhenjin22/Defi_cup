import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Pilot: returns Supabase client without requiring sign-in or app_admins row (direct /admin URL). */
export async function assertAdminSupabase() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}
