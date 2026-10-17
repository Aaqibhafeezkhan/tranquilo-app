// "Cite this work" in the detail panel: offered only where there's a Tea
// caption, starts collapsed with a visible expand indicator, shows MLA, APA
// and ABNT citations, and copies the one asked for.
// The citation text itself is unit-tested (tests/citation.test.ts); this
// covers the visitor-facing behaviour.

import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { gotoArtwork, ITEMS } from "./harness.mts";

const TEA = ITEMS.find((i: any) => i.caption_tea && i.title);
const NO_TEA = ITEMS.find((i: any) => !i.caption_tea && i.title);

async function openDetailFor(page: Page, item: any) {
  await gotoArtwork(page, item.source || "met", item.id);
  const slide = page
    .locator(`#feed .slide[data-slug$="-${String(item.id)}"]`)
    .first();
  await slide.locator(".art-title-btn").click();
  await expect(page.locator("#detailModal")).toHaveClass(/open/);
}

test("the citations start collapsed, with an indicator that they expand", async ({
  page,
}) => {
  expect(TEA, "fixture needs an item with caption_tea").toBeTruthy();
  await openDetailFor(page, TEA);

  const btn = page.locator("#detailModal .btn-cite");
  const panel = page.locator("#detailModal .cite-panel");
  // The indicator is drawn by CSS, so read what's actually rendered.
  const indicator = () =>
    btn.evaluate((el) => getComputedStyle(el, "::after").content);

  await expect(panel).toBeHidden();
  await expect(btn).toHaveAttribute("aria-expanded", "false");
  const collapsed = await indicator();
  expect(collapsed).not.toMatch(/^(none|normal|"")$/);

  await btn.click();
  await expect(panel).toBeVisible();
  await expect(btn).toHaveAttribute("aria-expanded", "true");
  expect(await indicator()).not.toBe(collapsed);

  await btn.click();
  await expect(panel).toBeHidden();
  await expect(btn).toHaveAttribute("aria-expanded", "false");
});

test("an item with a Tea caption offers MLA, APA and ABNT", async ({
  page,
}) => {
  await openDetailFor(page, TEA);
  const panel = page.locator("#detailModal .cite-panel");
  await page.locator("#detailModal .btn-cite").click();

  for (const style of ["mla", "apa", "abnt"]) {
    const text = panel.locator(`[data-style="${style}"] .cite-text`);
    await expect(text).toContainText(TEA.title);
    await expect(text).toContainText(TEA.url.replace(/^https?:\/\//, ""));
  }
});

test("Copy puts that style's citation on the clipboard", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await openDetailFor(page, TEA);
  await page.locator("#detailModal .btn-cite").click();

  const apa = page.locator('#detailModal .cite-panel [data-style="apa"]');
  await apa.locator(".cite-copy").click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe((await apa.locator(".cite-text").textContent())?.trim());
  // Visible confirmation, so the click isn't indistinguishable from a no-op.
  await expect(apa.locator(".cite-copy")).not.toHaveText(
    await page
      .locator('#detailModal .cite-panel [data-style="mla"] .cite-copy')
      .innerText(),
  );
});

test("an item without a Tea caption has no Cite button", async ({ page }) => {
  test.skip(!NO_TEA, "fixture has no item without caption_tea");
  await openDetailFor(page, NO_TEA);
  await expect(page.locator("#detailModal .btn-cite")).toHaveCount(0);
});
