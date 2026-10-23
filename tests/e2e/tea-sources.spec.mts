// Grounding sources for a Tea Voice caption. The ToS says these narratives
// are editorially reviewed; these links make that checkable by a reader
// rather than merely asserted.

import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { gotoArtwork, ITEMS } from "./harness.mts";

const WITH_SOURCES = ITEMS.filter(
  (i: any) =>
    i.caption_tea &&
    Array.isArray(i.tea_voice_sources) &&
    i.tea_voice_sources.length,
);

// Reach the item by deep link rather than scanning the feed for a matching
// data-slug, which used to work when the feed built the whole catalogue up
// front. It's paged now, so an arbitrary item is usually not among the
// loaded slides; gotoArtwork()'s /v/{slug} starts the feed at the target instead.
async function openDetailFor(page: Page, item: any) {
  await gotoArtwork(page, item.source || "met", item.id);
  const slide = page
    .locator(`#feed .slide[data-slug$="-${String(item.id)}"]`)
    .first();
  await slide.locator(".art-title-btn").click();
  await expect(page.locator("#detailModal")).toHaveClass(/open/);
}

test("a Tea caption shows one source icon per grounded claim", async ({
  page,
}) => {
  expect(
    WITH_SOURCES.length,
    "fixture needs an item with tea_voice_sources",
  ).toBeGreaterThan(0);
  const item = WITH_SOURCES[0];
  await openDetailFor(page, item);

  const icons = page.locator("#detailModal .fact-box .tea-source");
  await expect(icons).toHaveCount(item.tea_voice_sources.length);
});

test("each icon links somewhere real, in a new tab", async ({ page }) => {
  const item = WITH_SOURCES[0];
  await openDetailFor(page, item);

  const links = await page
    .locator("#detailModal .fact-box .tea-source")
    .evaluateAll((els) =>
      els.map((e) => ({
        href: e.getAttribute("href"),
        target: e.getAttribute("target"),
        rel: e.getAttribute("rel"),
        title: e.getAttribute("title"),
      })),
    );

  for (const l of links) {
    expect(l.href).toMatch(/^https?:\/\//);
    expect(l.target).toBe("_blank");
    expect(l.rel).toContain("noopener");
    // The tooltip must identify which claim it backs, not just say "source".
    expect(l.title!.length).toBeGreaterThan(0);
  }
});

test("a Basic-tier item shows no source row at all", async ({ page }) => {
  // basic_tier means grounding completed and found nothing worth publishing;
  // an empty "Sources" header would advertise an absence.
  const basic = ITEMS.find((i: any) => !i.caption_tea && i.caption_basic);
  test.skip(!basic, "fixture has no basic-tier item");

  await openDetailFor(page, basic);
  await expect(page.locator("#detailModal .fact-box .tea-sources")).toHaveCount(
    0,
  );
});

test("an item with a caption but no claims shows no source row", async ({
  page,
}) => {
  const noSources = ITEMS.find(
    (i: any) => i.caption_tea && !i.tea_voice_sources?.length,
  );
  test.skip(!noSources, "fixture has no captioned item lacking sources");

  await openDetailFor(page, noSources);
  await expect(page.locator("#detailModal .fact-box .tea-sources")).toHaveCount(
    0,
  );
});

const byId = (id: string) => ITEMS.find((i: any) => String(i.id) === id);

test("a claim drawn from a book shows a book link beside its source", async ({
  page,
}) => {
  const item = byId("23367");
  const book = item.tea_voice_sources[0].publication;
  await openDetailFor(page, item);

  await expect(page.locator("#detailModal .fact-box .tea-source")).toHaveCount(
    1,
  );
  const bookLink = page.locator("#detailModal .fact-box .tea-book-source");
  await expect(bookLink).toHaveCount(1);
  await expect(bookLink).toHaveAttribute("href", book.url);
  await expect(bookLink).toHaveAttribute("target", "_blank");
  await expect(bookLink).toHaveAttribute("title", new RegExp(book.title));
});

test("a claim whose source is the book itself shows only the book link", async ({
  page,
}) => {
  const item = byId("23332");
  await openDetailFor(page, item);

  await expect(page.locator("#detailModal .fact-box .tea-source")).toHaveCount(
    2,
  );
  await expect(
    page.locator("#detailModal .fact-box .tea-book-source"),
  ).toHaveCount(1);
});
