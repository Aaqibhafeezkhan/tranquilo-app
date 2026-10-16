// The "scroll to explore" cue invites the first scroll, so it must only
// appear when there is something below to scroll to. It used to show
// whenever the visitor hadn't scrolled yet -- including on a search with a
// single result, where the one slide is all there is.

import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { gotoFeed } from "./harness.mts";

const hint = (page: Page) => page.locator("#scrollHint");

async function search(page: Page, term: string) {
  await page.locator("#searchToggle").click();
  await page.locator("#searchInput").fill(term);
  await page.locator("#searchSubmit").click();
  await expect(page.locator("#searchResultsLine")).not.toBeEmpty();
  await page.evaluate(() => new Promise(requestAnimationFrame));
}

test("shows on the full feed, where there is more to scroll to", async ({
  page,
}) => {
  await gotoFeed(page);
  await expect(hint(page)).not.toHaveClass(/hidden/);
});

test("hides on a single search result, then returns with the full feed", async ({
  page,
}) => {
  await gotoFeed(page);
  // A name that appears on exactly one fixture item.
  await search(page, "guevara");
  await expect(page.locator("#feed .slide")).toHaveCount(1);
  await expect(hint(page)).toHaveClass(/hidden/);

  // "Show all" brings the long feed back, and with it something to scroll
  // to. (A search with results closes the panel itself.)
  await page.locator("#filterBannerClear").click();
  await expect(page.locator("#feed .slide").nth(2)).toBeAttached();
  await expect(hint(page)).not.toHaveClass(/hidden/);
});

test("stays gone once the visitor has scrolled", async ({ page }) => {
  await gotoFeed(page);
  await page.locator("#feed").evaluate((el) => {
    el.scrollTop = el.clientHeight;
  });
  await expect(hint(page)).toHaveClass(/hidden/);
  await page.locator("#feed").evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.evaluate(() => new Promise(requestAnimationFrame));
  await expect(hint(page)).toHaveClass(/hidden/);
});
