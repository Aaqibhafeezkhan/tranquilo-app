import { describe, expect, it } from "vitest";
import { printLinkEnabled, printOptionsFor } from "../src/logic/printOptions";

const sized = (w: number, h: number) => ({
  master_width: w,
  master_height: h,
});

describe("which print products an artwork qualifies for", () => {
  it("offers every product when the master image is large enough", () => {
    expect(printOptionsFor(sized(3192, 4000), "us_ca")).toEqual([
      "mini_print",
      "poster",
      "framed",
      "tote",
    ]);
  });

  it("judges by the short edge, whatever the orientation", () => {
    expect(printOptionsFor(sized(4000, 2000), "eu_uk")).toEqual(
      printOptionsFor(sized(2000, 4000), "eu_uk"),
    );
  });

  it("drops products the image is too small for", () => {
    expect(printOptionsFor(sized(2000, 4000), "us_ca")).toEqual([
      "mini_print",
      "tote",
    ]);
    expect(printOptionsFor(sized(1600, 4000), "us_ca")).toEqual(["mini_print"]);
    expect(printOptionsFor(sized(1000, 4000), "us_ca")).toEqual([]);
  });

  it("offers nothing outside a print region", () => {
    expect(printOptionsFor(sized(3192, 4000), null)).toEqual([]);
    expect(printOptionsFor(sized(3192, 4000), "nowhere")).toEqual([]);
  });

  it("offers nothing when the master size is unknown", () => {
    expect(printOptionsFor({}, "us_ca")).toEqual([]);
    expect(
      printOptionsFor({ master_width: null, master_height: 4000 }, "us_ca"),
    ).toEqual([]);
  });
});

describe("whether the print link is shown at all", () => {
  it("stays off by default", () => {
    expect(printLinkEnabled("")).toBe(false);
    expect(printLinkEnabled("?print=1")).toBe(false);
  });

  it("turns on for a preview URL", () => {
    expect(printLinkEnabled("?print=preview")).toBe(true);
    expect(printLinkEnabled("?a=b&print=preview")).toBe(true);
  });
});
