// The detail panel shows one colored dot per palette bucket the work falls
// into. The buckets arrive with the curated-text fetch, never on page rows.
import { expect, test } from "@playwright/test";
import { ITEMS, stubBackend } from "./harness.mts";

const TARGET = {
  ...ITEMS[0],
  palette_buckets: ["Teal", "Blue"],
};
const SLUG = `${TARGET.source || "met"}-${TARGET.id}`;

async function openTarget(page: import("@playwright/test").Page) {
  await stubBackend(page, { items: [TARGET, ...ITEMS.slice(1)] });
  await page.goto(`/v/${encodeURIComponent(SLUG)}`);
  await page.waitForFunction(() => (window.__tranquiloFeedRenders || 0) > 0);
  await expect(page.locator("#detailModal")).toHaveClass(/open/);
}

test("the detail panel shows a dot for each of the work's palette buckets", async ({
  page,
}) => {
  await openTarget(page);
  const dots = page.locator("#detailModal .palette-dot");
  await expect(dots).toHaveCount(2);
  await expect(dots.first()).toHaveAttribute("data-bucket", "Teal");
  await expect(dots.nth(1)).toHaveAttribute("data-bucket", "Blue");
  const colors = await dots.evaluateAll((els) =>
    els.map((el) => (el as HTMLElement).style.backgroundColor),
  );
  expect(colors.every((c) => c && c !== "transparent")).toBe(true);
});

test("tapping a dot closes the panel and filters the feed to that bucket", async ({
  page,
}) => {
  await openTarget(page);
  await page.locator('#detailModal .palette-dot[data-bucket="Teal"]').click();

  await expect(page.locator("#detailModal")).not.toHaveClass(/open/);
  await expect(page.locator("#paletteTrigger")).toHaveClass(/active/);
  await expect(page.locator("#paletteTrigger")).toContainText("Teal");
});

test("after tapping a dot the feed starts on an artwork, not the intro", async ({
  page,
}) => {
  await openTarget(page);
  await page.locator('#detailModal .palette-dot[data-bucket="Teal"]').click();

  await expect(page.locator("#paletteTrigger")).toContainText("Teal");
  await expect
    .poll(() =>
      page.evaluate(() => {
        const feed = document.querySelector("#feed") as HTMLElement;
        const first = feed.children[1] as HTMLElement;
        return Math.abs(feed.scrollTop - first.offsetTop) < 2;
      }),
    )
    .toBe(true);
});

test("page rows never carry the buckets", async ({ page }) => {
  await stubBackend(page, { items: [TARGET, ...ITEMS.slice(1)] });
  const rowBodies: string[] = [];
  page.on("response", async (res) => {
    const url = new URL(res.url());
    if (!url.pathname.endsWith("/api/items")) return;
    const shape = url.searchParams.get("shape");
    if (shape && shape !== "manifest") return;
    rowBodies.push(await res.text().catch(() => ""));
  });
  await page.goto("/index.html");
  await page.waitForFunction(() => (window.__tranquiloFeedRenders || 0) > 0);
  await expect
    .poll(() => rowBodies.some((b) => b.includes('"items"')))
    .toBe(true);
  expect(rowBodies.every((b) => !b.includes("palette_buckets"))).toBe(true);
});
