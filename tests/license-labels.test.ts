import { describe, expect, it } from "vitest";
import { licenseLabel } from "../src/app/licenseLabels";

describe("licenseLabel", () => {
  it("links a known Creative Commons slug to its deed", () => {
    expect(licenseLabel("cc-by-4.0")).toEqual({
      label: "CC BY 4.0",
      deed: "https://creativecommons.org/licenses/by/4.0/",
    });
  });

  it("links npm's Open Government Data License to its authoritative page", () => {
    // Not a creativecommons.org URI -- Taiwan's own OGDL 1.0 page, the same
    // one npm.py's LICENSE_CHECK gates on.
    expect(licenseLabel("open-government-data-license-1.0")).toEqual({
      label: "Open Government Data License 1.0",
      deed: "https://data.gov.tw/license",
    });
  });

  it("labels Ibram public-domain items as public domain under Ibram's terms, not as CC", () => {
    // The works are out of copyright; Ibram's museums attach their own reuse
    // terms to the images, so the label says so and links to those terms.
    const ouro = licenseLabel(
      "public-domain-ibram",
      "https://museudoouro.acervos.museus.gov.br/acervo/cordao/",
    );
    expect(ouro.label).toBe("Public domain (Ibram reuse terms)");
    expect(ouro.deed).toBe(
      "https://museudoouro.acervos.museus.gov.br/reproducao-de-imagens-do-acervo/",
    );
    expect(ouro.label).not.toMatch(/CC|Creative Commons/);
  });

  it("leaves the Ibram terms unlinked rather than linking the wrong museum's page", () => {
    expect(
      licenseLabel(
        "public-domain-ibram",
        "https://outro.acervos.museus.gov.br/x/",
      ),
    ).toEqual({ label: "Public domain (Ibram reuse terms)", deed: null });
    expect(licenseLabel("public-domain-ibram")).toEqual({
      label: "Public domain (Ibram reuse terms)",
      deed: null,
    });
  });

  it("is case-insensitive on the stored slug", () => {
    expect(licenseLabel("CC0")).toEqual({
      label: "CC0 1.0",
      deed: "https://creativecommons.org/publicdomain/zero/1.0/",
    });
  });

  it("falls through to the raw value, unlinked, for an unmapped slug", () => {
    expect(licenseLabel("some-future-license")).toEqual({
      label: "some-future-license",
      deed: null,
    });
  });

  it("is empty, not a dash or placeholder, when there is nothing to show", () => {
    expect(licenseLabel("")).toEqual({ label: "", deed: null });
    expect(licenseLabel(null)).toEqual({ label: "", deed: null });
    expect(licenseLabel(undefined)).toEqual({ label: "", deed: null });
  });
});
