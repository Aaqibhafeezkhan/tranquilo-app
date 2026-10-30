// The templated fallback caption (title, artist, date, medium) rendered in
// a locale. English is the ingestion pipeline's own template, rebuilt here
// from the source fields to prove the stored caption is derived, never
// hand-written; only "Untitled" and "by <artist>" are language-specific,
// and they come from the UI dictionaries.

import { interpolate, lookup } from "../src/i18n/core.ts";
import { DICTIONARIES } from "../src/i18n/dictionaries.ts";
import type { TranslatedField } from "./translations.ts";

interface Words {
  untitled: string;
  by: (artist: string) => string;
}

interface Fields {
  title?: unknown;
  artist?: unknown;
  date?: unknown;
  medium?: unknown;
}

type Captioned = Record<string, unknown> & {
  translated?: Record<string, TranslatedField>;
};

const text = (value: unknown): string =>
  typeof value === "string" ? value : "";

export function buildCaptionBasic(fields: Fields, words: Words): string {
  const parts = [text(fields.title) || words.untitled];
  const artist = text(fields.artist);
  if (artist && artist !== "Unknown") parts.push(words.by(artist));
  const date = text(fields.date);
  if (date) parts.push(`(${date})`);
  const medium = text(fields.medium);
  if (medium) parts.push(`-- ${medium}`);
  return parts.join(" ");
}

function wordsFor(chain: readonly string[]): Words {
  const untitled = lookup("caption.basic.untitled", chain, DICTIONARIES);
  const by = lookup("caption.basic.by", chain, DICTIONARIES);
  return { untitled, by: (artist) => interpolate(by, { artist }) };
}

const CAPTION_FIELDS = ["title", "artist", "date", "medium"] as const;

// Replaces caption_basic in place when the locale words or translated
// fields change it. A caption that is not the template's output for the
// source fields, or already translated for this item, is left alone.
export function localizeCaptionBasic(
  item: Captioned,
  chain: readonly string[],
): void {
  const stored = item.caption_basic;
  if (typeof stored !== "string" || !stored || item.translated?.caption_basic) {
    return;
  }
  const source: Fields = {};
  const served: Fields = {};
  for (const key of CAPTION_FIELDS) {
    served[key] = item[key];
    source[key] = item.translated?.[key]?.original ?? item[key];
  }
  if (buildCaptionBasic(source, wordsFor(["en"])) !== stored) return;
  const localized = buildCaptionBasic(served, wordsFor(chain));
  if (localized === stored) return;
  const locale =
    chain.find(
      (l) => DICTIONARIES[l as keyof typeof DICTIONARIES]?.["caption.basic.by"],
    ) ?? chain[0];
  item.caption_basic = localized;
  item.translated = {
    ...item.translated,
    caption_basic: { origin: "human", locale, original: stored },
  };
}
