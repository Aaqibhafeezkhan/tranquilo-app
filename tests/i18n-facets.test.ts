// Display labels for controlled-vocabulary values (category, region, ...).
// The stored value is also the data key -- shelf filters, the music-bucket
// map, and API queries all match on it -- so translation happens only at
// render time, through facetLabel(), and never changes the value itself.
// What matters here:
//   - every term in shared/vocabulary.json has an English label, so a new
//     taxonomy term can't ship without one (and so translators see it)
//   - a value nobody has labelled yet (the live catalogue can hold terms
//     the vocabulary file doesn't) shows as itself, never as a raw key
//   - the active locale's label is used when it exists
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { en } from "../src/i18n/en";
import { FACET_FIELDS, type FacetField, facetKey } from "../src/i18n/facets";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VOCABULARY = JSON.parse(
  readFileSync(path.join(__dirname, "../shared/vocabulary.json"), "utf8"),
);

// facet field -> its list in shared/vocabulary.json
const VOCAB_LISTS: Record<FacetField, string> = {
  category: "categories",
  region: "regions",
  timeframe: "timeframes",
  media_type: "media_types",
  palette: "palettes",
  subject_type: "subject_types",
};

describe("facetKey", () => {
  it("builds a stable, readable key from the stored value", () => {
    expect(facetKey("category", "Paintings & Portraits")).toBe(
      "facet.category.paintings-portraits",
    );
    expect(facetKey("media_type", "Print/Drawing")).toBe(
      "facet.media_type.print-drawing",
    );
    expect(facetKey("subject_type", "genre_scene")).toBe(
      "facet.subject_type.genre-scene",
    );
    expect(facetKey("timeframe", "19th Century")).toBe(
      "facet.timeframe.19th-century",
    );
  });

  it("gives every vocabulary term in a field its own key", () => {
    for (const field of FACET_FIELDS) {
      const values: string[] = VOCABULARY[VOCAB_LISTS[field]];
      const keys = values.map((v) => facetKey(field, v));
      expect(new Set(keys).size, field).toBe(keys.length);
    }
  });
});

describe("English labels", () => {
  it("exist for every term in shared/vocabulary.json", () => {
    const labelled = new Set(Object.keys(en));
    for (const field of FACET_FIELDS) {
      for (const value of VOCABULARY[VOCAB_LISTS[field]] as string[]) {
        expect(
          labelled.has(facetKey(field, value)),
          `no English label for ${field} "${value}" -- add ${facetKey(field, value)} to src/i18n/en.ts`,
        ).toBe(true);
      }
    }
  });
});

describe("facetLabel (runtime)", () => {
  async function loadWith(stored?: string) {
    const store: Record<string, string> = stored
      ? { "tranquilo:locale": stored }
      : {};
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
    });
    vi.stubGlobal("navigator", { languages: ["en-US"], language: "en-US" });
    vi.resetModules();
    return import("../src/i18n/index");
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the English label for a known value", async () => {
    const i18n = await loadWith();
    expect(i18n.facetLabel("category", "Paintings & Portraits")).toBe(
      "Paintings & Portraits",
    );
    // Stored subject types are snake_case slugs, not display text.
    expect(i18n.facetLabel("subject_type", "genre_scene")).toBe("Genre scene");
  });

  it("shows an unlabelled value as itself, never as a key", async () => {
    const i18n = await loadWith();
    expect(i18n.facetLabel("category", "Ceremonial Masks")).toBe(
      "Ceremonial Masks",
    );
  });

  it("uses the active locale's label when one exists", async () => {
    const i18n = await loadWith("pt-BR");
    const label = i18n.facetLabel("category", "Paintings & Portraits");
    expect(label).not.toBe("Paintings & Portraits");
    expect(label).not.toMatch(/^facet\./);
    // An unlabelled value still passes through untouched.
    expect(i18n.facetLabel("category", "Ceremonial Masks")).toBe(
      "Ceremonial Masks",
    );
  });
});
