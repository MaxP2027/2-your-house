import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/config";

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const next = request.nextUrl.searchParams.get("next");
  // Never trust an arbitrary redirect from an email link.
  let origin: string;
  try {
    origin = getSiteOrigin();
  } catch {
    return new NextResponse("Account services are not configured.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
  function redirect(path: string) {
    const response = NextResponse.redirect(new URL(path, origin), 303);
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }
  if (
    !tokenHash ||
    tokenHash.length > 512 ||
    type !== "email" ||
    (next && next !== "/dashboard")
  ) {
    return redirect("/check-email?error=invalid");
  }
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "email",
    });
    if (error || !data.user?.email_confirmed_at)
      return redirect("/check-email?error=invalid");
    return redirect("/dashboard");
  } catch {
    return redirect("/check-email?error=unavailable");
  }
}
