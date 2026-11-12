// Active filters are mirrored into the address bar so a copied URL
// reopens the same results.
import { expect, test } from "@playwright/test";
import { actAndSettle, gotoFeed, ITEMS } from "./harness.mts";

const term = () =>
  ITEMS.find((i: { artist?: string }) => i.artist && i.artist.length > 4)
    .artist.split(" ")
    .pop();

test("a search puts itself in the URL and clearing it takes it out", async ({
  page,
}) => {
  await gotoFeed(page);
  await page.locator("#searchToggle").click();
  await page.locator("#searchInput").fill(term());
  await actAndSettle(page, () => page.locator("#searchSubmit").click());
  await expect(page).toHaveURL(/[?&]q=/, { timeout: 15000 });
  await page.locator("#filterBannerClear").click();
  await expect(page).not.toHaveURL(/[?&]q=/, { timeout: 15000 });
});

test("opening a shared search URL restores the results and banner", async ({
  page,
}) => {
  await gotoFeed(page, `?q=${encodeURIComponent(term())}`);
  await expect(page.locator("#filterBanner")).toBeVisible();
  await expect(page.locator("#filterBannerLabel")).toContainText(term());
  expect(await page.locator("#feed .slide").count()).toBeGreaterThan(0);
});

test("opening a shared museum URL scopes the feed to that museum", async ({
  page,
}) => {
  const feedUrls: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("shape=manifest")) feedUrls.push(req.url());
  });
  await gotoFeed(page, "?source=cleveland");
  await expect(page.locator("#filterBannerLabel")).toContainText(
    "Cleveland Museum of Art",
  );
  expect(feedUrls.length).toBeGreaterThan(0);
  expect(feedUrls.every((url) => url.includes("source=cleveland"))).toBe(true);
});

test("unknown filter values are ignored", async ({ page }) => {
  await gotoFeed(page, "?category=Nope&source=nope&palette=Mauve");
  await expect(page.locator("#filterBanner")).toBeHidden();
  expect(await page.locator("#feed .slide").count()).toBeGreaterThan(0);
});

test("markup in the URL is shown as text, never executed", async ({ page }) => {
  const payload = `<img src=x onerror="window.__xss=1">`;
  for (const key of ["q", "artist"]) {
    await gotoFeed(page, `?${key}=${encodeURIComponent(payload)}`);
    await page.waitForTimeout(1500);
    expect(
      await page.evaluate(() => (window as { __xss?: number }).__xss),
    ).toBeUndefined();
    expect(await page.locator("img[src='x']").count()).toBe(0);
    await expect(page.locator("body")).toContainText("onerror");
  }
});
