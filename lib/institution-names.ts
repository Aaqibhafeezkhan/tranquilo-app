// Full institution names for share-page attribution ("via ..."). The
// browser keeps its own copies for the source link and CSV export in
// src/app/sourceLinks.ts and src/app/ExportService.ts, since src/ never
// imports from lib/; tests/institution-names.test.ts keeps the Smithsonian
// and Tainacan museum lists identical in both places.

const INSTITUTION_NAMES: Record<string, string> = {
  met: "The Metropolitan Museum of Art",
  cleveland: "Cleveland Museum of Art",
  commons: "Wikimedia Commons",
  europeana: "Europeana",
  npm: "National Palace Museum",
  wellcome: "Wellcome Collection",
  nga: "National Gallery of Art",
  tepapa: "Museum of New Zealand Te Papa Tongarewa",
};

// The Smithsonian is an umbrella over many museums, each with its own
// site, so one name for the whole source credits the wrong museum. The
// object page's host says which museum an item belongs to.
const SMITHSONIAN_MUSEUMS: Record<string, string> = {
  "asia.si.edu": "National Museum of Asian Art",
  "hirshhorn.si.edu": "Hirshhorn Museum and Sculpture Garden",
  "cooperhewitt.org": "Cooper Hewitt, Smithsonian Design Museum",
  "americanart.si.edu": "Smithsonian American Art Museum",
};
const SMITHSONIAN_FALLBACK = "Smithsonian Institution";

// Tainacan is the collections platform many Brazilian public museums
// publish on; one source, one museum per site, read from the same host.
const TAINACAN_MUSEUMS: Record<string, string> = {
  "acervo.margs.rs.gov.br": "Museu de Arte do Rio Grande do Sul",
  "museudoouro.acervos.museus.gov.br": "Museu do Ouro",
  "museuregionalcasadosottoni.acervos.museus.gov.br":
    "Museu Regional Casa dos Ottoni",
};
const TAINACAN_FALLBACK = "Brazilian museum collections";

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

function smithsonianMuseum(url: unknown): string {
  return museumByHost(url, SMITHSONIAN_MUSEUMS, SMITHSONIAN_FALLBACK);
}

// Falls back to the raw source string, never to a specific institution --
// wrong-but-honest beats wrong-but-confident for attribution.
function institutionName(item: { source?: string; url?: unknown }): string {
  if (item.source === "smithsonian") return smithsonianMuseum(item.url);
  if (item.source === "tainacan") {
    return museumByHost(item.url, TAINACAN_MUSEUMS, TAINACAN_FALLBACK);
  }
  return INSTITUTION_NAMES[item.source || ""] || item.source || "";
}

export {
  INSTITUTION_NAMES,
  institutionName,
  SMITHSONIAN_MUSEUMS,
  TAINACAN_MUSEUMS,
};
