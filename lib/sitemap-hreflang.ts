import { DEFAULT_LOCALE, LOCALES, type LocaleInfo } from "../src/i18n/locales.ts";
import { TRANSLATED_PAGES } from "../src/i18n/pages.ts";

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
  const shippedLocales = locales.filter(
    (locale) => locale.status === "shipped",
  );
  const hasShippedTranslation = shippedLocales.some(
    (locale) =>
      locale.code !== DEFAULT_LOCALE &&
      translatedPages[locale.code]?.includes(file),
  );

  if (!hasShippedTranslation) return "";

  const links = shippedLocales.flatMap((locale) => {
    if (locale.code === DEFAULT_LOCALE) {
      return [{ language: locale.code, path: pagePath }];
    }
    if (!translatedPages[locale.code]?.includes(file)) return [];
    return [{ language: locale.code, path: `/pages/${locale.code}/${file}` }];
  });
  links.push({ language: "x-default", path: pagePath });

  return links
    .map(
      ({ language, path }) =>
        `            <xhtml:link rel="alternate" hreflang="${escapeXml(language)}" href="${escapeXml(`${origin}${path}`)}"/>`,
    )
    .join("\n");
}
