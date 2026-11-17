import { NextResponse } from "next/server";
import type { z } from "zod";
import { ConfigurationError, getSiteOrigin } from "@/lib/config";

export function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
  });
}
export function failure(error: string, status: number) {
  return jsonResponse({ error }, status);
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (origin !== getSiteOrigin() || fetchSite === "cross-site") {
    return failure(
      "This request could not be verified. Reload the page and try again.",
      403,
    );
  }
  return null;
}
export async function readInput<T>(request: Request, schema: z.ZodType<T>) {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  ) {
    return { response: failure("Send a JSON request.", 415) } as const;
  }
  if (Number(request.headers.get("content-length")) > 16384) {
    return { response: failure("The request is too large.", 413) } as const;
  }
  const body = await request.text();
  if (body.length > 16384)
    return { response: failure("The request is too large.", 413) } as const;
  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    return {
      response: failure("The request could not be read.", 400),
    } as const;
  }
  const result = schema.safeParse(value);
  if (!result.success) {
    return {
      response: failure(
        result.error.issues[0]?.message ?? "Check your information.",
        400,
      ),
    } as const;
  }
  return { data: result.data } as const;
}
export function unexpectedFailure(error: unknown, operation: string) {
  if (error instanceof ConfigurationError) {
    return failure(
      "Account services are not ready yet. Please try again later.",
      503,
    );
  }
  // Only a fixed operation label is recorded; never log request data or provider errors.
  console.error(
    JSON.stringify({ event: "account_operation_failed", operation }),
  );
  return failure(
    "Account services are temporarily unavailable. Please try again.",
    503,
  );
}
export function isRateLimited(error: { status?: number; code?: string }) {
  return (
    error.status === 429 ||
    error.code === "over_request_rate_limit" ||
    error.code === "over_email_send_rate_limit"
  );
}
export function rateLimitFailure() {
  const response = failure(
    "Too many attempts. Wait a minute before trying again.",
    429,
  );
  response.headers.set("Retry-After", "60");
  return response;
}
