// The facet filter shared by /api/items and the shelf share card: only
// whitelisted columns reach SQL, and every value is bound, never inlined.
import { describe, expect, it } from "vitest";
import { FACETS, facetClauses } from "../lib/item-facets.ts";

function build(filter: Record<string, unknown>) {
  const values: unknown[] = [];
  const clauses = facetClauses(filter, (v) => {
    values.push(v);
    return `$${values.length}`;
  });
  return { clauses, values };
}

describe("facetClauses", () => {
  it("drops keys outside the whitelist, so no arbitrary column reaches SQL", () => {
    const { clauses, values } = build({
      "title; DROP TABLE items": "x",
      artist: "Rembrandt",
    });
    expect(clauses).toEqual([]);
    expect(values).toEqual([]);
  });

  it("binds every value instead of inlining it", () => {
    const { clauses, values } = build({ category: "Paintings' --" });
    expect(clauses).toEqual(["category = $1"]);
    expect(values).toEqual(["Paintings' --"]);
  });

  it("skips empty and missing values", () => {
    expect(build({ category: "", palette: undefined }).clauses).toEqual([]);
  });

  it("matches region alternates as well as the primary region", () => {
    expect(build({ region_primary: "Europe" }).clauses).toEqual([
      "(region_primary = $1 OR region_alt @> ARRAY[$1]::text[])",
    ]);
  });

  it("treats palette_bucket as containment, not equality", () => {
    expect(build({ palette_bucket: "Blue" }).clauses).toEqual([
      "palette_buckets @> ARRAY[$1]::text[]",
    ]);
  });

  it("whitelists every facet the feed filters on", () => {
    expect([...FACETS].sort()).toEqual(
      [
        "category",
        "media_type",
        "palette",
        "palette_bucket",
        "region_primary",
        "source",
        "subject_type",
        "timeframe",
      ].sort(),
    );
  });
});
