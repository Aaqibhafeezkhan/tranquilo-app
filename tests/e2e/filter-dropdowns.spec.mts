// The Palette filter is a compact trigger (a pie of the bucket colours)
// at the start of the category chip row, opening a listbox -- a native
// <select> can't render a coloured swatch inside its own options. Category
// stays a row of chips (tests/e2e/chips-reachable.spec.mts covers it).
import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { gotoFeed, ITEMS, stubBackend } from "./harness.mts";

const TRIGGER = "#paletteTrigger";
const MENU = "#paletteMenu";

// The default fixture carries no palette_buckets, so the Palette menu
// would have no options; these tests need at least one item with a bucket.
const RED_ITEM = {
  ...ITEMS[0],
  id: "filter-dropdown-e2e-1",
  palette_buckets: ["Red"],
};

async function gotoFeedWithPalette(page: Page) {
  await stubBackend(page, { items: [RED_ITEM, ...ITEMS.slice(1)] });
  await page.addInitScript(() => {
    if (typeof window.__tranquiloHeroSeed !== "number")
      window.__tranquiloHeroSeed = 1;
  });
  await page.goto("/index.html");
  await page.waitForFunction(() => (window.__tranquiloFeedRenders || 0) > 0);
}

test("the Palette trigger sits compactly beside the category chips", async ({
  page,
}) => {
  await gotoFeedWithPalette(page);
  const trigger = page.locator(TRIGGER);
  await expect(trigger).toBeVisible();
  await expect(trigger).not.toHaveClass(/active/);
  await expect(
    page.locator('#chips button.chip[data-category="All"]'),
  ).toBeVisible();

  const box = await trigger.boundingBox();
  expect(box!.width).toBeLessThan(110);
});

test("the Palette menu lists every bucket, each coloured", async ({ page }) => {
  await gotoFeedWithPalette(page);
  await page.locator(TRIGGER).click();

  const menu = page.locator(MENU);
  await expect(menu).toBeVisible();

  const swatchColors = await menu
    .locator('.filter-dropdown-option:not([data-value=""]) .palette-pie')
    .evaluateAll((els) =>
      els.map((el) => (el as HTMLElement).style.backgroundColor),
    );
  expect(swatchColors.length).toBeGreaterThan(0);
  expect(swatchColors.every((c) => c && c !== "transparent")).toBe(true);
});

test("selecting a Palette option closes the menu and applies the filter", async ({
  page,
}) => {
  await gotoFeedWithPalette(page);
  await page.locator(TRIGGER).click();
  const menu = page.locator(MENU);
  await expect(menu).toBeVisible();

  const option = menu
    .locator('.filter-dropdown-option:not([data-value=""])')
    .first();
  const label = await option.textContent();

  const before = await page.evaluate(() => window.__tranquiloFeedRenders || 0);
  await option.click();
  await page.waitForFunction(
    (n) => (window.__tranquiloFeedRenders || 0) > n,
    before,
  );

  await expect(menu).toBeHidden();
  const trigger = page.locator(TRIGGER);
  if (label) await expect(trigger).toContainText(label.trim());
  await expect(trigger).toHaveClass(/active/);
});

test("clicking outside closes an open Palette menu", async ({ page }) => {
  await gotoFeed(page);
  await page.locator(TRIGGER).click();
  await expect(page.locator(MENU)).toBeVisible();

  await page.mouse.click(10, 10);
  await expect(page.locator(MENU)).toBeHidden();
});

test("Escape closes an open Palette menu", async ({ page }) => {
  await gotoFeed(page);
  await page.locator(TRIGGER).click();
  await expect(page.locator(MENU)).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.locator(MENU)).toBeHidden();
});
