// Sharing a Discover shelf: Discover's "See all" opens a shelf's own view,
// that view's share control copies /shelf/{id}, and a cold load of that
// URL opens the same view over the feed.

import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { gotoFeed, gotoShelf } from "./harness.mts";

declare global {
  interface Window {
    __copied?: string[];
  }
}

// Desktop Chrome reports (pointer: fine), so sharing takes the clipboard
// branch -- deterministic, and the branch that toasts.
async function captureClipboard(page: Page) {
  await page.evaluate(() => {
    window.__copied = [];
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: (t: string) => {
          window.__copied!.push(t);
          return Promise.resolve();
        },
      },
    });
  });
}

async function openDiscover(page: Page) {
  await page.locator(".topbar #discoverToggle").click();
  await page.waitForSelector("#shelvesMode.open .shelf");
}

function seeAllFor(page: Page, title: string) {
  return page
    .locator("#shelvesMode .shelf")
    .filter({ has: page.locator(".shelf-title", { hasText: title }) })
    .locator(".shelf-see-all");
}

test("Discover's See all opens the shelf's own view", async ({ page }) => {
  await gotoFeed(page);
  await openDiscover(page);
  await seeAllFor(page, "Main Character Energy").click();

  const view = page.locator("#shelfMode");
  await expect(view).toHaveClass(/open/);
  await expect(view).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator("#shelvesMode")).not.toHaveClass(/open/);
  await expect(view.locator(".shelf-mode-title")).toHaveText(
    "Main Character Energy",
  );
  await expect(view.locator(".shelf-mode-grid .shelf-mode-card")).toHaveCount(
    4,
  );
  await expect(view.locator(".shelf-mode-count")).toContainText("4");
});

test("the storylines shelf offers no See all", async ({ page }) => {
  await gotoFeed(page);
  await openDiscover(page);
  await expect(
    page.locator(
      '#shelvesMode .shelf[data-shelf-id="storylines"] .shelf-see-all',
    ),
  ).toHaveCount(0);
});

test("sharing copies the shelf's own URL", async ({ page }) => {
  await gotoFeed(page);
  await openDiscover(page);
  await seeAllFor(page, "Main Character Energy").click();
  await captureClipboard(page);

  await page.locator("#shelfMode .shelf-mode-share").click();
  await page.waitForFunction(
    () => window.__copied && window.__copied.length > 0,
  );
  const copied = await page.evaluate(() => window.__copied![0]);
  expect(new URL(copied).pathname).toBe("/shelf/painted-by-themselves");
  await expect(page.locator("#toast")).toContainText("Link copied");
});

test("closing a shelf opened from Discover returns to Discover", async ({
  page,
}) => {
  await gotoFeed(page);
  await openDiscover(page);
  await seeAllFor(page, "Main Character Energy").click();
  await page.locator("#shelfMode .shelf-mode-close").click();

  await expect(page.locator("#shelfMode")).not.toHaveClass(/open/);
  await expect(page.locator("#shelvesMode")).toHaveClass(/open/);
});

test("a shared hero-shelf link opens the shelf over the feed", async ({
  page,
}) => {
  const view = await gotoShelf(page, "painted-by-themselves");
  await expect(view.locator(".shelf-mode-title")).toHaveText(
    "Main Character Energy",
  );
  await expect(view.locator(".shelf-mode-card")).toHaveCount(4);

  // Back leaves a real feed behind, not a blank page.
  await page.goBack();
  await expect(view).not.toHaveClass(/open/);
  await expect(page.locator("#feed .slide").first()).toBeVisible();
});

test("a shared rule-shelf link shows its works even below Discover's minimum", async ({
  page,
}) => {
  const view = await gotoShelf(page, "old-world-portraiture");
  await expect(view.locator(".shelf-mode-title")).toHaveText(
    "Old World Portraiture",
  );
  await expect(view.locator(".shelf-mode-card")).toHaveCount(8);
  await expect(view.locator(".shelf-mode-count")).toContainText("8");
});

test("a work opens in the detail panel and closing it returns to the shelf", async ({
  page,
}) => {
  const view = await gotoShelf(page, "painted-by-themselves");
  await view.locator(".shelf-mode-card").nth(1).click();

  const detail = page.locator("#detailModal");
  await expect(detail).toHaveClass(/open/);
  await expect(view).not.toHaveClass(/open/);

  await page.goBack();
  await expect(detail).not.toHaveClass(/open/);
  await expect(view).toHaveClass(/open/);
});

test("an unknown shelf link leaves the feed usable", async ({ page }) => {
  await gotoFeed(page);
  await page.goto("/shelf/no-such-shelf");
  await page.waitForFunction(
    () => document.querySelectorAll("#feed .slide").length > 1,
  );
  await expect(page.locator("#shelfMode")).not.toHaveClass(/open/);
});
