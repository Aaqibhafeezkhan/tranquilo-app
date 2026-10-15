// English UI strings -- the source of truth. MessageKey is derived from
// this object, so every t("...") call is checked against it at typecheck,
// and every other language's dictionary is typed as a partial copy of it
// (a misspelled key in a translation file fails typecheck too).
//
// Conventions:
//   - Keys are flat and namespaced by component: "upsell.cta".
//   - {name} placeholders are filled by t(key, { name }).
//   - Plurals are sibling keys ending in a CLDR plural category --
//     "works.count.one" / "works.count.other" -- looked up with
//     tn("works.count", n). Always include ".other".
//   - Plain text only. Components insert strings with textContent or
//     setAttribute, never innerHTML, so markup here would show literally.

export const en = {
  // <tranquilo-upsell-toast>
  "upsell.body":
    "Saved temporarily in this browser. Permanent collections and organization are part of Pro, still taking shape.",
  "upsell.cta": "Join the waitlist",
  "upsell.dismiss": "Dismiss",

  // Category chip row: the reset chip. Its filter value stays "All".
  "chips.all": "All",

  // Display labels for controlled-vocabulary values, keyed by facetKey()
  // (src/i18n/facets.ts) and rendered with facetLabel(). Every term in
  // shared/vocabulary.json needs one; tests/i18n-facets.test.ts enforces it.
  // English labels match the stored value except where the stored value is
  // a slug (subject_type).
  "facet.category.paintings-portraits": "Paintings & Portraits",
  "facet.category.sculpture-objects": "Sculpture & Objects",
  "facet.category.works-on-paper": "Works on Paper",
  "facet.category.arms-armor": "Arms & Armor",
  "facet.category.photography": "Photography",

  "facet.region.europe": "Europe",
  "facet.region.east-asia": "East Asia",
  "facet.region.south-asia": "South Asia",
  "facet.region.southeast-asia": "Southeast Asia",
  "facet.region.west-asia-middle-east": "West Asia & Middle East",
  "facet.region.africa": "Africa",
  "facet.region.americas": "Americas",
  "facet.region.oceania": "Oceania",

  "facet.timeframe.ancient-classical": "Ancient & Classical",
  "facet.timeframe.medieval": "Medieval",
  "facet.timeframe.renaissance": "Renaissance",
  "facet.timeframe.baroque-enlightenment": "Baroque & Enlightenment",
  "facet.timeframe.19th-century": "19th Century",
  "facet.timeframe.modern-contemporary": "Modern & Contemporary",

  "facet.media_type.painting": "Painting",
  "facet.media_type.print-drawing": "Print/Drawing",
  "facet.media_type.photograph": "Photograph",
  "facet.media_type.ceramic": "Ceramic",
  "facet.media_type.metalwork": "Metalwork",
  "facet.media_type.stone-sculpture": "Stone Sculpture",
  "facet.media_type.textile": "Textile",
  "facet.media_type.glass": "Glass",
  "facet.media_type.decorative-object": "Decorative Object",

  "facet.palette.red": "Red",
  "facet.palette.orange": "Orange",
  "facet.palette.gold-yellow": "Gold/Yellow",
  "facet.palette.green": "Green",
  "facet.palette.teal": "Teal",
  "facet.palette.blue": "Blue",
  "facet.palette.purple": "Purple",
  "facet.palette.pink": "Pink",
  "facet.palette.neutral": "Neutral",

  "facet.subject_type.portrait": "Portrait",
  "facet.subject_type.religious": "Religious",
  "facet.subject_type.landscape": "Landscape",
  "facet.subject_type.genre-scene": "Genre scene",
  "facet.subject_type.still-life": "Still life",
  "facet.subject_type.other": "Other",
} as const;

export type MessageKey = keyof typeof en;

/** A translation: any subset of the English keys. Missing keys fall back. */
export type Dictionary = Partial<Record<MessageKey, string>>;
