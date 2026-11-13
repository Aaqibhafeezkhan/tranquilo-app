import type { Category } from "../src/types/Item.ts";
import { VOCABULARY_LISTS } from "./vocabulary.generated.ts";

// Photography is prohibited in the catalogue, so it never gets a landing page.
const EXCLUDED_CATEGORIES = new Set<string>(["Photography"]);

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const CATEGORY_PAGES: readonly { name: Category; slug: string }[] =
  VOCABULARY_LISTS.category
    .filter((name) => !EXCLUDED_CATEGORIES.has(name))
    .map((name) => ({ name: name as Category, slug: slugify(name) }));

// Hand-picked artwork drawn on each category's social preview card.
const CATEGORY_COVERS: Record<string, { source: string; nativeId: string }> = {
  "Paintings & Portraits": { source: "met", nativeId: "436535" },
  "Sculpture & Objects": { source: "met", nativeId: "248701" },
  "Works on Paper": { source: "met", nativeId: "45434" },
  "Arms & Armor": { source: "met", nativeId: "24660" },
};

function categoryPageSlug(name: string): string | null {
  return CATEGORY_PAGES.find((page) => page.name === name)?.slug ?? null;
}

function categoryFromPageSlug(slug: string): Category | null {
  return CATEGORY_PAGES.find((page) => page.slug === slug)?.name ?? null;
}

export {
  CATEGORY_COVERS,
  CATEGORY_PAGES,
  categoryFromPageSlug,
  categoryPageSlug,
};
