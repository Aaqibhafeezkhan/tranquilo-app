import { describe, expect, it } from "vitest";
import {
  printLinkEnabled,
  printOffersFor,
  printOptionsFor,
} from "../src/logic/printOptions";

const sized = (w: number, h: number) => ({
  master_width: w,
  master_height: h,
});

describe("which print products an artwork qualifies for", () => {
  it("offers every product when the master image is large enough", () => {
    expect(printOptionsFor(sized(3192, 4000), "uk")).toEqual([
      "mini_print",
      "poster",
      "framed",
      "tote",
    ]);
  });

  it("offers the mini print only where it can be shipped", () => {
    for (const region of ["us", "ca", "eu"]) {
      expect(printOptionsFor(sized(3192, 4000), region)).not.toContain(
        "mini_print",
      );
    }
    for (const region of ["uk", "au"]) {
      expect(printOptionsFor(sized(3192, 4000), region)).toContain(
        "mini_print",
      );
    }
  });

  it("judges by the short edge, whatever the orientation", () => {
    expect(printOptionsFor(sized(4000, 2000), "eu")).toEqual(
      printOptionsFor(sized(2000, 4000), "eu"),
    );
  });

  it("drops products the image is too small for", () => {
    expect(printOptionsFor(sized(2000, 4000), "uk")).toEqual([
      "mini_print",
      "tote",
    ]);
    expect(printOptionsFor(sized(1600, 4000), "uk")).toEqual(["mini_print"]);
    expect(printOptionsFor(sized(1000, 4000), "uk")).toEqual([]);
    expect(printOptionsFor(sized(2000, 4000), "us")).toEqual(["tote"]);
  });

  it("offers nothing outside a print region", () => {
    expect(printOptionsFor(sized(3192, 4000), null)).toEqual([]);
    expect(printOptionsFor(sized(3192, 4000), "nowhere")).toEqual([]);
  });

  it("offers nothing when the master size is unknown", () => {
    expect(printOptionsFor({}, "us")).toEqual([]);
    expect(
      printOptionsFor({ master_width: null, master_height: 4000 }, "us"),
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

describe("estimated prices", () => {
  it("prices each product in the region's own currency", () => {
    expect(printOffersFor(sized(3192, 4000), "uk")).toEqual([
      {
        product: "mini_print",
        price: { amount: 18, currency: "GBP" },
        buyerPaysImportTax: false,
      },
      {
        product: "poster",
        price: { amount: 24, currency: "GBP" },
        buyerPaysImportTax: false,
      },
      {
        product: "framed",
        price: { amount: 59, currency: "GBP" },
        buyerPaysImportTax: false,
      },
      {
        product: "tote",
        price: { amount: 21, currency: "GBP" },
        buyerPaysImportTax: false,
      },
    ]);
    expect(printOffersFor(sized(3192, 4000), "eu")[0]).toEqual({
      product: "poster",
      price: { amount: 48, currency: "EUR" },
      buyerPaysImportTax: false,
    });
  });

  it("leaves a product unpriced where its delivery cost is unknown", () => {
    expect(printOffersFor(sized(3192, 4000), "br")[1]).toEqual({
      product: "poster",
      price: null,
      buyerPaysImportTax: true,
    });
  });

  it("offers only what the image qualifies for, priced or not", () => {
    expect(
      printOffersFor(sized(2000, 4000), "au").map((o) => o.product),
    ).toEqual(["mini_print", "tote"]);
    expect(printOffersFor(sized(3192, 4000), null)).toEqual([]);
  });
});

describe("Brazil", () => {
  it("offers a mug at a starting price, and an unpriced poster", () => {
    expect(printOffersFor(sized(3192, 4000), "br")).toEqual([
      {
        product: "mug",
        price: { amount: 66, currency: "BRL", startingAt: true },
        buyerPaysImportTax: true,
      },
      { product: "poster", price: null, buyerPaysImportTax: true },
    ]);
  });

  it("offers the mug alone from a smaller image", () => {
    expect(printOptionsFor(sized(2000, 4000), "br")).toEqual(["mug"]);
  });

  it("marks only starting prices as such", () => {
    expect(
      printOffersFor(sized(3192, 4000), "uk").every(
        (o) => !o.price || !("startingAt" in o.price),
      ),
    ).toBe(true);
  });

  it("still needs a large enough master image", () => {
    expect(printOptionsFor(sized(1000, 4000), "br")).toEqual([]);
  });
});
