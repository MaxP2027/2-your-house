import { getAccount } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  checkOrigin,
  failure,
  jsonResponse,
  readInput,
  unexpectedFailure,
} from "@/lib/http";
import { marketplaceActionSchema } from "@/lib/marketplace-validation";
import { marketplaceSnapshotSchema } from "@/lib/marketplace";
export const dynamic = "force-dynamic";

function databaseFailure(error: { code?: string }) {
  if (error.code === "42501")
    return failure("You do not have access to this action.", 403);
  if (error.code === "23505" || error.code === "23P01")
    return failure(
      "That slot or request has changed or conflicts with another booking. Refresh and choose an available option.",
      409,
    );
  if (error.code === "P0429") {
    const response = failure(
      "Too many messages. Wait a minute before sending another.",
      429,
    );
    response.headers.set("Retry-After", "60");
    return response;
  }
  if (
    error.code?.startsWith("22") ||
    error.code === "23514" ||
    error.code === "23502" ||
    error.code === "23503"
  )
    return failure("Check your information and try again.", 400);
  return failure(
    "This service is temporarily unavailable. Please try again.",
    503,
  );
}
async function accountGuard() {
  const account = await getAccount();
  if (!account)
    return failure("Log in with a confirmed account to continue.", 401);
  if (!account.profile)
    return failure(
      "Your account profile is unavailable. Please try again later.",
      403,
    );
  return null;
}
export async function GET() {
  try {
    const rejected = await accountGuard();
    if (rejected) return rejected;
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("marketplace_snapshot");
    if (error) return databaseFailure(error);
    const snapshot = marketplaceSnapshotSchema.safeParse(data);
    if (!snapshot.success)
      return failure(
        "Account data could not be loaded. Please try again.",
        503,
      );
    return jsonResponse(snapshot.data);
  } catch (error) {
    return unexpectedFailure(error, "marketplace_read");
  }
}
export async function POST(request: Request) {
  try {
    const originError = checkOrigin(request);
    if (originError) return originError;
    const rejected = await accountGuard();
    if (rejected) return rejected;
    const input = await readInput(request, marketplaceActionSchema);
    if (input.response) return input.response;
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("marketplace_mutate", {
      payload: input.data,
    });
    if (error) return databaseFailure(error);
    return jsonResponse({ ok: true });
  } catch (error) {
    return unexpectedFailure(error, "marketplace_write");
  }
}
