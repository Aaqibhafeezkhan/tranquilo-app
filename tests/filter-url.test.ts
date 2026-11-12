import { describe, expect, it } from "vitest";
import { FilterState } from "../src/app/FilterState";
import { filterQueryString, parseFilterQuery } from "../src/logic/filterUrl";

const allowed = {
  categories: ["All", "Paintings", "Sculpture"],
  sources: ["met", "aic"],
  paletteBuckets: ["Blue", "Gold/Yellow"],
};

function stateWith(apply: (s: FilterState) => void) {
  const s = new FilterState();
  apply(s);
  return s.snapshot();
}

describe("filterQueryString", () => {
  it("is empty for the unfiltered feed", () => {
    expect(filterQueryString(new FilterState().snapshot())).toBe("");
  });

  it("encodes a text search", () => {
    const qs = filterQueryString(stateWith((s) => s.setSearch("wheat field")));
    expect(new URLSearchParams(qs).get("q")).toBe("wheat field");
  });

  it("encodes a concept by the query that produced it", () => {
    const qs = filterQueryString(
      stateWith((s) =>
        s.setConcept({
          label: "armor",
          filter: { category: "Arms & Armor" },
          query: "armour",
        }),
      ),
    );
    expect(new URLSearchParams(qs).get("q")).toBe("armour");
  });

  it("composes facets with a search", () => {
    const params = new URLSearchParams(
      filterQueryString(
        stateWith((s) => {
          s.setSearch("sky");
          s.setSource("met");
          s.setPaletteBucket("Blue");
          s.toggleStorylineFilter();
        }),
      ),
    );
    expect(params.get("q")).toBe("sky");
    expect(params.get("source")).toBe("met");
    expect(params.get("palette")).toBe("Blue");
    expect(params.get("storylines")).toBe("1");
  });

  it("encodes category browsing and omits the default category", () => {
    const params = new URLSearchParams(
      filterQueryString(stateWith((s) => s.setCategory("Paintings"))),
    );
    expect(params.get("category")).toBe("Paintings");
    expect(
      new URLSearchParams(
        filterQueryString(stateWith((s) => s.setPaletteBucket("Blue"))),
      ).has("category"),
    ).toBe(false);
  });

  it("encodes an artist filter without a category", () => {
    const params = new URLSearchParams(
      filterQueryString(
        stateWith((s) => {
          s.setArtist("Vincent van Gogh");
          s.setCategory("Paintings");
        }),
      ),
    );
    expect(params.get("artist")).toBe("Vincent van Gogh");
    expect(params.has("category")).toBe(false);
  });

  it("never encodes the personal collection view", () => {
    expect(
      filterQueryString(stateWith((s) => s.setCollectionFilter(true))),
    ).toBe("");
  });

  it("round-trips through parseFilterQuery", () => {
    const qs = filterQueryString(
      stateWith((s) => {
        s.setSearch("a&b = c");
        s.setSource("aic");
        s.setPaletteBucket("Gold/Yellow");
      }),
    );
    expect(parseFilterQuery(qs, allowed)).toEqual({
      query: "a&b = c",
      artist: null,
      category: "All",
      source: "aic",
      paletteBucket: "Gold/Yellow",
      storylineFilter: false,
    });
  });
});

describe("parseFilterQuery", () => {
  it("returns no filters for an empty or unrelated query string", () => {
    const none = {
      query: null,
      artist: null,
      category: "All",
      source: null,
      paletteBucket: null,
      storylineFilter: false,
    };
    expect(parseFilterQuery("", allowed)).toEqual(none);
    expect(parseFilterQuery("?lang=pt-BR&print=preview", allowed)).toEqual(
      none,
    );
  });

  it("drops values the catalogue does not offer", () => {
    expect(
      parseFilterQuery(
        "?category=Nope&source=nope&palette=Mauve&storylines=0",
        allowed,
      ),
    ).toMatchObject({
      category: "All",
      source: null,
      paletteBucket: null,
      storylineFilter: false,
    });
  });

  it("ignores blank text values", () => {
    expect(parseFilterQuery("?q=%20%20&artist=", allowed)).toMatchObject({
      query: null,
      artist: null,
    });
  });

  it("lets a search win over an artist, as the feed's modes are exclusive", () => {
    expect(parseFilterQuery("?q=sky&artist=Monet", allowed)).toMatchObject({
      query: "sky",
      artist: null,
    });
  });
});
