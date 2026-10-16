// The browser-facing i18n API: t(), tn(), formatNumber(), and the active
// locale. The decision logic lives in core.ts (pure, testable, reusable at
// build time); this file only adds the things that need a browser --
// remembering the active locale, reading the stored preference and the
// browser's languages, and setting <html lang>.
//
// t() is synchronous on purpose. Every dictionary is bundled (they're
// small), so a lookup is a plain property read and components can render
// in one pass. An async t() would force every component that shows text
// to become async just to fetch a string. If the dictionaries ever grow
// enough to matter, load the active one before the app boots rather than
// making lookups async.
//
// Usage:
//   el.textContent = t("upsell.cta");
//   el.textContent = t("search.resultsFor", { query });
//   el.textContent = tn("works.count", n);   // "1 work" / "1,234 works"
// Insert results with textContent or setAttribute, never innerHTML:
// translations are contributed text and must not be parsed as markup.
import {
  fallbackChain,
  interpolate,
  lookup,
  pluralKey,
  resolveLocale,
} from "./core";
import { type Dictionary, en, type MessageKey } from "./en";
import { type FacetField, facetKey } from "./facets";
import { LOCALES, type LocaleCode, type LocaleInfo } from "./locales";
import { ptBR } from "./pt-BR";

export type { MessageKey } from "./en";
export type { FacetField } from "./facets";
export type { LocaleInfo } from "./locales";

// Typed by LocaleCode, so registering a locale without a dictionary (or
// the reverse) fails typecheck.
const DICTIONARIES: Record<LocaleCode, Dictionary> = {
  en,
  "pt-BR": ptBR,
};
const AVAILABLE: ReadonlySet<string> = new Set(Object.keys(DICTIONARIES));

const STORAGE_KEY = "tranquilo:locale";

type Params = Readonly<Record<string, string | number>>;

/** Base names of plural keys: "works.count" for "works.count.other". */
type PluralBase = MessageKey extends infer K
  ? K extends `${infer B}.other`
    ? B
    : never
  : never;

let active: string | undefined;

function readStored(): string | null {
  try {
    return typeof localStorage === "undefined"
      ? null
      : localStorage.getItem(STORAGE_KEY);
  } catch {
    // Private mode / blocked storage: behave as if nothing was chosen.
    return null;
  }
}

function browserLanguages(): readonly string[] {
  if (typeof navigator === "undefined") return [];
  if (navigator.languages?.length) return navigator.languages;
  return navigator.language ? [navigator.language] : [];
}

/** The locale currently in use, resolved once and then remembered. */
export function currentLocale(): string {
  // A ?lang= link is checked on the first lookup rather than at app start:
  // components render their text while modules are still evaluating, so
  // anything later would leave the first screen in the old language.
  if (active === undefined) applyLocaleParam();
  active ??= resolveLocale({
    stored: readStored(),
    browser: browserLanguages(),
    locales: LOCALES,
  });
  return active;
}

/**
 * Explicitly choose a locale (a switcher, or a reviewer opting into a
 * draft). Persists when storage allows; works for this page either way.
 * Components already on screen keep their text until they re-render.
 */
export function setLocale(code: string): void {
  if (!LOCALES.some((l) => l.code === code)) {
    throw new Error(`setLocale: "${code}" is not a registered locale`);
  }
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Storage unavailable: the choice holds for this page only.
  }
  active = code;
}

/**
 * Honours a ?lang=<code> link: the shareable way into a locale, draft ones
 * included, so a preview can be sent to a reviewer before the language is
 * public. Treated as an explicit choice (persisted, like setLocale). An
 * unknown code is ignored rather than thrown, since links get mangled in
 * transit. Returns whether it switched. Call before applyDocumentLocale().
 */
export function applyLocaleParam(
  search: string = typeof location === "undefined" ? "" : location.search,
): boolean {
  const requested = new URLSearchParams(search).get("lang");
  if (!requested) return false;
  const match = LOCALES.find(
    (l) => l.code.toLowerCase() === requested.toLowerCase(),
  );
  if (!match) return false;
  setLocale(match.code);
  return true;
}

/** Locales visible to visitors, e.g. for a language switcher. */
export function shippedLocales(): readonly LocaleInfo[] {
  return LOCALES.filter((l) => l.status === "shipped");
}

/**
 * Sets lang/dir on <html> to the locale actually being shown, so screen
 * readers, translation tools, and search engines are told the truth.
 * Call once at startup, and again after setLocale().
 */
export function applyDocumentLocale(
  el: { lang: string; dir: string } = document.documentElement,
): void {
  const code = currentLocale();
  el.lang = code;
  el.dir = LOCALES.find((l) => l.code === code)?.dir ?? "ltr";
}

function chain(): string[] {
  return fallbackChain(currentLocale(), AVAILABLE);
}

/**
 * The on-screen label for a controlled-vocabulary value, e.g.
 * facetLabel("category", item.category). Display only: keep using the raw
 * value for filtering and matching. A value with no label anywhere (a term
 * the catalogue gained before anyone labelled it) is shown as-is.
 */
export function facetLabel(field: FacetField, value: string): string {
  const key = facetKey(field, value);
  const label = lookup(key, chain(), DICTIONARIES);
  return label === key ? value : label;
}

/** The string for `key` in the active locale, falling back per key. */
export function t(key: MessageKey, params?: Params): string {
  const template = lookup(key, chain(), DICTIONARIES);
  return params ? interpolate(template, params) : template;
}

/**
 * A plural string: picks "<base>.one" / "<base>.other" / etc. by the
 * active locale's rules, falling back to "<base>.other". {count} is filled
 * with the locale-formatted number.
 */
export function tn(base: PluralBase, count: number, params?: Params): string {
  const key = pluralKey(base, count, currentLocale());
  let template = lookup(key, chain(), DICTIONARIES);
  if (template === key) {
    template = lookup(`${base}.other`, chain(), DICTIONARIES);
  }
  return interpolate(template, { count: formatNumber(count), ...params });
}

/** A number with the active locale's separators: 1,234 / 1.234. */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat(currentLocale()).format(n);
}
