// Which static pages exist in which locale. A translated page lives at
// pages/<locale>/<file> and is built to /pages/<locale>/<file> (see
// vite.config.mts). This list drives the build inputs, the layout's nav
// links (vite-plugins/base-template.mts), and in-app links to pages
// (pagePath() in index.ts), so a page is translated by adding its file here
// and the translation next to it -- nothing else has to learn about it.
//
// Long-form pages are translated as whole documents rather than split into
// dictionary keys: prose doesn't translate well fragment by fragment.

export const TRANSLATED_PAGES: Readonly<Record<string, readonly string[]>> = {
  "pt-BR": ["about.html", "get-involved.html", "support.html"],
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
