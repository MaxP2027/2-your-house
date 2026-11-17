import { getAccount } from "@/lib/auth";
import { failure, jsonResponse, unexpectedFailure } from "@/lib/http";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const account = await getAccount();
    if (!account) return failure("Log in to view your account.", 401);
    if (!account.profile)
      return failure(
        "Your account profile is unavailable. Please try again later.",
        409,
      );
    return jsonResponse({
      user: { id: account.user.id, email: account.user.email },
      profile: account.profile,
    });
  } catch (error) {
    return unexpectedFailure(error, "me");
  }
}
