import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig, hasSupabaseConfig } from "@/lib/config";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  response.headers.set("Cache-Control", "private, no-store");
  if (!hasSupabaseConfig()) return response;
  const { url, key } = getSupabaseConfig();
  const supabase = createServerClient(url, key, {
    cookieOptions: {
      sameSite: "lax",
      secure: process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://"),
      path: "/",
    },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        response.headers.set("Cache-Control", "private, no-store");
      },
    },
  });
  // Validate with the Auth service; never authorize from getSession alone.
  // Page and API checks remain authoritative even if this refresh fails.
  try {
    await supabase.auth.getUser();
  } catch {
    // Deliberately avoid recording tokens, request URLs, or provider errors.
  }
  return response;
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/login",
    "/signup",
    "/check-email",
    "/api/me",
  ],
};
