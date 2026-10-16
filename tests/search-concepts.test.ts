// A search concept swaps the visitor's words for a server filter. If that
// filter names a category the catalogue no longer uses, the search lands on
// an empty feed instead of falling back to an ordinary text search, so every
// category a concept points at must be a live term in shared/vocabulary.json.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CONCEPT_MAP } from "../src/app/SearchController";
import { matchConcept } from "../src/logic/logic";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VOCABULARY = JSON.parse(
  readFileSync(path.join(__dirname, "../shared/vocabulary.json"), "utf8"),
);

describe("search concepts", () => {
  it("only filter by categories that exist in the vocabulary", () => {
    for (const [word, entry] of Object.entries(CONCEPT_MAP)) {
      const category = entry.filter.category;
      if (category === undefined) continue;
      expect(VOCABULARY.categories, `concept "${word}"`).toContain(category);
    }
  });

  it("leaves a search for a retired category to the text search", () => {
    expect(matchConcept("architecture", CONCEPT_MAP)).toBe(null);
  });
});
