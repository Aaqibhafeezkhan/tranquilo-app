// Keys for controlled-vocabulary display labels. A facet value such as
// category "Paintings & Portraits" is stored in English and doubles as the
// data key (API filters, shelf rules, the music-bucket map all match on it),
// so it is never translated in place. Its on-screen label is looked up
// under a key derived from it instead:
//   facetKey("category", "Paintings & Portraits")
//     -> "facet.category.paintings-portraits"
// Render with facetLabel() from ./index; keep passing the raw value to
// anything that filters or matches.
//
// Pure, like core.ts, so build-time and server code can reuse it.

export const FACET_FIELDS = [
  "category",
  "region",
  "timeframe",
  "media_type",
  "palette",
  "subject_type",
] as const;

export type FacetField = (typeof FACET_FIELDS)[number];

export function facetKey(field: FacetField, value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `facet.${field}.${slug}`;
}
