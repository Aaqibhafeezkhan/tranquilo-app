// The lint baseline is a ratchet: warnings per area may only go down, and a
// decrease has to be recorded so it can't be spent again later.
import { describe, expect, it } from "vitest";
import {
  compareToBaseline,
  countWarningsByArea,
} from "../scripts/lint-baseline.mts";

function warning(path: string) {
  return { severity: "warning", location: { path } };
}

describe("countWarningsByArea", () => {
  it("groups warnings by top-level directory and ignores other severities", () => {
    expect(
      countWarningsByArea([
        warning("api/items.ts"),
        warning("api/og/[slug].ts"),
        warning("tests/a.test.ts"),
        { severity: "error", location: { path: "api/items.ts" } },
        { severity: "information", location: { path: "lib/db.ts" } },
      ]),
    ).toEqual({ api: 2, tests: 1 });
  });

  it("buckets files outside the known areas as other", () => {
    expect(
      countWarningsByArea([warning("vite.config.mts"), warning("biome.json")]),
    ).toEqual({ other: 2 });
  });
});

describe("compareToBaseline", () => {
  it("passes when every area matches the baseline", () => {
    expect(compareToBaseline({ api: 3 }, { api: 3 })).toEqual({
      increased: [],
      decreased: [],
    });
  });

  it("reports an area that went up", () => {
    expect(compareToBaseline({ api: 4, lib: 2 }, { api: 3, lib: 2 })).toEqual({
      increased: [{ area: "api", baseline: 3, current: 4 }],
      decreased: [],
    });
  });

  it("reports an area that went down, including one that reached zero", () => {
    expect(compareToBaseline({ lib: 1 }, { lib: 2, api: 5 })).toEqual({
      increased: [],
      decreased: [
        { area: "api", baseline: 5, current: 0 },
        { area: "lib", baseline: 2, current: 1 },
      ],
    });
  });

  it("treats an area missing from the baseline as zero", () => {
    expect(compareToBaseline({ src: 1 }, {})).toEqual({
      increased: [{ area: "src", baseline: 0, current: 1 }],
      decreased: [],
    });
  });

  it("does not let a decrease in one area offset an increase in another", () => {
    const result = compareToBaseline({ api: 4, lib: 1 }, { api: 3, lib: 2 });
    expect(result.increased).toEqual([
      { area: "api", baseline: 3, current: 4 },
    ]);
    expect(result.decreased).toEqual([
      { area: "lib", baseline: 2, current: 1 },
    ]);
  });
});
