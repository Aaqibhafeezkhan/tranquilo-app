// The language a signup or form was sent in, read from a request body. Only a
// code from the locale registry survives -- the value ends up in a mailing-list
// property and in notification emails, so request text never passes through
// as-is. An unknown code returns null instead of an error: it's a client bug,
// and it shouldn't cost anyone their signup or report.
//
// Draft locales count too: a reviewer previewing a draft language is still
// writing in it.

import { LOCALES } from "../src/i18n/locales.ts";

export function requestLocale(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const wanted = raw.trim().toLowerCase();
  if (!wanted) return null;
  return LOCALES.find((l) => l.code.toLowerCase() === wanted)?.code ?? null;
}
