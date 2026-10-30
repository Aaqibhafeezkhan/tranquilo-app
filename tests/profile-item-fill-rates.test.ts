import { describe, expect, it } from "vitest";
import {
  assertReadOnly,
  COMPANION_QUERIES,
  FILL_SQL,
  profile,
} from "../scripts/profile_item_fill_rates.mts";

describe("profile_item_fill_rates read-only guard", () => {
  it("accepts SELECT and WITH statements", () => {
    expect(() => assertReadOnly("SELECT 1")).not.toThrow();
    expect(() =>
      assertReadOnly("  with x as (select 1) select * from x"),
    ).not.toThrow();
  });

  it.each([
    "DELETE FROM items",
    "UPDATE items SET title = 'x'",
    "INSERT INTO items DEFAULT VALUES",
    "DROP TABLE items",
    "SELECT 1; DELETE FROM items",
  ])("rejects %s", (text) => {
    expect(() => assertReadOnly(text)).toThrow();
  });

  it("every query the profile can issue passes the guard", () => {
    for (const text of [FILL_SQL, ...Object.values(COMPANION_QUERIES)]) {
      expect(() => assertReadOnly(text)).not.toThrow();
    }
  });
});

describe("profile", () => {
  it("profiles each live source and runs every companion query", async () => {
    const seen: string[] = [];
    const query = async (text: string, params: unknown[] = []) => {
      assertReadOnly(text);
      seen.push(text);
      if (text.includes("SELECT DISTINCT source")) {
        return [{ source: "met" }, { source: "mia" }];
      }
      if (text === FILL_SQL) {
        return [
          { column_name: "title", total: 2, filled: 1, source: params[0] },
        ];
      }
      return [];
    };

    const report = await profile(query);

    expect(report.sources).toEqual(["met", "mia"]);
    expect(Object.keys(report.fill)).toEqual(["met", "mia"]);
    expect(Object.keys(report.companions)).toEqual(
      Object.keys(COMPANION_QUERIES),
    );
    expect(seen.filter((t) => t === FILL_SQL)).toHaveLength(2);
  });

  it("excludes heavy columns from the fill profile", async () => {
    let excluded: unknown;
    const query = async (text: string, params: unknown[] = []) => {
      if (text.includes("SELECT DISTINCT source")) return [{ source: "met" }];
      if (text === FILL_SQL) excluded = params[1];
      return [];
    };

    await profile(query);

    expect(excluded).toEqual(
      expect.arrayContaining(["search_text", "review_flags", "caption_tea"]),
    );
  });
});
