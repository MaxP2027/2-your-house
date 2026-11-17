import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";
import { getSupabaseConfig } from "@/lib/config";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, key } = getSupabaseConfig();
  return createServerClient<Database>(url, key, {
    cookieOptions: {
      sameSite: "lax",
      secure: process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://"),
      path: "/",
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot write cookies. The proxy refreshes them first.
        }
      },
    },
  });
}
