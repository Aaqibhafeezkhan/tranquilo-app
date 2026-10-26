import { LOCALES, type LocaleInfo } from "../src/i18n/locales.ts";
import { staticPageAlternates, TRANSLATED_PAGES } from "../src/i18n/pages.ts";

type TranslatedPages = Readonly<Record<string, readonly string[]>>;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function renderStaticPageHreflangLinks(
  pagePath: string,
  origin: string,
  locales: readonly LocaleInfo[] = LOCALES,
  translatedPages: TranslatedPages = TRANSLATED_PAGES,
): string {
  const file = pagePath.slice("/pages/".length);
  return staticPageAlternates(file, locales, translatedPages)
    .map(
      ({ hreflang, path }) =>
        `            <xhtml:link rel="alternate" hreflang="${escapeXml(hreflang)}" href="${escapeXml(`${origin}${path}`)}"/>`,
    )
    .join("\n");
}
