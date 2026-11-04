// Value-level translations: one reviewed term serves every item that uses it.
// Pure logic, no database.
import { describe, expect, it } from "vitest";
import {
  applyTerms,
  type TermRow,
  termKey,
  termLookup,
} from "../lib/translations.ts";

function term(over: Partial<TermRow>): TermRow {
  return {
    field: "medium",
    locale: "pt-BR",
    source_key: "etching",
    source_text: "etching",
    text: "água-forte",
    ...over,
  };
}

describe("termKey", () => {
  it("ignores case and surrounding or repeated whitespace", () => {
    expect(termKey("  Oil  on canvas ")).toBe("oil on canvas");
  });
});

describe("termLookup", () => {
  it("collects each distinct key once, splitting tags on commas", () => {
    const lookup = termLookup([
      { medium: "Etching", tags: "Print, Men,  Women" },
      { medium: "etching", tags: "Print" },
      { medium: null, culture: "French" },
    ]);
    expect(lookup.fields.length).toBe(lookup.keys.length);
    const pairs = lookup.fields.map((f, i) => `${f}:${lookup.keys[i]}`).sort();
    expect(pairs).toEqual([
      "culture:french",
      "medium:etching",
      "tags:men",
      "tags:print",
      "tags:women",
    ]);
  });

  it("asks for nothing when no translatable field has a value", () => {
    expect(termLookup([{ title: "x", medium: "" }]).keys).toEqual([]);
  });
});

describe("applyTerms", () => {
  const chain = ["pt-BR", "en"];

  it("replaces a matching field and records what it replaced", () => {
    const item: Record<string, unknown> = { medium: "Etching" };
    applyTerms(item, [term({})], chain);
    expect(item.medium).toBe("Água-forte");
    expect(item.translated).toEqual({
      medium: { origin: "human", locale: "pt-BR", original: "Etching" },
    });
  });

  it("matches without regard to case and follows the source's capitalization", () => {
    const rows = [
      term({ source_text: "Bronze", source_key: "bronze", text: "Bronze" }),
    ];
    const upper: Record<string, unknown> = { medium: "Bronze" };
    const lower: Record<string, unknown> = { medium: "bronze" };
    applyTerms(upper, rows, chain);
    applyTerms(lower, rows, chain);
    expect(upper.medium).toBe("Bronze");
    expect(lower.medium).toBe("bronze");
  });

  it("keeps a proper noun's capital when the source variant differs only in case convention", () => {
    const rows = [
      term({
        field: "place_of_origin",
        source_key: "japan",
        source_text: "Japan",
        text: "Japão",
      }),
    ];
    const item: Record<string, unknown> = { place_of_origin: "Japan" };
    applyTerms(item, rows, chain);
    expect(item.place_of_origin).toBe("Japão");
  });

  it("leaves a field with no matching term untouched and adds no translated entry", () => {
    const item: Record<string, unknown> = { medium: "Gouache" };
    applyTerms(item, [term({})], chain);
    expect(item.medium).toBe("Gouache");
    expect(item.translated).toBeUndefined();
  });

  it("does not overwrite a field an item-level translation already replaced", () => {
    const item: Record<string, unknown> = {
      medium: "Água-forte do museu",
      translated: {
        medium: { origin: "human", locale: "pt-BR", original: "Etching" },
      },
    };
    applyTerms(item, [term({})], chain);
    expect(item.medium).toBe("Água-forte do museu");
  });

  it("translates tags token by token, keeping tokens without a term", () => {
    const rows = [
      term({
        field: "tags",
        source_key: "print",
        source_text: "Print",
        text: "Gravura",
      }),
      term({
        field: "tags",
        source_key: "men",
        source_text: "Men",
        text: "Homens",
      }),
    ];
    const item: Record<string, unknown> = { tags: "Print, Men, Gouache" };
    applyTerms(item, rows, chain);
    expect(item.tags).toBe("Gravura, Homens, Gouache");
    expect(item.translated).toEqual({
      tags: {
        origin: "human",
        locale: "pt-BR",
        original: "Print, Men, Gouache",
      },
    });
  });

  it("prefers the earlier locale in the chain", () => {
    const rows = [
      term({ locale: "en", text: "etching (en)" }),
      term({ locale: "pt-BR", text: "água-forte" }),
    ];
    const item: Record<string, unknown> = { medium: "etching" };
    applyTerms(item, rows, chain);
    expect(item.medium).toBe("água-forte");
  });

  it("ignores fields that are not item values (title, caption)", () => {
    const item: Record<string, unknown> = { title: "Etching" };
    applyTerms(item, [term({ field: "title" })], chain);
    expect(item.title).toBe("Etching");
  });
});
