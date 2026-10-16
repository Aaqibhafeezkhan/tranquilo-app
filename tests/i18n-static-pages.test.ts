// Translated static pages: pages/<locale>/<page>.html, built to
// /pages/<locale>/<page>.html. The guarantees that matter:
//   - the page declares its language (html lang) and the layout's nav and
//     footer are in that language too, not English chrome around
//     translated prose
//   - every nav link goes to the translated page where one exists and to
//     the English page where it doesn't -- never to a 404
//   - a draft locale's pages stay out of search engines (noindex) and
//     aren't advertised from English pages; they're reachable by link only
//   - shared assets resolve from a page two directories deep
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { LOCALES } from "../src/i18n/locales";
import { TRANSLATED_PAGES } from "../src/i18n/pages";
import { expandBaseTemplate } from "../vite-plugins/base-template.mts";
import { expandHeadPartial } from "../vite-plugins/head-partial.mts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

async function built(relativePath: string): Promise<string> {
  const filename = path.join(ROOT, relativePath);
  const extended = await expandBaseTemplate(
    ROOT,
    filename,
    readFileSync(filename, "utf8"),
  );
  return expandHeadPartial(ROOT, filename, extended);
}

describe("the translated-pages registry", () => {
  it("lists only registered locales and files that exist in both languages", () => {
    const codes = LOCALES.map((l) => l.code as string);
    for (const [locale, files] of Object.entries(TRANSLATED_PAGES)) {
      expect(codes).toContain(locale);
      for (const file of files) {
        expect(existsSync(path.join(ROOT, "pages", file)), file).toBe(true);
        expect(
          existsSync(path.join(ROOT, "pages", locale, file)),
          `${locale}/${file}`,
        ).toBe(true);
      }
    }
  });
});

describe("a pt-BR page", () => {
  it("declares its language and carries it for the runtime", async () => {
    const html = await built("pages/pt-BR/about.html");
    expect(html).toMatch(/<html lang="pt-BR" data-locale="pt-BR">/);
    expect(html).toContain('<meta property="og:locale" content="pt_BR">');
  });

  it("has pt-BR navigation, linking translated pages in pt-BR and the rest in English", async () => {
    const html = await built("pages/pt-BR/about.html");
    const nav = html.slice(html.indexOf("<header"), html.indexOf("</header>"));
    expect(nav).toContain('href="/pages/pt-BR/about.html" class="current"');
    expect(nav).toContain('href="/pages/pt-BR/get-involved.html"');
    expect(nav).toContain('href="/pages/submit.html"');
    expect(nav).not.toContain(">About<");
  });

  it("adopts its language at runtime, whatever the page's own script loads", async () => {
    // Not every page script touches src/i18n (get-involved.ts doesn't), so
    // the layout itself loads the module that adopts the page's language.
    const html = await built("pages/pt-BR/get-involved.html");
    expect(html).toContain('src="/src/i18n/adoptPageLocale.ts"');
  });

  it("links back to the English version", async () => {
    const html = await built("pages/pt-BR/about.html");
    expect(html).toContain('href="/pages/about.html?lang=en"');
  });

  it("stays out of search engines while the locale is a draft", async () => {
    const html = await built("pages/pt-BR/about.html");
    expect(html).toContain('<meta name="robots" content="noindex">');
  });

  it("resolves shared assets and its canonical URL from two levels deep", async () => {
    const html = await built("pages/pt-BR/about.html");
    expect(html).toContain('href="../../css/style.css"');
    expect(html).toContain(
      '<link rel="canonical" href="https://tranquilo.art/pages/pt-BR/about.html">',
    );
  });
});

describe("an English page", () => {
  it("is unchanged by a draft translation existing", async () => {
    const html = await built("pages/about.html");
    expect(html).toMatch(/<html lang="en">/);
    expect(html).not.toContain("data-locale");
    expect(html).not.toContain("noindex");
    expect(html).not.toContain("/pages/pt-BR/");
    expect(html).not.toContain("adoptPageLocale");
    expect(html).toContain('href="../css/style.css"');
  });
});
