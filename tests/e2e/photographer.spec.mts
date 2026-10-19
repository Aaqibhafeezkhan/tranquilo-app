// The photographer of a reproduction is credited in its own row, apart
// from the artist: someone who photographed a painting deserves credit for
// the image without being named as the maker of the work. Same pattern as
// photograph-date.spec.mts -- the row only exists in the detail modal's
// template string, so a real browser is the only way to check it.

import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { ITEMS, stubBackend } from "./harness.mts";

const BASE = ITEMS.find(
  (i: any) => i.source === "met" && i.artist_nationality && i.artist_lifespan,
);

function testItem(id: string, overrides: Record<string, unknown>) {
  return { ...BASE, id, ...overrides };
}

async function openDetailFor(page: Page, item: any) {
  await stubBackend(page, { items: [item, ...ITEMS.slice(0, 5)] });
  await page.goto(`/v/${encodeURIComponent(`${item.source}-${item.id}`)}`);
  await page.waitForFunction(() => (window.__tranquiloFeedRenders || 0) > 0);
  const slide = page
    .locator(`#feed .slide[data-slug$="-${String(item.id)}"]`)
    .first();
  await slide.locator(".art-title-btn").click();
  await expect(page.locator("#detailModal")).toHaveClass(/open/);
}

const metaRow = (page: Page, label: string) =>
  page.locator("#detailModal .meta-row", { hasText: label });

test("shows Photographer when a photographer is known", async ({ page }) => {
  const item = testItem("test-photographer-present", {
    artist: "Jean-Baptiste Debret",
    photographer: "Wilfredor",
  });
  await openDetailFor(page, item);
  await expect(metaRow(page, "Photographer")).toContainText("Wilfredor");
});

test("omits the row entirely when there is no photographer", async ({
  page,
}) => {
  for (const photographer of [null, ""]) {
    const item = testItem(`test-photographer-absent-${photographer}`, {
      photographer,
    });
    await openDetailFor(page, item);
    await expect(metaRow(page, "Photographer")).toHaveCount(0);
  }
});
