// A storyline tile in Discover enters that storyline, and closing it
// returns to Discover.

import { expect, test } from "@playwright/test";
import { gotoDiscover, ITEMS, STORYLINES } from "./harness.mts";

const SHARED_COVER = "437536";

function tileForCover(page: import("@playwright/test").Page, coverId: string) {
  const cover = ITEMS.find((i: any) => String(i.id) === coverId);
  return page
    .locator('#shelvesMode .shelf[data-shelf-id="storylines"] .shelf-item')
    .filter({ hasText: cover.title })
    .first();
}

test("a storyline tile opens the storyline, not the cover artwork", async ({
  page,
}) => {
  await gotoDiscover(page);
  await tileForCover(page, SHARED_COVER).click();
  await expect(page.locator("#storylineMode")).toHaveClass(/open/);
  await expect(page.locator("#detailModal")).not.toHaveClass(/open/);
});

test("a tile whose cover is also a member of another storyline opens its own", async ({
  page,
}) => {
  await gotoDiscover(page);
  await tileForCover(page, SHARED_COVER).click();
  const own = STORYLINES.find(
    (s: any) => String(s.cover_item_id) === SHARED_COVER,
  );
  await expect(page.locator("#storylineHeaderTitle")).toHaveText(own.title);
});

test("closing a storyline opened from Discover returns to Discover", async ({
  page,
}) => {
  await gotoDiscover(page);
  await tileForCover(page, SHARED_COVER).click();
  await page.waitForSelector("#storylineMode.open .storyline-chapter-page");
  await page.locator("#storylineClose").click();
  await expect(page.locator("#storylineMode")).not.toHaveClass(/open/);
  await expect(page.locator("#shelvesMode")).toHaveClass(/open/);
  await expect(page.locator("#detailModal")).not.toHaveClass(/open/);
  expect(new URL(page.url()).pathname).toBe("/discover");
});

test("back from a storyline opened from Discover returns to Discover", async ({
  page,
}) => {
  await gotoDiscover(page);
  await tileForCover(page, SHARED_COVER).click();
  await page.waitForSelector("#storylineMode.open .storyline-chapter-page");
  await page.goBack();
  await expect(page.locator("#storylineMode")).not.toHaveClass(/open/);
  await expect(page.locator("#shelvesMode")).toHaveClass(/open/);
});
