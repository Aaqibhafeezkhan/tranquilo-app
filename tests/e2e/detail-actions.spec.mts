// The detail panel's metadata (material, origin, provenance, tags, licence)
// is information; "View on <institution>" and "Cite this work" are things
// to do. They read as two groups: the actions sit after a visible divider,
// together on one row where there's room, rather than as two more rows of
// the metadata list.

import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { gotoArtwork, ITEMS } from "./harness.mts";

const TEA = ITEMS.find((i: any) => i.caption_tea && i.title);
const NO_TEA = ITEMS.find((i: any) => !i.caption_tea && i.title && i.url);

async function openDetailFor(page: Page, item: any, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await gotoArtwork(page, item.source || "met", item.id);
  await page
    .locator(`#feed .slide[data-slug$="-${String(item.id)}"] .art-title-btn`)
    .first()
    .click();
  await expect(page.locator("#detailModal")).toHaveClass(/open/);
}

function layout(page: Page) {
  return page.evaluate(() => {
    // Opened from a feed slide, so the panel holds exactly one item.
    const panel = document.querySelector("#detailModal .detail-modal-inner")!;
    const actions = panel.querySelector(".detail-actions");
    const rows = [...panel.querySelectorAll(".d-body .meta-row")];
    const lastRow = rows[rows.length - 1]?.getBoundingClientRect();
    const box = actions?.getBoundingClientRect();
    const link = actions
      ?.querySelector("a.source-link")
      ?.getBoundingClientRect();
    const cite = actions?.querySelector(".btn-cite")?.getBoundingClientRect();
    const style = actions ? getComputedStyle(actions) : null;
    return {
      hasActions: !!actions,
      divider:
        !!style &&
        parseFloat(style.borderTopWidth) > 0 &&
        style.borderTopStyle !== "none",
      gapBelowMeta: lastRow && box ? box.top - lastRow.bottom : null,
      link: link ? { top: link.top, right: link.right } : null,
      cite: cite ? { top: cite.top, right: cite.right } : null,
      boxRight: box?.right ?? null,
    };
  });
}

test("the actions sit after a divider, apart from the metadata", async ({
  page,
}) => {
  await openDetailFor(page, TEA, 1280);
  const l = await layout(page);
  expect(l.hasActions).toBe(true);
  expect(l.divider).toBe(true);
  // Below the metadata, with breathing room rather than list spacing.
  expect(l.gapBelowMeta).not.toBeNull();
  expect(l.gapBelowMeta!).toBeGreaterThanOrEqual(16);
});

test("on a desktop, both actions share one row", async ({ page }) => {
  await openDetailFor(page, TEA, 1280);
  const l = await layout(page);
  expect(l.link && l.cite).toBeTruthy();
  expect(Math.abs(l.link!.top - l.cite!.top)).toBeLessThanOrEqual(2);
});

test("on a phone, the actions stay inside the panel", async ({ page }) => {
  await openDetailFor(page, TEA, 390);
  const l = await layout(page);
  expect(l.link!.right).toBeLessThanOrEqual(l.boxRight! + 0.5);
  expect(l.cite!.right).toBeLessThanOrEqual(l.boxRight! + 0.5);
});

test("an item without a Tea caption still gets the source action", async ({
  page,
}) => {
  test.skip(!NO_TEA, "fixture has no item without caption_tea");
  await openDetailFor(page, NO_TEA, 1280);
  const l = await layout(page);
  expect(l.hasActions).toBe(true);
  expect(l.link).not.toBeNull();
  expect(l.cite).toBeNull();
});
