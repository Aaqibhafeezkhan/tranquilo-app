// The detail panel fetches an item's curated text when it opens, so that
// text need not travel on every page row.

import { expect, test } from "@playwright/test";
import { gotoArtwork, ITEMS } from "./harness.mts";

interface FixtureItem {
  id: string;
  source?: string;
  caption_tea?: string;
}

const WITH_CAPTION = (ITEMS as FixtureItem[]).find((i) => i.caption_tea);

test("opening the detail panel requests the item's curated text", async ({
  page,
}) => {
  expect(WITH_CAPTION, "fixture needs a Tea caption").toBeTruthy();
  const item = WITH_CAPTION as FixtureItem & { caption_tea: string };
  const requested: string[] = [];
  page.on("request", (req) => {
    const url = new URL(req.url());
    if (url.searchParams.get("shape") === "detail") {
      requested.push(url.searchParams.get("key") ?? "");
    }
  });

  await gotoArtwork(page, item.source || "met", item.id);
  await page
    .locator(`#feed .slide[data-slug$="-${String(item.id)}"]`)
    .first()
    .locator(".art-title-btn")
    .click();
  await expect(page.locator("#detailModal")).toHaveClass(/open/);

  await expect
    .poll(() => requested)
    .toContain(`${item.source || "met"}:${item.id}`);
  await expect(page.locator("#detailModal .fact-box")).toContainText(
    item.caption_tea.slice(0, 20),
  );
});
