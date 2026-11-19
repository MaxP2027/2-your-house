import { test, expect, type APIRequestContext } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const inboxURL = process.env.LOCAL_EMAIL_URL || "http://127.0.0.1:54324";
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);
const password = "Local-confirmation-12345!";
type MailList = {
  messages?: Array<{ ID: string; To?: Array<{ Address: string }> }>;
};
type MailBody = {
  HTML?: string;
  Text?: string;
  body?: { html?: string; text?: string };
};
async function confirmationLink(
  api: APIRequestContext,
  email: string,
): Promise<string | null> {
  // Supabase CLI releases have used both Mailpit and Inbucket. Inspect only this test recipient.
  const mailpit = await api.get(inboxURL + "/api/v1/messages");
  let body: MailBody | null = null;
  if (mailpit.ok()) {
    try {
      const list = (await mailpit.json()) as MailList;
      const message = list.messages?.find((value) =>
        value.To?.some((to) => to.Address === email),
      );
      if (message)
        body = await (
          await api.get(
            inboxURL + "/api/v1/message/" + encodeURIComponent(message.ID),
          )
        ).json();
    } catch {
      /* Try the local Inbucket endpoint below. */
    }
  }
  if (!body) {
    const mailbox = email.split("@")[0];
    const listResponse = await api.get(
      inboxURL + "/api/v1/mailbox/" + encodeURIComponent(mailbox),
    );
    if (listResponse.ok()) {
      try {
        const list = (await listResponse.json()) as Array<{ id: string }>;
        const latest = list.at(-1);
        if (latest)
          body = await (
            await api.get(
              inboxURL +
                "/api/v1/mailbox/" +
                encodeURIComponent(mailbox) +
                "/" +
                encodeURIComponent(latest.id),
            )
          ).json();
      } catch {
        return null;
      }
    }
  }
  const text = [body?.HTML, body?.Text, body?.body?.html, body?.body?.text]
    .filter(Boolean)
    .join("\n")
    .replaceAll("&amp;", "&");
  const links = text.match(/https?:\/\/[^\s"<>]+/g) || [];
  return (
    links.find((link) => {
      try {
        const url = new URL(link);
        return (
          url.origin === baseURL &&
          url.pathname === "/auth/confirm" &&
          url.searchParams.has("token_hash")
        );
      } catch {
        return false;
      }
    }) || null
  );
}
for (const role of ["customer", "technician"] as const) {
  test(`real email confirmation and session persistence: ${role}`, async ({
    page,
    request,
  }) => {
    const email = `sprint2-mail-${randomUUID()}@example.test`;
    let userId: string | undefined;
    try {
      await page.goto("/signup?role=" + role);
      await page.getByLabel("Full name").fill("Email Integration " + role);
      await page.getByLabel("Email address").fill(email);
      await page.getByLabel("Password", { exact: true }).fill(password);
      await page.getByLabel("Confirm password", { exact: true }).fill(password);
      await page
        .getByRole("button", { name: "Create account", exact: true })
        .click();
      await expect(page).toHaveURL(/\/check-email$/);
      const users = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      userId = users.data.users.find((user) => user.email === email)?.id;
      expect(userId).toBeDefined();
      const blocked = await request.post("/api/auth/login", {
        headers: { origin: baseURL },
        data: { email, password },
      });
      expect(blocked.status()).toBe(401);
      let link: string | null = null;
      await expect
        .poll(
          async () => {
            link = await confirmationLink(request, email);
            return Boolean(link);
          },
          {
            timeout: 30_000,
            message: "No confirmation email found in the local inbox.",
          },
        )
        .toBe(true);
      await page.goto(link!);
      await expect(page).toHaveURL(/\/dashboard$/);
      await page.reload();
      await expect(page).toHaveURL(/\/dashboard$/);
      await page.getByText("Your account", { exact: true }).click();
      await page.getByRole("button", { name: "Log out", exact: true }).click();
      await expect(page).toHaveURL(baseURL + "/");
      await page.goto(
        "/auth/confirm?token_hash=invalid&type=email&next=https://example.com",
      );
      await expect(page).toHaveURL(/\/check-email\?error=invalid$/);
      await page.goto("/login");
      await page.getByLabel("Email address").fill(email);
      await page.getByLabel("Password", { exact: true }).fill(password);
      await page.getByRole("button", { name: "Log in", exact: true }).click();
      await expect(page).toHaveURL(/\/dashboard$/);
    } finally {
      if (userId) {
        const result = await admin.auth.admin.deleteUser(userId);
        if (result.error)
          throw new Error("Local confirmation fixture cleanup failed.");
      }
    }
  });
}
