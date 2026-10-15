import { describe, expect, it } from "vitest";
import {
  institutionName,
  SMITHSONIAN_MUSEUMS as SERVER_MUSEUMS,
} from "../lib/institution-names.ts";
import { SMITHSONIAN_MUSEUMS as BROWSER_MUSEUMS } from "../src/app/sourceLinks.ts";

describe("institutionName (share-page attribution)", () => {
  it("falls back to the raw source string, never a specific institution", () => {
    // The original bug labelled 708 of 954 live items "via The
    // Metropolitan Museum of Art" regardless of real credit --
    // wrong-but-honest beats wrong-but-confident for attribution.
    expect(institutionName({ source: "some-new-source" })).toBe(
      "some-new-source",
    );
  });

  it("credits a Smithsonian item to the museum its page belongs to", () => {
    expect(
      institutionName({
        source: "smithsonian",
        url: "https://hirshhorn.si.edu/collection/x/",
      }),
    ).toBe("Hirshhorn Museum and Sculpture Garden");
  });

  it("falls back to the Smithsonian itself for an unlisted museum", () => {
    expect(
      institutionName({
        source: "smithsonian",
        url: "https://naturalhistory.si.edu/x",
      }),
    ).toBe("Smithsonian Institution");
  });
});

describe("Smithsonian museum names", () => {
  it("are the same on the server and in the browser", () => {
    // Two copies, since browser code (src/) and server code (api/, lib/)
    // never import each other. This keeps them from drifting.
    expect(BROWSER_MUSEUMS).toEqual(SERVER_MUSEUMS);
  });
});
