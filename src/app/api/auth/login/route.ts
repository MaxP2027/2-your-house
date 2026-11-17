import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validation";
import {
  checkOrigin,
  failure,
  isRateLimited,
  jsonResponse,
  rateLimitFailure,
  readInput,
  unexpectedFailure,
} from "@/lib/http";

export async function POST(request: Request) {
  try {
    const rejected = checkOrigin(request);
    if (rejected) return rejected;
    const input = await readInput(request, loginSchema);
    if (input.response) return input.response;
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword(input.data);
    if (error || !data.user?.email_confirmed_at) {
      if (error && isRateLimited(error)) return rateLimitFailure();
      if (data.session) await supabase.auth.signOut({ scope: "local" });
      return failure(
        "Unable to log in. Check your email and password and make sure you have confirmed your email.",
        401,
      );
    }
    return jsonResponse({ ok: true });
  } catch (error) {
    return unexpectedFailure(error, "login");
  }
}
