import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const password = "Local-workspace-12345!";
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

async function logIn(page: Page, email: string) {
  page.setDefaultTimeout(15_000);
  page.setDefaultNavigationTimeout(30_000);
  await page.goto(baseURL + "/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("status").filter({ hasText: "Loading your workspace" }),
  ).toHaveCount(0);
}

test("customer and technician complete the booking and messaging journey through the UI", async ({
  browser,
}, testInfo) => {
  test.setTimeout(150_000);
  const suffix = randomUUID().slice(0, 8);
  const technicianName = "UI Test Technician " + suffix;
  const customerName = "UI Test Customer " + suffix;
  const city = "UI Test City " + suffix;
  const technicianEmail = `sprint2-ui-tech-${suffix}@example.test`;
  const customerEmail = `sprint2-ui-customer-${suffix}@example.test`;
  const ids: string[] = [];
  const technicianContext = await browser.newContext({
    baseURL,
    viewport: { width: 1440, height: 1000 },
    timezoneId: "America/Chicago",
  });
  const customerContext = await browser.newContext({
    baseURL,
    viewport: { width: 1280, height: 900 },
    timezoneId: "America/Chicago",
  });
  try {
    for (const fixture of [
      { email: technicianEmail, full_name: technicianName, role: "technician" },
      { email: customerEmail, full_name: customerName, role: "customer" },
    ]) {
      const result = await admin.auth.admin.createUser({
        email: fixture.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fixture.full_name, role: fixture.role },
      });
      if (result.error || !result.data.user)
        throw new Error("Could not create local workspace fixture.");
      ids.push(result.data.user.id);
    }
    const technician = await technicianContext.newPage();
    const customer = await customerContext.newPage();
    await logIn(technician, technicianEmail);
    await technician
      .getByRole("button", { name: "Profile & availability", exact: true })
      .click();
    await technician
      .getByLabel("Display name", { exact: true })
      .fill(technicianName);
    await technician.getByLabel("Service city", { exact: true }).fill(city);
    await technician
      .getByLabel("Services offered", { exact: true })
      .fill("Heating repair and cooling maintenance");
    await technician
      .getByLabel("About your work", { exact: true })
      .fill("Synthetic local fixture for browser verification.");
    await technician.getByLabel("Accepting new appointment requests").check();
    await technician
      .getByRole("button", { name: "Save profile", exact: true })
      .click();
    await expect(
      technician.getByText("Your technician profile has been saved.", {
        exact: true,
      }),
    ).toBeVisible();
    const futureDate = new Date(Date.now() + 5 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    await technician
      .getByLabel("Start time", { exact: true })
      .fill(futureDate + "T10:00");
    await technician
      .getByLabel("End time", { exact: true })
      .fill(futureDate + "T11:00");
    await technician
      .getByRole("button", { name: "Add availability", exact: true })
      .click();
    await expect(
      technician.getByText("Availability added.", { exact: true }),
    ).toBeVisible();

    await logIn(customer, customerEmail);
    await customer.getByLabel("Filter technicians by city").fill(city);
    const card = customer.getByRole("article").filter({
      has: customer.getByRole("heading", {
        name: technicianName,
        exact: true,
      }),
    });
    await expect(card).toBeVisible();
    await expect(
      card.getByText("1 available slot", { exact: true }),
    ).toBeVisible();
    await card.getByRole("button", { name: "Message", exact: true }).click();
    await customer
      .getByLabel("Message", { exact: true })
      .fill("Our furnace clicks but does not produce heat.");
    await customer
      .getByRole("button", { name: "Send message", exact: true })
      .click();
    await expect(
      customer.getByRole("log", { name: "Message history" }),
    ).toContainText("Our furnace clicks but does not produce heat.");

    await customer
      .getByRole("button", { name: "Find technicians", exact: true })
      .click();
    await card
      .getByRole("button", { name: "Request a visit", exact: true })
      .click();
    await customer
      .getByLabel("Available appointment", { exact: true })
      .selectOption({ index: 1 });
    await customer
      .getByLabel("Describe the problem", { exact: true })
      .fill("The furnace clicks but does not produce heat in our living room.");
    await customer
      .getByLabel("Service address", { exact: true })
      .fill("123 Synthetic Test Street, Chicago, IL");
    await customer.getByLabel("Latitude", { exact: true }).fill("41.881234");
    await customer.getByLabel("Longitude", { exact: true }).fill("-87.631234");
    await customer
      .getByRole("button", { name: "Send appointment request", exact: true })
      .click();
    await expect(
      customer.getByText(
        "Request sent. The slot is reserved while the technician reviews it.",
        { exact: true },
      ),
    ).toBeVisible();

    await technician
      .getByRole("button", { name: "Requests", exact: true })
      .click();
    await technician
      .getByRole("button", { name: "Refresh", exact: true })
      .click();
    const requestCard = technician.getByRole("article").filter({
      has: technician.getByRole("heading", {
        name: customerName,
        exact: true,
      }),
    });
    await expect(
      requestCard.getByText("pending", { exact: true }),
    ).toBeVisible();
    await expect(requestCard).not.toContainText("123 Synthetic Test Street");
    await requestCard
      .getByRole("button", { name: "Open conversation", exact: true })
      .click();
    await expect(
      technician.getByRole("log", { name: "Message history" }),
    ).toContainText("Our furnace clicks but does not produce heat.");
    await technician
      .getByLabel("Message", { exact: true })
      .fill("Thank you. I can inspect it during your requested appointment.");
    await technician
      .getByRole("button", { name: "Send message", exact: true })
      .click();
    await expect(
      technician.getByText("Message sent.", { exact: true }),
    ).toBeVisible();
    await technician
      .getByRole("button", { name: "Requests", exact: true })
      .click();
    await requestCard
      .getByRole("button", { name: "Accept request", exact: true })
      .click();
    await expect(
      requestCard.getByText("accepted", { exact: true }),
    ).toBeVisible();
    await expect(requestCard).toContainText(
      "123 Synthetic Test Street, Chicago, IL",
    );

    await technician
      .getByRole("button", { name: "My day", exact: true })
      .click();
    await technician
      .getByLabel("Choose a day", { exact: true })
      .fill(futureDate);
    await expect(
      technician.getByText("1 confirmed visit", { exact: true }),
    ).toBeVisible();
    await expect(
      technician.getByRole("article").filter({ hasText: customerName }),
    ).toBeVisible();
    const technicianAxe = await new AxeBuilder({ page: technician })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(technicianAxe.violations).toEqual([]);
    await technician.screenshot({
      path: testInfo.outputPath("technician-agenda-desktop.png"),
      fullPage: true,
      animations: "disabled",
    });

    await customer
      .getByRole("button", { name: "My requests", exact: true })
      .click();
    await customer
      .getByRole("button", { name: "Refresh", exact: true })
      .click();
    await expect(
      customer
        .getByRole("article")
        .filter({ hasText: technicianName })
        .getByText("accepted", { exact: true }),
    ).toBeVisible();
    await customer
      .getByRole("button", { name: "Messages", exact: true })
      .click();
    await expect(
      customer.getByRole("log", { name: "Message history" }),
    ).toContainText(
      "Thank you. I can inspect it during your requested appointment.",
    );
    await customer.reload();
    await customer
      .getByRole("button", { name: "Messages", exact: true })
      .click();
    await expect(
      customer.getByRole("log", { name: "Message history" }),
    ).toContainText("Our furnace clicks but does not produce heat.");
    await customer.setViewportSize({ width: 390, height: 844 });
    const customerAxe = await new AxeBuilder({ page: customer })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(customerAxe.violations).toEqual([]);
    expect(
      await customer.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await customer.screenshot({
      path: testInfo.outputPath("customer-messages-mobile.png"),
      fullPage: true,
      animations: "disabled",
    });

    // Replace the existing final customer logout block with this block.
    // Both tabs share real cookies. The second tab must discard cached private data.
    const secondCustomerTab = await customerContext.newPage();
    secondCustomerTab.setDefaultTimeout(15_000);
    await secondCustomerTab.goto("/dashboard");
    await secondCustomerTab
      .getByRole("button", { name: "Messages", exact: true })
      .click();
    await expect(
      secondCustomerTab.getByRole("log", { name: "Message history" }),
    ).toContainText("Our furnace clicks but does not produce heat.");
    const revokedSnapshot = secondCustomerTab
      .waitForResponse(
        (response) =>
          new URL(response.url()).pathname === "/api/marketplace" &&
          response.request().method() === "GET" &&
          response.status() === 401,
        { timeout: 20_000 },
      )
      .then(
        (response) => response.status(),
        () => 0,
      );

    await customer.bringToFront();
    await customer.getByText("Your account", { exact: true }).click();
    await customer
      .getByRole("button", { name: "Log out", exact: true })
      .click();
    await expect(customer).toHaveURL(baseURL + "/");
    await secondCustomerTab.bringToFront();
    // The normal five-second refresh detects cookie removal. No mocked response.
    expect(await revokedSnapshot).toBe(401);
    await expect(secondCustomerTab).toHaveURL(/\/login$/);
    await expect(
      secondCustomerTab.getByRole("log", { name: "Message history" }),
    ).toHaveCount(0);
    await expect(
      secondCustomerTab.getByText(
        "Our furnace clicks but does not produce heat.",
        { exact: true },
      ),
    ).toHaveCount(0);
    await customer.goto("/dashboard");
    await expect(customer).toHaveURL(/\/login$/);
  } finally {
    await Promise.allSettled([
      technicianContext.close(),
      customerContext.close(),
    ]);
    if (ids.length) {
      for (const table of ["service_requests", "conversations"]) {
        const result = await admin.from(table).delete().in("customer_id", ids);
        if (result.error)
          throw new Error("Local browser fixture cleanup failed.");
      }
      for (const id of ids.reverse()) {
        const result = await admin.auth.admin.deleteUser(id);
        if (result.error)
          throw new Error("Local browser fixture user cleanup failed.");
      }
    }
  }
});
