import { t } from "../i18n/index";

// Domain-style labels for the detail view's "View on X" source link.
// Separate from ExportService's EXPORT_SOURCE_NAMES, which holds full
// institutional names for a CSV rather than the actual host item.url points at.
const SOURCE_LINK_LABELS: Record<string, string> = {
  met: "metmuseum.org",
  cleveland: "clevelandart.org",
  // The project's name: "commons.wikimedia.org" is hard to read at a
  // glance, and "on" still reads naturally ("View on Wikimedia Commons").
  commons: "Wikimedia Commons",
  europeana: "europeana.eu",
  // The institution's name, not a domain -- digitalarchive.npm.gov.tw
  // reads as noise next to "National Palace Museum" the way it wouldn't
  // for, say, metmuseum.org. See SOURCE_LINK_PREPOSITIONS below for why
  // this one also gets "View AT" instead of "View on".
  npm: "National Palace Museum",
  // Same reasoning as npm above -- the brand name as it appears on
  // Wellcome's own About page ("Wellcome Collection"), not the bare
  // domain or the uncapitalized source id (the fallback below, before
  // this entry existed).
  wellcome: "Wellcome Collection",
  // nga.gov alone is ambiguous between several national galleries.
  nga: "National Gallery of Art",
  // The name the museum uses for itself day to day; the full name
  // (Museum of New Zealand Te Papa Tongarewa) is in the CSV export.
  tepapa: "Te Papa",
};

// Every other source's label is a domain ("View on metmuseum.org"), where
// "on" reads naturally. A named institution wants "at" instead ("View at
// the National Palace Museum" is what a person would actually say) --
// keyed separately, rather than baking a preposition into the label
// string itself, so a future domain-style source doesn't inherit "at" by
// copy-paste. Defaults to "on" for every source not listed here.
const SOURCE_LINK_PREPOSITIONS: Record<string, string> = {
  npm: "at",
  wellcome: "at",
  nga: "at",
  tepapa: "at",
  smithsonian: "at",
  tainacan: "at",
};

export function sourceLinkPreposition(item: any): string {
  return SOURCE_LINK_PREPOSITIONS[item?.source] || "on";
}

// The link's whole visible wording ("View on metmuseum.org"). One
// dictionary entry per preposition rather than "View" + preposition +
// label, since another language may need different word order or a
// single preposition for both.
export function sourceLinkText(item: any): string {
  return t(
    sourceLinkPreposition(item) === "at"
      ? "detail.sourceLink.at"
      : "detail.sourceLink.on",
    { institution: sourceLinkLabel(item) },
  );
}

// Europeana aggregates rather than holds: its `url` lands on a portal
// record that then points at whichever of roughly 26 institutions actually
// has the object. Every other source's `url` is the holding museum's own
// object page.
const SOURCE_IS_AGGREGATOR: Record<string, boolean> = { europeana: true };

// Falls back to the raw source string if a future source is added before
// SOURCE_LINK_LABELS is, so an unmapped source still shows something
// honest rather than a wrong institution name.
export function sourceLinkLabel(item: any): string {
  if (item?.source === "smithsonian") return smithsonianMuseum(item.url);
  if (item?.source === "tainacan") return tainacanMuseum(item.url);
  return SOURCE_LINK_LABELS[item?.source] || item?.source || "source";
}

// The Smithsonian is an umbrella over many museums, each with its own
// site, so one label for the whole source credits the wrong museum. The
// object page's host says which museum an item belongs to. Mirrors
// lib/institution-names.ts (server side); tests/institution-names.test.ts
// keeps the two identical.
export const SMITHSONIAN_MUSEUMS: Record<string, string> = {
  "asia.si.edu": "National Museum of Asian Art",
  "hirshhorn.si.edu": "Hirshhorn Museum and Sculpture Garden",
  "cooperhewitt.org": "Cooper Hewitt, Smithsonian Design Museum",
  "americanart.si.edu": "Smithsonian American Art Museum",
};

// Tainacan is the collections platform many Brazilian public museums
// publish on: one source, one museum per site, read from the same host.
// Mirrors lib/institution-names.ts the same way.
export const TAINACAN_MUSEUMS: Record<string, string> = {
  "acervo.margs.rs.gov.br": "Museu de Arte do Rio Grande do Sul",
  "museudoouro.acervos.museus.gov.br": "Museu do Ouro",
  "museuregionalcasadosottoni.acervos.museus.gov.br":
    "Museu Regional Casa dos Ottoni",
};

// Never a guessed museum: an unlisted host gets the umbrella name.
function museumByHost(
  url: unknown,
  museums: Record<string, string>,
  fallback: string,
): string {
  // A pattern rather than new URL(), which callers' test environments
  // (and old browsers) can't always be relied on to provide.
  const host = /^https?:\/\/([^/:?#]+)/i.exec(String(url ?? ""))?.[1];
  if (!host) return fallback;
  for (const [h, name] of Object.entries(museums)) {
    if (host === h || host.endsWith(`.${h}`)) return name;
  }
  return fallback;
}

export function smithsonianMuseum(url: unknown): string {
  return museumByHost(url, SMITHSONIAN_MUSEUMS, "Smithsonian Institution");
}

export function tainacanMuseum(url: unknown): string {
  return museumByHost(url, TAINACAN_MUSEUMS, "Brazilian museum collections");
}

export function isAggregatorSource(item: any): boolean {
  return !!SOURCE_IS_AGGREGATOR[item?.source];
}
