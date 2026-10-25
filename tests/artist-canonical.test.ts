import { describe, expect, it } from "vitest";
import {
  buildCanonicalMap,
  chooseCanonical,
  flipSurnameFirst,
  planFromMap,
} from "../lib/artist-canonical.ts";

const rows = (...pairs: [string, number][]) =>
  pairs.map(([artist, n]) => ({ artist, n }));

describe("chooseCanonical", () => {
  it("returns null when the catalogue holds no spelling", () => {
    expect(chooseCanonical([])).toBeNull();
  });

  it("prefers the most-used spelling", () => {
    expect(
      chooseCanonical(rows(["Rembrandt", 4], ["Rembrandt van Rijn", 30])),
    ).toBe("Rembrandt van Rijn");
  });

  it("prefers the accented form of the same name regardless of count", () => {
    expect(
      chooseCanonical(rows(["Edouard Manet", 10], ["Édouard Manet", 2])),
    ).toBe("Édouard Manet");
  });

  it("prefers a display-order spelling over a more-used surname-first one", () => {
    expect(chooseCanonical(rows(["Bril, Paul", 20], ["Paul Bril", 3]))).toBe(
      "Paul Bril",
    );
  });

  it("flips a surname-first name when the authority file has the flipped form", () => {
    expect(
      chooseCanonical(rows(["Edelfelt, Albert", 12]), [
        "Edelfelt, Albert",
        "Albert Edelfelt",
      ]),
    ).toBe("Albert Edelfelt");
  });

  it("moves name particles with the surname", () => {
    expect(
      chooseCanonical(rows(["Velde, Adriaen van de", 5]), [
        "Adriaen van de Velde",
      ]),
    ).toBe("Adriaen van de Velde");
  });

  it("confirms a flip ignoring accents and case, keeping our spelling", () => {
    expect(chooseCanonical(rows(["Sipilä, Sulho", 3]), ["sulho sipila"])).toBe(
      "Sulho Sipilä",
    );
  });

  it("leaves a surname-first name alone when the flip is unconfirmed", () => {
    expect(
      chooseCanonical(rows(["Westerholm, Victor", 7]), [
        "Victor Axel Westerholm",
      ]),
    ).toBe("Westerholm, Victor");
  });

  it("never flips a comma that introduces a title or suffix", () => {
    const variants = [
      "Jean Claude Richard de Saint-Non",
      "Allen Smith",
      "Allen Smith Jr.",
    ];
    expect(
      chooseCanonical(
        rows(["Jean Claude Richard, Abbé de Saint-Non", 4]),
        variants,
      ),
    ).toBe("Jean Claude Richard, Abbé de Saint-Non");
    expect(chooseCanonical(rows(["Allen Smith, Jr.", 2]), variants)).toBe(
      "Allen Smith, Jr.",
    );
  });
});

describe("planFromMap", () => {
  const map = {
    "Bril, Paul": "Paul Bril",
    "Paul Bril": "Paul Bril",
    "Unknown, Dutch": "Somebody",
    "Anonymous": "Somebody",
  };

  it("plans a rewrite for each mapped spelling that differs", () => {
    expect(planFromMap(rows(["Bril, Paul", 6]), map)).toEqual([
      { from: "Bril, Paul", to: "Paul Bril", items: 6 },
    ]);
  });

  it("skips spellings already canonical or not in the map", () => {
    expect(planFromMap(rows(["Paul Bril", 3], ["Jan Both", 2]), map)).toEqual(
      [],
    );
  });

  it("never rewrites a placeholder attribution", () => {
    expect(
      planFromMap(rows(["Unknown, Dutch", 4], ["Anonymous", 9]), map),
    ).toEqual([]);
  });
});

describe("buildCanonicalMap", () => {
  it("maps our names and every variant to the group's canonical", () => {
    expect(
      buildCanonicalMap(
        [
          {
            canonical: "Paul Bril",
            ourNames: ["Bril, Paul"],
            variants: ["Paul Bril", "Bril, P."],
          },
        ],
        new Set(),
      ),
    ).toEqual({
      "Bril, Paul": "Paul Bril",
      "Paul Bril": "Paul Bril",
      "Bril, P.": "Paul Bril",
    });
  });

  it("never maps a variant that ULAN marks ambiguous", () => {
    const map = buildCanonicalMap(
      [
        {
          canonical: "Niccolo dell' Abbate",
          ourNames: ["Niccolo dell' Abbate"],
          variants: ["Hubert Robert"],
        },
      ],
      new Set(["Hubert Robert"]),
    );
    expect(map).not.toHaveProperty("Hubert Robert");
  });

  it("drops a variant two groups both claim", () => {
    const map = buildCanonicalMap(
      [
        { canonical: "Camille Pissarro", ourNames: [], variants: ["Pissarro"] },
        { canonical: "Lucien Pissarro", ourNames: [], variants: ["Pissarro"] },
      ],
      new Set(),
    );
    expect(map).not.toHaveProperty("Pissarro");
  });

  it("keeps our own unambiguous name even when another group lists it", () => {
    const map = buildCanonicalMap(
      [
        {
          canonical: "Jan van Goyen",
          ourNames: ["Jan van Goyen"],
          variants: [],
        },
        {
          canonical: "Someone Else",
          ourNames: [],
          variants: ["Jan van Goyen"],
        },
      ],
      new Set(),
    );
    expect(map["Jan van Goyen"]).toBe("Jan van Goyen");
  });
});

describe("flipSurnameFirst", () => {
  it("flips exactly one comma", () => {
    expect(flipSurnameFirst("Bril, Paul")).toBe("Paul Bril");
  });

  it("returns null without exactly one comma", () => {
    expect(flipSurnameFirst("Paul Bril")).toBeNull();
    expect(flipSurnameFirst("Geest, Wybrand de, the Elder")).toBeNull();
    expect(flipSurnameFirst("Bril,")).toBeNull();
  });
});
