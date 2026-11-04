import { describe, expect, it } from "vitest";
import {
  applyAliases,
  buildCanonicalMap,
  chooseCanonical,
  excludedVariants,
  flipSurnameFirst,
  neverMapped,
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

  it("breaks a tie the same way whatever order the rows arrive in", () => {
    const spaced: [string, number] = ["Jean Pierre Hoüel", 5];
    const hyphenated: [string, number] = ["Jean-Pierre Hoüel", 5];
    expect(chooseCanonical(rows(spaced, hyphenated))).toBe("Jean-Pierre Hoüel");
    expect(chooseCanonical(rows(hyphenated, spaced))).toBe("Jean-Pierre Hoüel");
    const a: [string, number] = ["Anthony Vandyck", 5];
    const b: [string, number] = ["Anthony Vandyke", 5];
    expect(chooseCanonical(rows(a, b))).toBe(chooseCanonical(rows(b, a)));
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

  it("prefers a plain name over a more-used one carrying a parenthetical", () => {
    expect(
      chooseCanonical(
        rows(
          ["Pietro da Cortona (Pietro Berrettini)", 40],
          ["Pietro da Cortona", 5],
        ),
      ),
    ).toBe("Pietro da Cortona");
  });

  it("prefers a plain name over one carrying native script or dates", () => {
    expect(
      chooseCanonical(
        rows(["Katsukawa Shunshō 勝川春章", 30], ["Katsukawa Shunshō", 2]),
      ),
    ).toBe("Katsukawa Shunshō");
    expect(
      chooseCanonical(rows(["Jin Nong (1687-1763)", 30], ["Jin Nong", 2])),
    ).toBe("Jin Nong");
  });

  it("still returns a decorated name when it is the only spelling", () => {
    expect(chooseCanonical(rows(["Mei Qing (1623-1697)", 15]))).toBe(
      "Mei Qing (1623-1697)",
    );
  });

  it("prefers a plain surname-first name and flips it when confirmed", () => {
    expect(
      chooseCanonical(
        rows(
          ["Rembrandt (Rembrandt van Rijn)", 25],
          ["Rijn, Rembrandt van", 3],
        ),
        ["Rembrandt van Rijn"],
      ),
    ).toBe("Rembrandt van Rijn");
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

  it("leaves a spelling a reviewer rejected untouched", () => {
    expect(
      planFromMap(rows(["Bril, Paul", 6]), map, new Set(["Bril, Paul"])),
    ).toEqual([]);
  });

  it("never rewrites a placeholder attribution", () => {
    expect(
      planFromMap(rows(["Unknown, Dutch", 4], ["Anonymous", 9]), map),
    ).toEqual([]);
  });
});

describe("excludedVariants", () => {
  it("excludes variants two subjects claim, hedges, and ambiguous names", () => {
    const excluded = excludedVariants(
      [
        { variants: ["Maris", "Jacob Maris", "After Jacob Maris"] },
        { variants: ["Maris", "Willem Maris"] },
      ],
      new Set(["Canaletto"]),
    );
    expect([...excluded].sort()).toEqual([
      "After Jacob Maris",
      "Canaletto",
      "Maris",
    ]);
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

  it("never maps a hedged attribution onto the artist", () => {
    const map = buildCanonicalMap(
      [
        {
          canonical: "Anthony van Dyck",
          ourNames: ["Anthony van Dyck"],
          variants: [
            "After Van Dyck",
            "school of van dyck",
            "Follower of Anthony van Dyck",
            "Anthonis van Dyck (?)",
            "Van Dyck",
          ],
        },
      ],
      new Set(),
    );
    expect(map).toEqual({
      "Anthony van Dyck": "Anthony van Dyck",
      "Van Dyck": "Anthony van Dyck",
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

describe("applyAliases", () => {
  const map = { "Canal, Antonio": "Antonio Canaletto" };

  it("adds a curated spelling for an artist the map already knows", () => {
    expect(
      applyAliases(map, {
        "Canaletto (Giovanni Antonio Canal)": "Antonio Canaletto",
      }),
    ).toEqual({
      "Canal, Antonio": "Antonio Canaletto",
      "Canaletto (Giovanni Antonio Canal)": "Antonio Canaletto",
    });
  });

  it("refuses a target the map has never used as a canonical", () => {
    expect(() =>
      applyAliases(map, {
        "Canaletto (Giovanni Antonio Canal)": "Antonio Canalleto",
      }),
    ).toThrow(/Antonio Canalleto/);
  });

  it("removes a spelling marked never to be mapped", () => {
    expect(applyAliases(map, { "Canal, Antonio": null })).toEqual({});
  });

  it("splits never-map spellings from the additions", () => {
    expect(
      neverMapped({ "G Romano": null, "Canaletto (X)": "Antonio Canaletto" }),
    ).toEqual(new Set(["G Romano"]));
  });

  it("refuses a hedged spelling", () => {
    expect(() =>
      applyAliases(map, { "After Canaletto": "Antonio Canaletto" }),
    ).toThrow(/After Canaletto/);
  });
});
