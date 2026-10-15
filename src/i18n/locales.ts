// The locale registry: the one list of languages Tranquilo knows about.
// Everything language-aware reads from here -- runtime resolution, the
// language switcher, static-page generation, sitemap/hreflang, and the
// completeness checks -- so adding a language is a dictionary file plus
// one entry below, not a hunt through the codebase.
//
// status:
//   "shipped" -- public: chosen automatically from the browser's
//                languages and listed in the switcher.
//   "draft"   -- reachable only by an explicit choice (setLocale), so a
//                reviewer can read it in place before it goes public.
//                A browser asking for a draft language gets English.
//
// Codes are BCP-47, region-specific only where the variant matters to
// readers (pt-BR rather than pt). There is no per-entry fallback field:
// the chain is derived (region -> base language -> English, see
// fallbackChain in core.ts), so it can't drift out of sync with the list.
//
// dir is carried even though every current locale is left-to-right, so a
// right-to-left language later is a data change, not a redesign.

export type LocaleStatus = "draft" | "shipped";

export interface LocaleInfo {
  code: string;
  /** The language's name in itself, as shown in the switcher. */
  nativeName: string;
  dir: "ltr" | "rtl";
  status: LocaleStatus;
}

export const DEFAULT_LOCALE = "en";

export const LOCALES = [
  { code: "en", nativeName: "English", dir: "ltr", status: "shipped" },
  {
    code: "pt-BR",
    nativeName: "Português (Brasil)",
    dir: "ltr",
    status: "draft",
  },
] as const satisfies readonly LocaleInfo[];

export type LocaleCode = (typeof LOCALES)[number]["code"];
