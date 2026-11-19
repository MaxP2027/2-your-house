import { afterEach, describe, expect, it, vi } from "vitest";
import { signupSchema, loginSchema } from "@/lib/validation";
import {
  ConfigurationError,
  getSiteOrigin,
  getSupabaseConfig,
  hasSupabaseConfig,
} from "@/lib/config";
import { checkOrigin, readInput, jsonResponse } from "@/lib/http";

const valid = {
  fullName: "Test Customer",
  email: " Person@Example.test ",
  password: "test-password-123",
  confirmPassword: "test-password-123",
  role: "customer",
};
afterEach(() => vi.unstubAllEnvs());
describe("registration validation", () => {
  it.each(["customer", "technician"])(
    "accepts and normalizes a %s registration",
    (role) => {
      const result = signupSchema.parse({ ...valid, role });
      expect(result.email).toBe("person@example.test");
    },
  );
  it.each([
    { email: "not-an-email" },
    { password: "short", confirmPassword: "short" },
    { confirmPassword: "something-different" },
    { role: "administrator" },
    { fullName: "   " },
    { admin: true },
  ])("rejects invalid or privileged registration input %j", (override) => {
    expect(signupSchema.safeParse({ ...valid, ...override }).success).toBe(
      false,
    );
  });
  it("does not change password whitespace", () => {
    expect(
      loginSchema.parse({
        email: "a@example.test",
        password: "  keep spaces  ",
      }).password,
    ).toBe("  keep spaces  ");
  });
});
describe("request protections", () => {
  it("rejects missing, foreign, and cross-site origins", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://127.0.0.1:3000");
    for (const headers of [
      {},
      { origin: "https://attacker.example" },
      { origin: "http://127.0.0.1:3000", "sec-fetch-site": "cross-site" },
    ] as Record<string, string>[]) {
      expect(
        checkOrigin(
          new Request("http://127.0.0.1:3000/api/auth/login", { headers }),
        )?.status,
      ).toBe(403);
    }
    expect(
      checkOrigin(
        new Request("http://127.0.0.1:3000/api/auth/login", {
          headers: { origin: "http://127.0.0.1:3000" },
        }),
      ),
    ).toBeNull();
  });
  it("rejects invalid JSON and unsupported payload types", async () => {
    const malformed = await readInput(
      new Request("http://localhost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      }),
      loginSchema,
    );
    expect(malformed.response?.status).toBe(400);
    const form = await readInput(
      new Request("http://localhost", { method: "POST", body: "email=x" }),
      loginSchema,
    );
    expect(form.response?.status).toBe(415);
  });
  it("marks private account responses uncacheable", () => {
    expect(jsonResponse({ ok: true }).headers.get("cache-control")).toBe(
      "private, no-store",
    );
  });
  it("fails closed when configuration is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(hasSupabaseConfig()).toBe(false);
    expect(getSupabaseConfig).toThrow(ConfigurationError);
    expect(getSiteOrigin).toThrow(ConfigurationError);
  });
  it.each(["javascript:alert(1)", "https://name:password@example.test"])(
    "rejects unsafe site origin %s",
    (value) => {
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", value);
      expect(getSiteOrigin).toThrow(ConfigurationError);
    },
  );
});
