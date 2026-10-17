// The artist's name in a feed caption opens "More by <artist>" (and with
// it the artist card), the same as the detail panel's artist link -- one
// tap from the scroll instead of two. Placeholder attributions ("Unknown",
// "Anonymous") stay plain text: there's no one to show more of.

import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { isRealArtist } from "../../src/logic/logic.ts";
import { gotoArtwork, ITEMS } from "./harness.mts";

const counts = new Map<string, number>();
for (const i of ITEMS as any[]) {
  if (isRealArtist(i.artist))
    counts.set(i.artist, (counts.get(i.artist) ?? 0) + 1);
}
// An artist with several works, so the filtered feed has more than one slide.
const REAL = (ITEMS as any[]).find((i) => (counts.get(i.artist) ?? 0) >= 3);
const PLACEHOLDER = (ITEMS as any[]).find(
  (i) => i.artist && !isRealArtist(i.artist),
);

function slide(page: Page, item: any) {
  return page.locator(`#feed .slide[data-slug$="-${String(item.id)}"]`).first();
}

async function feedArtists(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll("#feed .slide .art-meta .artist")].map((el) =>
      (el.textContent || "").trim(),
    ),
  );
}

test("tapping a real artist's name shows more by that artist", async ({
  page,
}) => {
  expect(REAL, "fixture needs an artist with 3+ works").toBeTruthy();
  await gotoArtwork(page, REAL.source || "met", REAL.id);

  const name = slide(page, REAL).locator(".art-meta button.artist");
  await expect(name).toHaveText(REAL.artist);
  await name.click();

  await expect(page.locator("#filterBanner")).toBeVisible();
  await expect(page.locator("#filterBanner")).toContainText(REAL.artist);
  await expect
    .poll(async () => {
      const a = await feedArtists(page);
      return a.length > 0 && a.every((x) => x === REAL.artist);
    })
    .toBe(true);
});

test("a placeholder attribution is plain text, not a link", async ({
  page,
}) => {
  test.skip(!PLACEHOLDER, "fixture has no placeholder-artist item");
  await gotoArtwork(page, PLACEHOLDER.source || "met", PLACEHOLDER.id);
  const meta = slide(page, PLACEHOLDER).locator(".art-meta");
  await expect(meta).toContainText(PLACEHOLDER.artist);
  await expect(meta.locator("button")).toHaveCount(0);
});

test("tapping the name again in that artist's view doesn't jump back", async ({
  page,
}) => {
  await gotoArtwork(page, REAL.source || "met", REAL.id);
  await slide(page, REAL).locator(".art-meta button.artist").click();
  await expect(page.locator("#filterBanner")).toBeVisible();

  // Move one slide down, then tap that slide's (same) artist name.
  const feed = page.locator("#feed");
  await feed.evaluate((el) => el.scrollBy(0, el.clientHeight));
  await page.waitForTimeout(400);
  const before = await feed.evaluate((el) => el.scrollTop);
  expect(before).toBeGreaterThan(0);
  // Non-artwork slides exist in some modes, so pick by content, not index.
  const second = page
    .locator("#feed .slide")
    .filter({ has: page.locator(".art-meta button.artist") })
    .nth(1);
  await second.locator(".art-meta button.artist").click();
  await page.waitForTimeout(400);
  expect(await feed.evaluate((el) => el.scrollTop)).toBe(before);
});

test("the name works from the keyboard", async ({ page }) => {
  await gotoArtwork(page, REAL.source || "met", REAL.id);
  const name = slide(page, REAL).locator(".art-meta button.artist");
  await name.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#filterBanner")).toContainText(REAL.artist);
});
