import { describe, expect, it } from "vitest";
import {
  institutionLabel,
  institutionOptions,
} from "../src/logic/institutions";

describe("institutionOptions", () => {
  it("lists direct institutions present in the facets, sorted by label", () => {
    const options = institutionOptions([
      { value: "met", count: 900 },
      { value: "aic", count: 400 },
      { value: "cleveland", count: 10 },
    ]);
    expect(options.map((o) => o.value)).toEqual(["aic", "cleveland", "met"]);
    expect(options.find((o) => o.value === "aic")?.label).toBe(
      "Art Institute of Chicago",
    );
  });

  it("leaves out aggregators and sources without a display name", () => {
    const options = institutionOptions([
      { value: "commons", count: 5000 },
      { value: "europeana", count: 5000 },
      { value: "tainacan", count: 50 },
      { value: "unheard-of", count: 3 },
      { value: "nga", count: 7 },
    ]);
    expect(options.map((o) => o.value)).toEqual(["nga"]);
  });

  it("is empty when the facets carry no sources", () => {
    expect(institutionOptions(undefined)).toEqual([]);
    expect(institutionOptions([])).toEqual([]);
  });
});

describe("institutionLabel", () => {
  it("names a direct institution", () => {
    expect(institutionLabel("tepapa")).toBe("Te Papa");
  });

  it("returns null for a source that is not a listed institution", () => {
    expect(institutionLabel("commons")).toBeNull();
  });
});
