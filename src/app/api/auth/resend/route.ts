import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/config";
import { resendSchema } from "@/lib/validation";
import {
  checkOrigin,
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
    const input = await readInput(request, resendSchema);
    if (input.response) return input.response;
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: input.data.email,
      options: { emailRedirectTo: `${getSiteOrigin()}/auth/confirm` },
    });
    if (error && isRateLimited(error)) return rateLimitFailure();
    if (error && (error.status ?? 0) >= 500)
      return unexpectedFailure(error, "resend");
    // Existing, confirmed, and unknown addresses all get the same response.
    return jsonResponse({ ok: true });
  } catch (error) {
    return unexpectedFailure(error, "resend");
  }
}
