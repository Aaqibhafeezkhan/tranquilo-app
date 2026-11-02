import type { Route } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { stubBackend } from "./harness.mts";

const ITEMS_DELAY_MS = 1200;

test.beforeEach(async ({ page }) => {
  await stubBackend(page);
  await page.addInitScript(() => {
    (window as any).__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any[]) {
        if (!entry.hadRecentInput) (window as any).__cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.route("**/api/items**", async (route: Route) => {
    await new Promise((resolve) => setTimeout(resolve, ITEMS_DELAY_MS));
    await route.fallback();
  });
});

test("the intro slide is on screen before the first page of items arrives", async ({
  page,
}) => {
  await page.goto("/index.html");
  await page.waitForSelector("#feed .slide.intro");
  const settled = await page.evaluate(
    () => (window.__tranquiloFeedRenders || 0) > 0,
  );
  expect(settled).toBe(false);
  const top = await page.evaluate(() => {
    const intro = document.querySelector<HTMLElement>("#feed .slide.intro")!;
    const feed = document.querySelector<HTMLElement>("#feed")!;
    return intro.getBoundingClientRect().top - feed.getBoundingClientRect().top;
  });
  expect(top).toBe(0);
});

test("loading the feed causes no meaningful layout shift", async ({ page }) => {
  await page.goto("/index.html");
  await page.waitForFunction(() => (window.__tranquiloFeedRenders || 0) > 0);
  await page.waitForTimeout(500);
  const cls = await page.evaluate(() => (window as any).__cls as number);
  expect(cls).toBeLessThan(0.1);
});
