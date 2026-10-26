// Sharing a Discover shelf: each Discover row carries its work count and a
// share control copying /shelf/{id}, and a cold load of that URL opens the
// shelf's own view over the feed.

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

function discoverRow(page: Page, title: string) {
  return page
    .locator("#shelvesMode .shelf")
    .filter({ has: page.locator(".shelf-title", { hasText: title }) });
}

test("each Discover shelf shows its work count and a share control", async ({
  page,
}) => {
  await gotoFeed(page);
  await openDiscover(page);

  const mainCharacter = discoverRow(page, "Main Character Energy");
  await expect(mainCharacter.locator(".shelf-count")).toHaveText("4 works");
  await expect(mainCharacter.locator(".shelf-share")).toHaveCount(1);
  await expect(
    discoverRow(page, "Birdwatching").locator(".shelf-count"),
  ).toHaveText("1 work");
});

test("the storylines shelf offers no share control", async ({ page }) => {
  await gotoFeed(page);
  await openDiscover(page);
  await expect(
    page.locator(
      '#shelvesMode .shelf[data-shelf-id="storylines"] .shelf-share',
    ),
  ).toHaveCount(0);
});

test("sharing from Discover copies the shelf's own URL and stays on Discover", async ({
  page,
}) => {
  await gotoFeed(page);
  await openDiscover(page);
  await captureClipboard(page);

  await discoverRow(page, "Main Character Energy")
    .locator(".shelf-share")
    .click();
  await page.waitForFunction(
    () => window.__copied && window.__copied.length > 0,
  );
  const copied = await page.evaluate(() => window.__copied![0]);
  expect(new URL(copied).pathname).toBe("/shelf/main-character-energy");
  await expect(page.locator("#toast")).toContainText("Link copied");
  await expect(page.locator("#shelvesMode")).toHaveClass(/open/);
  await expect(page.locator("#shelfMode")).not.toHaveClass(/open/);
});

test("the shelf view's own share control copies the same URL", async ({
  page,
}) => {
  const view = await gotoShelf(page, "main-character-energy");
  await captureClipboard(page);
  await view.locator(".shelf-mode-share").click();
  await page.waitForFunction(
    () => window.__copied && window.__copied.length > 0,
  );
  const copied = await page.evaluate(() => window.__copied![0]);
  expect(new URL(copied).pathname).toBe("/shelf/main-character-energy");
});

test("a shared hero-shelf link opens the shelf over the feed", async ({
  page,
}) => {
  const view = await gotoShelf(page, "main-character-energy");
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
  const view = await gotoShelf(page, "main-character-energy");
  await view.locator(".shelf-mode-card").nth(1).click();

  const detail = page.locator("#detailModal");
  await expect(detail).toHaveClass(/open/);
  await expect(view).not.toHaveClass(/open/);

  await page.goBack();
  await expect(detail).not.toHaveClass(/open/);
  await expect(view).toHaveClass(/open/);
});

test("a link using the shelf's old id still opens it", async ({ page }) => {
  const view = await gotoShelf(page, "painted-by-themselves");
  await expect(view.locator(".shelf-mode-title")).toHaveText(
    "Main Character Energy",
  );
});

test("an unknown shelf link leaves the feed usable", async ({ page }) => {
  await gotoFeed(page);
  await page.goto("/shelf/no-such-shelf");
  await page.waitForFunction(
    () => document.querySelectorAll("#feed .slide").length > 1,
  );
  await expect(page.locator("#shelfMode")).not.toHaveClass(/open/);
});
