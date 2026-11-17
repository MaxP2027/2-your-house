import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkOrigin, jsonResponse, unexpectedFailure } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const rejected = checkOrigin(request);
    if (rejected) return rejected;
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) return unexpectedFailure(error, "logout");
    return jsonResponse({ ok: true });
  } catch (error) {
    return unexpectedFailure(error, "logout");
  }
}
