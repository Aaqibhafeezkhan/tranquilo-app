// Vercel parses a repeated query param (?q=a&q=b) into an array. Only ?ids=
// is meant to repeat; every other param takes its first value, the same rule
// lib/request-origin.ts applies to repeated headers.
import { describe, expect, it } from "vitest";
import { buildQuery } from "../api/items.ts";

describe("buildQuery with repeated scalar params", () => {
  it("searches on the first ?q= instead of throwing", () => {
    const q = buildQuery({ q: ["monet", "degas"] });
    expect(q.params).toContain("monet");
    expect(q.params).not.toContain("degas");
  });

  it("filters a facet on its first value, never on the array", () => {
    const q = buildQuery({ category: ["Painting", "Print"] });
    expect(q.params).toContain("Painting");
    expect(q.params.some((p) => Array.isArray(p))).toBe(false);
  });

  it("dispatches on the first ?shape=", () => {
    expect(buildQuery({ shape: ["facets", "count"] }).facets).toBe(true);
  });

  it("suggests from the first ?q=", () => {
    const q = buildQuery({ shape: "suggest", q: ["pai", "x"] });
    expect(q.params).toEqual(["pai"]);
  });

  it("still accepts ?ids= as a repeated list", () => {
    const q = buildQuery({ ids: ["a", "b"] });
    expect(q.params[0]).toEqual(["a", "b"]);
  });
});
