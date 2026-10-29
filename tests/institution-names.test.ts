import { describe, expect, it } from "vitest";
import {
  institutionName,
  SMITHSONIAN_MUSEUMS as SERVER_MUSEUMS,
  TAINACAN_MUSEUMS as SERVER_TAINACAN,
} from "../lib/institution-names.ts";
import {
  SMITHSONIAN_MUSEUMS as BROWSER_MUSEUMS,
  TAINACAN_MUSEUMS as BROWSER_TAINACAN,
} from "../src/app/sourceLinks.ts";

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

  it("credits a Cooper Hewitt object page on www.si.edu to Cooper Hewitt", () => {
    expect(
      institutionName({
        source: "smithsonian",
        url: "https://www.si.edu/object/chndm_1969-40-41",
      }),
    ).toBe("Cooper Hewitt, Smithsonian Design Museum");
    expect(
      institutionName({
        source: "smithsonian",
        url: "https://www.si.edu/object/kulobabrooch:chndm_1969-40-41",
      }),
    ).toBe("Cooper Hewitt, Smithsonian Design Museum");
  });

  it("does not credit other www.si.edu object pages to Cooper Hewitt", () => {
    expect(
      institutionName({
        source: "smithsonian",
        url: "https://www.si.edu/object/saam_1926.6.10",
      }),
    ).toBe("Smithsonian Institution");
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

describe("Tainacan museum names", () => {
  // One source, several Brazilian museums -- each item names its own,
  // read from its object page's host, the same way as the Smithsonian.
  it("credit each item to the museum whose site it came from", () => {
    expect(
      institutionName({
        source: "tainacan",
        url: "https://acervo.margs.rs.gov.br/acervo-artistico-2/cozinha/",
      }),
    ).toBe("Museu de Arte do Rio Grande do Sul");
    expect(
      institutionName({
        source: "tainacan",
        url: "https://museudoouro.acervos.museus.gov.br/acervo/cordao/",
      }),
    ).toBe("Museu do Ouro");
    expect(
      institutionName({
        source: "tainacan",
        url: "https://museuregionalcasadosottoni.acervos.museus.gov.br/acervo-museologico/x/",
      }),
    ).toBe("Museu Regional Casa dos Ottoni");
  });

  it("never guess a museum for an unlisted site", () => {
    const name = institutionName({
      source: "tainacan",
      url: "https://outro.acervos.museus.gov.br/x/",
    });
    expect(Object.values(SERVER_TAINACAN)).not.toContain(name);
    expect(name).not.toBe("tainacan");
  });

  it("are the same on the server and in the browser", () => {
    expect(BROWSER_TAINACAN).toEqual(SERVER_TAINACAN);
  });
});
