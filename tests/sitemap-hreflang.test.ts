import { describe, expect, it } from "vitest";
import { renderStaticPageHreflangLinks } from "../lib/sitemap-hreflang";
import type { LocaleInfo } from "../src/i18n/locales";

const TEST_LOCALES = [
  { code: "en", nativeName: "English", dir: "ltr", status: "shipped" },
  { code: "fr", nativeName: "Français", dir: "ltr", status: "shipped" },
  {
    code: "pt-BR",
    nativeName: "Português (Brasil)",
    dir: "ltr",
    status: "draft",
  },
] as const satisfies readonly LocaleInfo[];

describe("static-page sitemap hreflang links", () => {
  it("includes English, shipped translations, and x-default, but excludes drafts", () => {
    const links = renderStaticPageHreflangLinks(
      "/pages/about.html",
      "https://example.com",
      TEST_LOCALES,
      { fr: ["about.html"], "pt-BR": ["about.html"] },
    );

    expect(links).toContain(
      '<xhtml:link rel="alternate" hreflang="en" href="https://example.com/pages/about.html"/>',
    );
    expect(links).toContain(
      '<xhtml:link rel="alternate" hreflang="fr" href="https://example.com/pages/fr/about.html"/>',
    );
    expect(links).toContain(
      '<xhtml:link rel="alternate" hreflang="x-default" href="https://example.com/pages/about.html"/>',
    );
    expect(links).not.toContain("pt-BR");
  });

  it("omits alternates when no shipped translation exists for the page", () => {
    expect(
      renderStaticPageHreflangLinks(
        "/pages/support.html",
        "https://example.com",
        TEST_LOCALES,
        { "pt-BR": ["support.html"] },
      ),
    ).toBe("");
  });
});
