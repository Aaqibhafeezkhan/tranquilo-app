// A 429 from /api/items shows a calm "busy, try again" page in place of the
// feed, in the same treatment as the 404 page, rather than a blank screen.
import type { Route } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { gotoFeed, stubBackend } from "./harness.mts";

const MESSAGE = /We.re getting a lot of requests right now/;

const tooMany = (route: Route) =>
  route.fulfill({
    status: 429,
    headers: { "Retry-After": "30" },
    contentType: "application/json",
    body: JSON.stringify({ error: "rate limited" }),
  });

test("a 429 while the app starts up shows the busy page", async ({ page }) => {
  await stubBackend(page);
  await page.route("**/api/items**", tooMany);
  await page.goto("/index.html");
  await expect(page.locator(".error-state")).toBeVisible();
  await expect(page.locator(".error-heading")).toHaveText(MESSAGE);
  await expect(page.locator(".error-detail")).toContainText("429");
  await expect(page.locator(".error-retry-btn")).toBeVisible();
});

test("a 429 on a later filter change shows the busy page in the feed", async ({
  page,
}) => {
  await gotoFeed(page);
  await page.route("**/api/items**", tooMany);
  const chip = page.locator(".chips .chip:not(.active)").first();
  await chip.click();
  await expect(page.locator("#feed .error-state")).toBeVisible();
  await expect(page.locator(".error-heading")).toHaveText(MESSAGE);
});

test("an ordinary failure keeps the generic message", async ({ page }) => {
  await stubBackend(page);
  await page.route("**/api/items**", (route: Route) =>
    route.fulfill({ status: 500, body: "{}" }),
  );
  await page.goto("/index.html");
  await expect(page.locator(".error-heading")).toContainText(
    "having a problem right now",
  );
});
