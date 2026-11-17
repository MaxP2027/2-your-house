import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/config";

export async function getAccount() {
  if (!hasSupabaseConfig()) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email_confirmed_at) return null;
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, role, created_at")
    .eq("id", data.user.id)
    .maybeSingle();
  if (profileError)
    throw new Error(
      "Your account is temporarily unavailable. Please try again.",
    );
  return { user: data.user, profile };
}
