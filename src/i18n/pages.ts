// Which static pages exist in which locale. A translated page lives at
// pages/<locale>/<file> and is built to /pages/<locale>/<file> (see
// vite.config.mts). This list drives the build inputs, the layout's nav
// links (vite-plugins/base-template.mts), and in-app links to pages
// (pagePath() in index.ts), so a page is translated by adding its file here
// and the translation next to it -- nothing else has to learn about it.
//
// Long-form pages are translated as whole documents rather than split into
// dictionary keys: prose doesn't translate well fragment by fragment.
import { DEFAULT_LOCALE, LOCALES, type LocaleInfo } from "./locales.ts";

type TranslatedPages = Readonly<Record<string, readonly string[]>>;

export const TRANSLATED_PAGES: TranslatedPages = {
  "pt-BR": [
    "about.html",
    "curator.html",
    "feedback.html",
    "get-involved.html",
    "privacy.html",
    "submit.html",
    "support.html",
    "terms.html",
    "thank-you.html",
  ],
};

/**
 * The URL of a static page (e.g. "about.html") in `locale`: the translated
 * page where one exists, otherwise the English one.
 */
export function localizedPagePath(locale: string, file: string): string {
  return TRANSLATED_PAGES[locale]?.includes(file)
    ? `/pages/${locale}/${file}`
    : `/pages/${file}`;
}

/**
 * Every shipped language version of a static page, plus x-default, for
 * hreflang alternates in the sitemap and each page's <head>. Empty when no
 * shipped locale translates the page: a lone English page needs none.
 */
export function staticPageAlternates(
  file: string,
  locales: readonly LocaleInfo[] = LOCALES,
  translatedPages: TranslatedPages = TRANSLATED_PAGES,
): Array<{ hreflang: string; path: string }> {
  const englishPath = `/pages/${file}`;
  const translations = locales.filter(
    (l) =>
      l.status === "shipped" &&
      l.code !== DEFAULT_LOCALE &&
      translatedPages[l.code]?.includes(file),
  );
  if (translations.length === 0) return [];
  return [
    { hreflang: DEFAULT_LOCALE, path: englishPath },
    ...translations.map((l) => ({
      hreflang: l.code,
      path: `/pages/${l.code}/${file}`,
    })),
    { hreflang: "x-default", path: englishPath },
  ];
}
