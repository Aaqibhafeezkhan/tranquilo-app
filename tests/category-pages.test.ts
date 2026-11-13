import { describe, expect, it } from "vitest";
import {
  CATEGORY_COVERS,
  CATEGORY_PAGES,
  categoryFromPageSlug,
  categoryPageSlug,
} from "../lib/category-pages.ts";
import vocabulary from "../shared/vocabulary.json";

describe("category landing pages", () => {
  it("has a page for every vocabulary category except Photography", () => {
    const expected = vocabulary.categories.filter((c) => c !== "Photography");
    expect(CATEGORY_PAGES.map((page) => page.name).sort()).toEqual(
      [...expected].sort(),
    );
  });

  it("never offers a page for Photography", () => {
    expect(categoryFromPageSlug("photography")).toBeNull();
    expect(categoryPageSlug("Photography")).toBeNull();
  });

  it("round-trips every page slug", () => {
    for (const page of CATEGORY_PAGES) {
      expect(categoryFromPageSlug(page.slug)).toBe(page.name);
      expect(categoryPageSlug(page.name)).toBe(page.slug);
    }
  });

  it("produces URL-safe lowercase slugs", () => {
    expect(categoryPageSlug("Paintings & Portraits")).toBe(
      "paintings-and-portraits",
    );
    for (const page of CATEGORY_PAGES) {
      expect(page.slug).toMatch(/^[a-z]+(-[a-z]+)*$/);
    }
  });

  it("rejects unknown and malformed slugs", () => {
    expect(categoryFromPageSlug("nonsense")).toBeNull();
    expect(categoryFromPageSlug("")).toBeNull();
    expect(categoryFromPageSlug("Paintings-And-Portraits")).toBeNull();
  });

  it("has a cover work for every page", () => {
    for (const page of CATEGORY_PAGES) {
      const cover = CATEGORY_COVERS[page.name];
      expect(cover?.source).toBeTruthy();
      expect(cover?.nativeId).toBeTruthy();
    }
  });
});
