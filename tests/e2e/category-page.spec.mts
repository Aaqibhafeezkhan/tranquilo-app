// A cold load of /category/{slug} opens the feed scoped to that category.

import { expect, test } from "@playwright/test";
import { gotoCategory, ITEMS } from "./harness.mts";

test("/category/works-on-paper scopes the feed to that category", async ({
  page,
}) => {
  const requested: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("shape=manifest")) requested.push(req.url());
  });
  await gotoCategory(page, "works-on-paper");
  await expect(
    page.locator(".chips .chip.active:not(.chip-more)"),
  ).toContainText("Works on Paper");
  expect(
    requested.some((url) =>
      decodeURIComponent(url).includes("category=Works on Paper"),
    ),
  ).toBe(true);
  expect(
    ITEMS.some((i: { category: string }) => i.category === "Works on Paper"),
  ).toBe(true);
});

test("an unknown category slug falls back to the unfiltered feed", async ({
  page,
}) => {
  await gotoCategory(page, "nonsense");
  await expect(
    page.locator(".chips .chip.active:not(.chip-more)"),
  ).toContainText("All");
});
