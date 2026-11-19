import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("homepage navigation and role selection work", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Comfort starts",
  );
  await page.getByRole("link", { name: "Log in", exact: true }).first().click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel("Email address")).toBeVisible();
  await page.goto("/");
  await page
    .getByRole("link", { name: "Join as a Technician", exact: true })
    .click();
  await expect(page.getByLabel("Account type")).toHaveValue("technician");
  await page.getByLabel("Account type").selectOption("customer");
  await expect(page.getByLabel("Account type")).toHaveValue("customer");
  await page.goto("/");
  await page.getByRole("link", { name: /Find HVAC Help/ }).click();
  await expect(page.getByLabel("Account type")).toHaveValue("customer");
});

test("visitors cannot access the dashboard or private APIs", async ({
  page,
  request,
}) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  expect((await request.get("/api/me")).status()).toBe(401);
  expect([401, 503]).toContain(
    (await request.get("/api/marketplace")).status(),
  );
});

test("login network failure clears passwords and permits retry", async ({
  page,
}) => {
  await page.route("**/api/auth/login", (route) => route.abort("failed"));
  await page.goto("/login");
  await page.getByLabel("Email address").fill("network-test@example.test");
  await page.getByLabel("Password", { exact: true }).fill("test-password-123");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Email address")).toHaveValue(
    "network-test@example.test",
  );
  await expect(
    page.getByRole("button", { name: "Log in", exact: true }),
  ).toBeEnabled();
});

test("homepage supports keyboard navigation", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toHaveAttribute("href", "/");
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toHaveAttribute("href", "#how-it-works");
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toHaveAttribute("href", "/login");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/login$/);
});

for (const path of ["/", "/signup", "/login", "/check-email"]) {
  test(`accessible page: ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);
  });
}
