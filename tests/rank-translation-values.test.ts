import { describe, expect, it } from "vitest";
import { assertReadOnly } from "../scripts/profile_item_fill_rates.mts";
import {
  coverageThresholds,
  RANK_QUERIES,
} from "../scripts/rank_translation_values.mts";

describe("coverageThresholds", () => {
  it("counts how many top values reach each share of items", () => {
    const counts = [50, 30, 10, 5, 3, 2];
    expect(coverageThresholds(counts, [0.5, 0.8, 0.9, 1])).toEqual({
      "0.5": 1,
      "0.8": 2,
      "0.9": 3,
      "1": 6,
    });
  });

  it("reaches a share exactly on the boundary value", () => {
    expect(coverageThresholds([5, 5], [0.5, 1])).toEqual({ "0.5": 1, "1": 2 });
  });

  it("returns zeros for no values", () => {
    expect(coverageThresholds([], [0.5, 1])).toEqual({ "0.5": 0, "1": 0 });
  });
});

describe("RANK_QUERIES", () => {
  it("covers the dictionary fields and only reads", () => {
    expect(Object.keys(RANK_QUERIES)).toEqual([
      "medium",
      "culture",
      "place_of_origin",
      "artist_nationality",
      "tags",
    ]);
    for (const text of Object.values(RANK_QUERIES)) {
      expect(() => assertReadOnly(text)).not.toThrow();
    }
  });
});
