// A cold load of /discover opens Discover over the feed.

import { expect, test } from "@playwright/test";
import { gotoDiscover } from "./harness.mts";

test("/discover opens Discover over the feed", async ({ page }) => {
  const discover = await gotoDiscover(page);
  await expect(discover).toHaveClass(/open/);
  await expect(page.locator("#feed .slide").first()).toBeVisible();
});

test("closing Discover returns to a real feed at the root URL", async ({
  page,
}) => {
  const discover = await gotoDiscover(page);
  await page.goBack();
  await expect(discover).not.toHaveClass(/open/);
  await expect(page.locator("#feed .slide").first()).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/");
});

test("the close button leaves the root URL, not /discover", async ({
  page,
}) => {
  const discover = await gotoDiscover(page);
  await page.locator("#shelvesClose").click();
  await expect(discover).not.toHaveClass(/open/);
  expect(new URL(page.url()).pathname).toBe("/");
});
