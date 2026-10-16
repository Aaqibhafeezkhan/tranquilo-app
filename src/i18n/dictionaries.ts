// Every registered locale's dictionary, in one place so the browser runtime
// (index.ts) and build-time code (vite-plugins/base-template.mts, which
// translates static pages' nav and footer) read the same strings.
//
// Typed by LocaleCode, so registering a locale without a dictionary (or
// the reverse) fails typecheck. Bundled rather than lazy-loaded: they're
// small, and a synchronous t() depends on them being present.
//
// Imports here, in core.ts and in pt-BR.ts carry explicit ".ts" extensions,
// unlike the rest of src/: vite.config.mts loads these modules (via
// vite-plugins/base-template.mts and pages.ts), and Vite's native config
// loader needs real file extensions.
import { type Dictionary, en } from "./en.ts";
import type { LocaleCode } from "./locales.ts";
import { ptBR } from "./pt-BR.ts";

export const DICTIONARIES: Readonly<Record<LocaleCode, Dictionary>> = {
  en,
  "pt-BR": ptBR,
};
