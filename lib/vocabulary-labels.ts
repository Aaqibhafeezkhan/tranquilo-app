// Display labels for the controlled vocabularies (category, region, ...) in
// a locale. The English value is the stable code every filter matches on and
// is never translated; the label is looked up in the UI dictionaries, so the
// API and the web app can't disagree about what a term is called.

import { lookup } from "../src/i18n/core.ts";
import { DICTIONARIES } from "../src/i18n/dictionaries.ts";
import { type FacetField, facetKey } from "../src/i18n/facets.ts";
import { contentLocaleChain } from "./translations.ts";
import { VOCABULARY_LISTS } from "./vocabulary.generated.ts";

export interface VocabularyEntry {
  value: string;
  label: string;
}

export interface VocabularyLabels {
  locale: string;
  fields: Record<string, VocabularyEntry[]>;
}

// API filter name -> the UI dictionary's facet field.
const FACET_FOR: Record<string, FacetField> = {
  category: "category",
  region_primary: "region",
  timeframe: "timeframe",
  media_type: "media_type",
  palette: "palette",
  subject_type: "subject_type",
};

export function vocabularyLabels(locale: string | null): VocabularyLabels {
  const code = locale ?? "en";
  const chain = contentLocaleChain(code);
  const fields: Record<string, VocabularyEntry[]> = {};
  for (const [name, values] of Object.entries(VOCABULARY_LISTS)) {
    const facet = FACET_FOR[name];
    fields[name] = values.map((value) => {
      const key = facetKey(facet, value);
      const label = lookup(key, chain, DICTIONARIES);
      return { value, label: label === key ? value : label };
    });
  }
  return { locale: code, fields };
}
