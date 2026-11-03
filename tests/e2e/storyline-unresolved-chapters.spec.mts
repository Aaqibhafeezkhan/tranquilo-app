// A chapter the catalogue no longer serves must not hang the storyline panel.

import { expect, test } from "@playwright/test";
import { gotoStoryline, ITEMS, STORYLINES } from "./harness.mts";

const have = new Set(ITEMS.map((i: { id: unknown }) => String(i.id)));

function resolvable(storyline: { items: { id: unknown }[] }) {
  return storyline.items.filter((c) => have.has(String(c.id))).length;
}

const partial = STORYLINES.find(
  (s: { items: { id: unknown }[] }) =>
    resolvable(s) > 0 && resolvable(s) < s.items.length,
);
const empty = STORYLINES.find(
  (s: { items: { id: unknown }[] }) => resolvable(s) === 0,
);

test("a storyline with some unavailable chapters opens with the rest", async ({
  page,
}) => {
  const view = await gotoStoryline(page, partial.id);
  const chapters = view.locator(".storyline-chapter-page");
  await expect(chapters).toHaveCount(resolvable(partial));
  await expect(
    view.locator(".storyline-chapter-page img").first(),
  ).toBeVisible();
});

test("a storyline with no available chapters closes instead of loading forever", async ({
  page,
}) => {
  await gotoStoryline(page, empty.id, { expectOpen: false });
  await expect(page.locator("#storylineMode")).not.toHaveClass(/open/);
  await expect(page.locator("#feed .slide").first()).toBeVisible();
});
