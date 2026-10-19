import { describe, expect, it } from "vitest";
import {
  isAggregatorSource,
  sourceLinkLabel,
  sourceLinkPreposition,
  sourceLinkText,
} from "../src/app/sourceLinks";

describe("Smithsonian items", () => {
  // The Smithsonian is an umbrella over many museums, each with its own
  // site. Labelling every item with one of them credited the wrong museum
  // for almost all of them once more than one unit was ingested.
  const at = (url: string) => ({ source: "smithsonian", url });

  it("name the museum their object page belongs to", () => {
    expect(sourceLinkLabel(at("https://asia.si.edu/object/F1904.61/"))).toBe(
      "National Museum of Asian Art",
    );
    expect(sourceLinkLabel(at("https://hirshhorn.si.edu/collection/x/"))).toBe(
      "Hirshhorn Museum and Sculpture Garden",
    );
    expect(
      sourceLinkLabel(at("https://collection.cooperhewitt.org/objects/1/")),
    ).toBe("Cooper Hewitt, Smithsonian Design Museum");
    expect(
      sourceLinkLabel(
        at("https://americanart.si.edu/collections/search/artwork/?id=1"),
      ),
    ).toBe("Smithsonian American Art Museum");
  });

  it("fall back to the Smithsonian itself, never a guessed museum", () => {
    expect(sourceLinkLabel(at("https://naturalhistory.si.edu/x"))).toBe(
      "Smithsonian Institution",
    );
    expect(sourceLinkLabel({ source: "smithsonian" })).toBe(
      "Smithsonian Institution",
    );
  });

  it("read 'View at', since the label is a name rather than a domain", () => {
    expect(sourceLinkPreposition({ source: "smithsonian" })).toBe("at");
  });
});

describe("sourceLinkLabel", () => {
  it("maps each known source to its own domain", () => {
    expect(sourceLinkLabel({ source: "met" })).toBe("metmuseum.org");
    expect(sourceLinkLabel({ source: "cleveland" })).toBe("clevelandart.org");
    expect(sourceLinkLabel({ source: "europeana" })).toBe("europeana.eu");
  });

  it("maps commons to the project's name, not its hard-to-read domain", () => {
    expect(sourceLinkLabel({ source: "commons" })).toBe("Wikimedia Commons");
    expect(sourceLinkPreposition({ source: "commons" })).toBe("on");
  });

  it("maps npm to the institution's name, not a domain", () => {
    expect(sourceLinkLabel({ source: "npm" })).toBe("National Palace Museum");
  });

  it("maps wellcome to its brand name, not a domain or the raw source id", () => {
    expect(sourceLinkLabel({ source: "wellcome" })).toBe("Wellcome Collection");
  });

  it("maps nga to the institution's name, not a domain", () => {
    expect(sourceLinkLabel({ source: "nga" })).toBe("National Gallery of Art");
  });

  it("falls back to the raw source string for an unmapped source", () => {
    expect(sourceLinkLabel({ source: "some-new-source" })).toBe(
      "some-new-source",
    );
  });

  it("falls back to 'source' when there is no source at all", () => {
    expect(sourceLinkLabel({})).toBe("source");
    expect(sourceLinkLabel(null)).toBe("source");
    expect(sourceLinkLabel(undefined)).toBe("source");
  });
});

describe("sourceLinkPreposition", () => {
  it("defaults to 'on' for a domain-style source", () => {
    expect(sourceLinkPreposition({ source: "met" })).toBe("on");
    expect(sourceLinkPreposition({ source: "some-new-source" })).toBe("on");
    expect(sourceLinkPreposition({})).toBe("on");
  });

  it("is 'at' for npm, a named institution rather than a domain", () => {
    expect(sourceLinkPreposition({ source: "npm" })).toBe("at");
  });

  it("is 'at' for wellcome too, same reasoning", () => {
    expect(sourceLinkPreposition({ source: "wellcome" })).toBe("at");
  });

  it("is 'at' for nga, a named institution", () => {
    expect(sourceLinkPreposition({ source: "nga" })).toBe("at");
  });
});

describe("isAggregatorSource", () => {
  it("is true only for europeana", () => {
    expect(isAggregatorSource({ source: "europeana" })).toBe(true);
    expect(isAggregatorSource({ source: "met" })).toBe(false);
    expect(isAggregatorSource({})).toBe(false);
    expect(isAggregatorSource(null)).toBe(false);
  });
});

describe("Tainacan items", () => {
  const at = (url?: string) => ({ source: "tainacan", url });

  it("name the Brazilian museum their object page belongs to", () => {
    expect(
      sourceLinkLabel(
        at("https://acervo.margs.rs.gov.br/acervo-artistico-2/x/"),
      ),
    ).toBe("Museu de Arte do Rio Grande do Sul");
    expect(
      sourceLinkLabel(
        at("https://museudoouro.acervos.museus.gov.br/acervo/x/"),
      ),
    ).toBe("Museu do Ouro");
  });

  it("read 'View at', since the label is a museum's name", () => {
    expect(sourceLinkPreposition(at())).toBe("at");
  });
});

// The link's whole wording, not just its parts: a translation needs the
// verb, preposition and name as one sentence, since word order and
// prepositions don't carry over between languages.
describe("sourceLinkText", () => {
  it("reads 'View on' a domain", () => {
    expect(sourceLinkText({ source: "met" })).toBe("View on metmuseum.org");
  });

  it("reads 'View at' a named institution", () => {
    expect(sourceLinkText({ source: "npm" })).toBe(
      "View at National Palace Museum",
    );
  });
});
