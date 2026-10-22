// Layout inheritance for pages/*.html, replacing page-chrome-partial.mts's
// marker-comment approach (<!-- NAV:SHARED -->/<!-- FOOTER:SHARED -->) with
// real templating: a page extends pages/_base.html and overrides only the
// blocks it needs to, via posthtml-extend (Jade-style <extends>/<block>,
// chosen over hand-rolling this with regex -- HTML nesting/self-closing
// tags/attributes containing ">" are exactly the class of bug regex-on-HTML
// invites, and this is a maintained, tested implementation of the same
// "layout + overridable blocks" idea).
//
// No TypeScript types ship for either package (checked: no @types/posthtml,
// no @types/posthtml-extend on npm) -- required via createRequire and typed
// loosely, same interop convention this repo already uses throughout
// api/**/lib/** for untyped CJS dependencies.
import path from "node:path";
import { createRequire } from "node:module";
import type { Plugin } from "vite";
import {
  escapeHtml,
  fallbackChain,
  lookup,
  switcherLocales,
} from "../src/i18n/core.ts";
import { DICTIONARIES } from "../src/i18n/dictionaries.ts";
import { LOCALES } from "../src/i18n/locales.ts";
import { localizedPagePath, TRANSLATED_PAGES } from "../src/i18n/pages.ts";

const nodeRequire = createRequire(import.meta.url);
const posthtml = nodeRequire("posthtml");
const extendPlugin = nodeRequire("posthtml-extend");

export const EXTENDS_MARKER = "<extends";

// Same nav-links data page-chrome-partial.mts had. Moved here rather than
// shared between the two files: this plugin fully replaces that one once
// every page under pages/*.html has migrated (see that file's own
// deprecation note), so a temporary duplication beats a shared import that
// only exists for the migration window.
//
// Labels are src/i18n keys, looked up at build time in the page's own
// locale (English for pages/*.html, <locale> for pages/<locale>/*.html).
const NAV_LINKS: Array<{ href: string; label: string; donationGated?: boolean }> = [
  { href: "about.html", label: "nav.about" },
  { href: "submit.html", label: "nav.submit" },
  { href: "get-involved.html", label: "nav.getInvolved" },
  { href: "support.html", label: "nav.support", donationGated: true },
];

const FOOTER_LINKS: Array<{ href: string; label: string }> = [
  { href: "feedback.html", label: "footer.feedback" },
  { href: "terms.html", label: "footer.legal" },
  { href: "curator.html", label: "footer.curator" },
];

const AVAILABLE: ReadonlySet<string> = new Set(Object.keys(DICTIONARIES));

// A build-time t(): the same per-key fallback the browser uses.
function label(locale: string, key: string): string {
  return escapeHtml(
    lookup(key, fallbackChain(locale, AVAILABLE), DICTIONARIES),
  );
}

// A page's <nav> can't be static content living in _base.html -- which
// link (if any) is "current" depends on which page is being built, and a
// static file can't know that. So every page effectively gets a computed
// <block name="nav"> injected here, rather than any page authoring its own.
//
// Absolute (site-root) paths throughout, not "../"-relative: every page
// under pages/*.html sits one directory below the site root, but a page
// built to sit AT the root instead (404.html, so Vercel's static-output
// convention picks it up as the site's 404 with no rewrite needed) would
// need the opposite relative prefix. Absolute paths work identically
// regardless of which directory the linking page itself lives in.
//
// Links go to the page's translation in the current locale where one
// exists (localizedPagePath), otherwise to the English page -- never a 404.
function buildNav(currentFile: string, locale: string): string {
  const links = NAV_LINKS.map(({ href, label: key, donationGated }) => {
    const current = href === currentFile ? ' class="current"' : "";
    const prefix = donationGated ? "data-donations " : "";
    return `<a ${prefix}href="${localizedPagePath(locale, href)}"${current}>${label(locale, key)}</a>`;
  }).join("\n      ");

  return `<header class="mkt-nav">
    <a class="wordmark" href="/index.html"><img class="wordmark-mark" src="/assets/tranquilo-flower-violet.svg" alt="" width="30" height="41" aria-hidden="true"><span>Tranquilo</span></a>
    <nav class="mkt-nav-links">
      <a href="/index.html">${label(locale, "nav.home")}</a>
      ${links}
    </nav>
  </header>`;
}

