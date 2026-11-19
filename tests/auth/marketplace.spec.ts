import {
  test,
  expect,
  request as playwrightRequest,
  type APIRequestContext,
} from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const password = "Local-test-only-12345!";
const supabaseURL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const admin = createClient(
  supabaseURL,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const siteURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
type Account = {
  id: string;
  email: string;
  api: APIRequestContext;
  direct: SupabaseClient;
};
type Snapshot = {
  requests: Array<{
    id: string;
    customer_id: string;
    technician_id: string;
    status: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    approx_lat: number;
    approx_lng: number;
  }>;
  slots: Array<{ id: string; technician_id: string; starts_at: string }>;
  conversations: Array<{
    id: string;
    customer_id: string;
    technician_id: string;
  }>;
  messages: Array<{ id: string; conversation_id: string; body: string }>;
};
async function createAccount(
  role: "customer" | "technician",
  accounts: Account[],
) {
  const email = `sprint2-${randomUUID()}@example.test`;
  const result = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Integration ${role}`, role },
  });
  if (result.error || !result.data.user)
    throw new Error("Could not create isolated local fixture.");
  const api = await playwrightRequest.newContext({
    baseURL: siteURL,
    extraHTTPHeaders: { origin: siteURL },
  });
  const direct = createClient(supabaseURL, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const account = { id: result.data.user.id, email, api, direct };
  accounts.push(account);
  expect(
    (await api.post("/api/auth/login", { data: { email, password } })).status(),
  ).toBe(200);
  const signIn = await direct.auth.signInWithPassword({ email, password });
  expect(signIn.error).toBeNull();
  return account;
}
async function mutate(
  account: Account,
  data: Record<string, unknown>,
  expected = 200,
) {
  const response = await account.api.post("/api/marketplace", { data });
  expect(response.status()).toBe(expected);
  return response;
}
async function snapshot(account: Account): Promise<Snapshot> {
  const response = await account.api.get("/api/marketplace");
  expect(response.status()).toBe(200);
  return response.json();
}
async function cleanup(accounts: Account[]) {
  // Delete only records owned by this test's known UUIDs, then remove local users.
  // The config rejects hosted database URLs before any fixture is created.
  const ids = accounts.map((account) => account.id);
  if (ids.length) {
    for (const table of ["service_requests", "conversations"]) {
      const result = await admin.from(table).delete().in("customer_id", ids);
      if (result.error) throw new Error("Local fixture record cleanup failed.");
    }
  }
  for (const account of accounts.reverse()) {
    await account.api.dispose();
    const result = await admin.auth.admin.deleteUser(account.id);
    if (result.error)
      throw new Error(
        "Local fixture cleanup failed; remove sprint2 test users from local Studio.",
      );
  }
}

test("private booking, slot conflicts, messaging, and address access follow the lifecycle", async ({
  page,
}) => {
  const accounts: Account[] = [];
  try {
    const tech = await createAccount("technician", accounts);
    const customer = await createAccount("customer", accounts);
    const outsider = await createAccount("customer", accounts);
    await page.goto("/login");
    await page.getByLabel("Email address").fill(customer.email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard$/);

    await mutate(tech, {
      action: "saveProfile",
      display_name: "Integration HVAC",
      city: "Chicago",
      bio: "Local test fixture",
      services: "Heating, cooling",
      accepting_requests: true,
    });
    const starts = new Date(Date.now() + 3 * 86400000);
    starts.setUTCMinutes(0, 0, 0);
    const ends = new Date(starts.getTime() + 3600000);
    await mutate(tech, {
      action: "addSlot",
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
    });
    await mutate(
      tech,
      {
        action: "addSlot",
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
      },
      409,
    );
    await mutate(
      customer,
      {
        action: "saveProfile",
        display_name: "Impersonation",
        city: "Chicago",
        bio: "",
        services: "Heating",
        accepting_requests: true,
      },
      403,
    );
    const slot = (await snapshot(customer)).slots.find(
      (value) => value.technician_id === tech.id,
    );
    expect(slot).toBeDefined();
    const booking = {
      action: "request",
      slot_id: slot!.id,
      description: "Heating stopped working in the living room.",
      address: "123 Test-only Street",
      latitude: 41.881234,
      longitude: -87.631234,
    };
    // Competing clients cannot reserve the same slot.
    const race = await Promise.all([
      customer.api.post("/api/marketplace", { data: booking }),
      outsider.api.post("/api/marketplace", { data: booking }),
    ]);
    expect(race.map((value) => value.status()).sort()).toEqual([200, 409]);
    const winner = race[0].status() === 200 ? customer : outsider;
    const unrelated = winner.id === customer.id ? outsider : customer;
    let job = (await snapshot(tech)).requests.find(
      (value) => value.customer_id === winner.id,
    )!;
    expect(job).toBeDefined();
    expect(job.status).toBe("pending");
    expect(job).not.toHaveProperty("address");
    expect(job).not.toHaveProperty("latitude");
    expect(job.approx_lat).not.toBe(booking.latitude);
    expect((await snapshot(unrelated)).requests).not.toContainEqual(
      expect.objectContaining({ id: job.id }),
    );
    await mutate(
      unrelated,
      { action: "requestAction", request_id: job.id, status: "cancelled" },
      403,
    );
    const conversation = (await snapshot(winner)).conversations.find(
      (value) => value.technician_id === tech.id,
    )!;
    expect(conversation).toBeDefined();
    await mutate(winner, {
      action: "message",
      conversation_id: conversation.id,
      body: "The furnace is making a clicking sound.",
    });
    await mutate(tech, {
      action: "message",
      conversation_id: conversation.id,
      body: "Thanks. I will inspect it during the visit.",
    });
    expect(
      (await snapshot(tech)).messages.filter(
        (value) => value.conversation_id === conversation.id,
      ),
    ).toHaveLength(2);
    expect(
      (await snapshot(unrelated)).messages.filter(
        (value) => value.conversation_id === conversation.id,
      ),
    ).toHaveLength(0);
    await mutate(
      unrelated,
      {
        action: "message",
        conversation_id: conversation.id,
        body: "Unauthorized message",
      },
      403,
    );
    // Test direct database access independently of the application's response filtering.
    const foreignMessages = await unrelated.direct
      .from("messages")
      .select("*")
      .eq("conversation_id", conversation.id);
    expect(foreignMessages.error).toBeNull();
    expect(foreignMessages.data).toEqual([]);
    const privateLocation = await tech.direct
      .from("request_locations")
      .select("*")
      .eq("request_id", job.id);
    expect(privateLocation.error).toBeNull();
    expect(privateLocation.data).toEqual([]);
    await mutate(tech, {
      action: "requestAction",
      request_id: job.id,
      status: "accepted",
    });
    job = (await snapshot(tech)).requests.find((value) => value.id === job.id)!;
    expect(job.address).toBe(booking.address);
    expect(job.latitude).toBe(booking.latitude);
    await mutate(winner, {
      action: "requestAction",
      request_id: job.id,
      status: "cancelled",
    });
    job = (await snapshot(tech)).requests.find((value) => value.id === job.id)!;
    expect(job.status).toBe("cancelled");
    expect(job).not.toHaveProperty("address");
    expect(job).not.toHaveProperty("latitude");
    expect((await snapshot(unrelated)).slots).toContainEqual(
      expect.objectContaining({ id: slot!.id }),
    );
    expect(
      (await snapshot(winner)).messages.filter(
        (value) => value.conversation_id === conversation.id,
      ),
    ).toHaveLength(2);
    await page.getByText("Your account", { exact: true }).click();
    await page.getByRole("button", { name: "Log out", exact: true }).click();
    await expect(page).toHaveURL(siteURL + "/");
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
  } finally {
    await cleanup(accounts);
  }
});
