// The search panel's institution dropdown: scopes the feed and the search
// to one museum, or shows that museum's works when the query is blank.
import { expect, test } from "@playwright/test";
import { actAndSettle, gotoFeed } from "./harness.mts";

const SELECT = "#searchSourceSelect";

async function openSearch(page: import("@playwright/test").Page) {
  await page.locator("#searchToggle").click();
  await expect(page.locator("#searchBar")).toBeVisible();
}

test("the dropdown lists direct institutions only, defaulting to all sources", async ({
  page,
}) => {
  await gotoFeed(page);
  await openSearch(page);
  const select = page.locator(SELECT);
  await expect(select).toBeVisible();
  await expect(select).toHaveValue("");
  const values = await select
    .locator("option")
    .evaluateAll((els) => els.map((el) => (el as HTMLOptionElement).value));
  expect(values).toContain("cleveland");
  expect(values).not.toContain("commons");
  expect(values).not.toContain("europeana");
});

test("picking an institution with a blank query shows only its works", async ({
  page,
}) => {
  await gotoFeed(page);
  const feedUrls: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("shape=manifest")) feedUrls.push(req.url());
  });
  await openSearch(page);
  await actAndSettle(page, async () => {
    await page.locator(SELECT).selectOption("cleveland");
  });
  await expect(page.locator("#filterBanner")).toBeVisible();
  await expect(page.locator("#filterBannerLabel")).toContainText(
    "Cleveland Museum of Art",
  );
  expect(feedUrls.length).toBeGreaterThan(0);
  expect(feedUrls.every((url) => url.includes("source=cleveland"))).toBe(true);
  expect(await page.locator("#feed .slide").count()).toBeGreaterThan(0);
});

test("a search stays within the picked institution", async ({ page }) => {
  await gotoFeed(page);
  await openSearch(page);
  await page.locator(SELECT).selectOption("cleveland");
  await expect(page.locator("#filterBanner")).toBeVisible();
  await openSearch(page);
  await expect(page.locator(SELECT)).toHaveValue("cleveland");
  await page.locator("#searchInput").fill("a");
  await actAndSettle(page, () => page.locator("#searchSubmit").click());
  await expect(page.locator("#filterBannerLabel")).toContainText(
    "Cleveland Museum of Art",
  );
});

test("clearing the banner returns to all sources", async ({ page }) => {
  await gotoFeed(page);
  await openSearch(page);
  await page.locator(SELECT).selectOption("cleveland");
  await expect(page.locator("#filterBanner")).toBeVisible();
  await page.locator("#filterBannerClear").click();
  await openSearch(page);
  await expect(page.locator(SELECT)).toHaveValue("");
});