// Splices a computed <block name="nav"> in as the first child of <extends>,
// right after its opening tag -- posthtml-extend collects every <block>
// inside <extends>...</extends> regardless of position, so this only needs
// to land somewhere inside that wrapper, not any particular slot.
function injectComputedNav(
  html: string,
  currentFile: string,
  locale: string,
): string {
  const navBlock = `<block name="nav">${buildNav(currentFile, locale)}</block>`;
  const footerBlock = `<block name="footer">${buildFooter(currentFile, locale)}</block>`;
  return html.replace(/(<extends[^>]*>)/, `$1\n${navBlock}\n${footerBlock}`);
}

// Computed for the same reason as the nav: its labels follow the page's
// locale. It also carries the static pages' language switcher: this same
// page in each language switcherLocales() offers, by native name. English
// pages don't advertise a draft translation, so while English is the only
// shipped locale they get no switcher at all (see localeAttributes below).
function buildFooter(currentFile: string, locale: string): string {
  const links = FOOTER_LINKS.map(
    ({ href, label: key }) =>
      `<a href="${localizedPagePath(locale, href)}">${label(locale, key)}</a>`,
  );
  return `<footer class="mkt-footer">
    <div class="mkt-footer-links">
      ${links.join("\n      ")}
    </div>${buildLanguageLinks(currentFile, locale)}
  </footer>`;
}

// ?lang= on every link makes the switch an explicit, remembered choice
// (honourLocaleLink.ts / adoptPageLocale.ts pick it up), so the feed
// afterwards is in the language picked here. The current language is a
// span, not a link to itself.
function buildLanguageLinks(currentFile: string, locale: string): string {
  const options = switcherLocales(locale, LOCALES);
  if (options.length < 2) return "";
  const items = options.map(({ code, nativeName }) =>
    code === locale
      ? `<span lang="${code}" aria-current="true">${escapeHtml(nativeName)}</span>`
      : `<a href="${localizedPagePath(code, currentFile)}?lang=${code}" lang="${code}" hreflang="${code}">${escapeHtml(nativeName)}</a>`,
  );
  return `
    <nav class="mkt-footer-langs" aria-label="${label(locale, "language.label")}">
      ${items.join("\n      ")}
    </nav>`;
}

// pages/<locale>/<file>.html -> { locale, file }; pages/<file>.html -> en.
function pageLocale(relPath: string): { locale: string; file: string } {
  const parts = relPath.split("/");
  if (parts[0] === "pages" && parts.length === 3 && TRANSLATED_PAGES[parts[1]]) {
    return { locale: parts[1], file: parts[2] };
  }
  return {
    locale: "en",
    file: relPath.startsWith("pages/") ? relPath.slice("pages/".length) : relPath,
  };
}

// A translated page declares its language (html lang) and hands it to the
// runtime (data-locale, which src/i18n adopts as the visitor's choice). A
// draft locale's pages are kept out of search engines until it ships --
// they're for sharing by link while the translation is reviewed.
function localeAttributes(html: string, locale: string): string {
  if (locale === "en") {
    return html.replace(
      "</body>",
      '<script type="module" src="/src/i18n/honourLocaleLink.ts"></script>\n</body>',
    );
  }
  const draft = LOCALES.find((l) => l.code === locale)?.status !== "shipped";
  let out = html.replace(
    /<html lang="en">/,
    `<html lang="${locale}" data-locale="${locale}">`,
  );
  if (draft) {
    out = out.replace("</head>", '<meta name="robots" content="noindex">\n</head>');
  }
  // Not every page's own script touches src/i18n, so the page's language
  // is adopted by a module of its own (src/i18n/adoptPageLocale.ts).
  return out.replace(
    "</body>",
    '<script type="module" src="/src/i18n/adoptPageLocale.ts"></script>\n</body>',
  );
}

export async function expandBaseTemplate(root: string, filename: string, html: string): Promise<string> {
  if (!html.includes(EXTENDS_MARKER)) return html; // not migrated yet -- untouched

  const relPath = path.relative(root, filename).split(path.sep).join("/");
  const { locale, file: currentFile } = pageLocale(relPath);
  const pagesDir = path.join(root, "pages");

  const withNav = injectComputedNav(html, currentFile, locale);
  const result = await posthtml([extendPlugin({ root: pagesDir })]).process(withNav);
  return localeAttributes(result.html, locale);
}

export default function baseTemplate(root: string): Plugin {
  return {
    name: "tranquilo-base-template",
    transformIndexHtml: {
      // Must run before head-partial.mts: that plugin extracts <title>/
      // <meta name="description"> from the assembled HTML to derive
      // og:/twitter: tags, which only exist once this plugin has resolved
      // the page's <block name="head" type="append"> into the document.
      order: "pre",
      handler(html, ctx) {
        return expandBaseTemplate(root, ctx.filename, html);
      },
    },
  };
}
