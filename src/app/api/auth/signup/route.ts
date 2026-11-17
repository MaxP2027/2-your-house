import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/config";
import { signupSchema } from "@/lib/validation";
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
    const input = await readInput(request, signupSchema);
    if (input.response) return input.response;
    const { fullName, email, password, role } = input.data;
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
        emailRedirectTo: `${getSiteOrigin()}/auth/confirm`,
      },
    });
    if (error) {
      if (isRateLimited(error)) return rateLimitFailure();
      if (["user_already_exists", "email_exists"].includes(error.code ?? ""))
        return jsonResponse({ ok: true });
      return failure(
        "We could not process your registration. Check your information and try again.",
        400,
      );
    }
    if (data.session) {
      // Fail closed if the deployment forgot to enable confirmation in Supabase.
      await supabase.auth.signOut({ scope: "local" });
      return failure(
        "Account services need configuration. Please try again later.",
        503,
      );
    }
    // The same response covers existing accounts and successful registrations.
    return jsonResponse({ ok: true });
  } catch (error) {
    return unexpectedFailure(error, "signup");
  }
}
