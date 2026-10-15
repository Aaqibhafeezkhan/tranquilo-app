// Shared license slug -> {label, deed link} lookup. Used by
// TranquiloDetailModal.ts (per-item license row) and errorState.ts (the
// 404/outage template), so the two never drift into naming a license
// two different ways.
export const LICENSE_LABELS: Record<string, [string, string | null]> = {
  "cc0": ["CC0 1.0", "https://creativecommons.org/publicdomain/zero/1.0/"],
  "public-domain": ["Public domain", null],
  "public-domain-mark": [
    "Public Domain Mark",
    "https://creativecommons.org/publicdomain/mark/1.0/",
  ],
  "cc-by": ["CC BY", "https://creativecommons.org/licenses/by/4.0/"],
  "cc-by-3.0": ["CC BY 3.0", "https://creativecommons.org/licenses/by/3.0/"],
  "cc-by-4.0": ["CC BY 4.0", "https://creativecommons.org/licenses/by/4.0/"],
  "cc-by-sa": ["CC BY-SA", "https://creativecommons.org/licenses/by-sa/4.0/"],
  "cc-by-sa-3.0": [
    "CC BY-SA 3.0",
    "https://creativecommons.org/licenses/by-sa/3.0/",
  ],
  "cc-by-sa-4.0": [
    "CC BY-SA 4.0",
    "https://creativecommons.org/licenses/by-sa/4.0/",
  ],
  // Taiwan's Open Government Data License 1.0 (npm.py's National Palace
  // Museum adapter) -- not a Creative Commons instrument, so no
  // creativecommons.org deed exists for it. Linked to the license's own
  // authoritative government page instead, the same one npm.py's
  // LICENSE_CHECK gates on and every item's raw `license` field before
  // harmonize's license.canonical rule rewrites it to this slug.
  "open-government-data-license-1.0": [
    "Open Government Data License 1.0",
    "https://data.gov.tw/license",
  ],
  // Works from Ibram (Brazil's federal museums institute) collections. The
  // works are out of copyright, but each museum attaches its own reuse terms
  // to the images -- credit "<museum>/Ibram", and commercial use goes through
  // an Ibram authorization -- so this is not presented as Creative Commons.
  // The link is per museum; see IBRAM_TERMS_PAGES below.
  "public-domain-ibram": ["Public domain (Ibram reuse terms)", null],
};

// Each Ibram museum publishes its reproduction terms on its own site.
// Keyed by the object page's host; an unlisted museum gets no link rather
// than another museum's terms.
const IBRAM_TERMS_PAGES: Record<string, string> = {
  "museudoouro.acervos.museus.gov.br":
    "https://museudoouro.acervos.museus.gov.br/reproducao-de-imagens-do-acervo/",
  "museuregionalcasadosottoni.acervos.museus.gov.br":
    "https://museuregionalcasadosottoni.acervos.museus.gov.br/reproducao-de-imagens/",
};

function ibramTermsPage(url: unknown): string | null {
  const host = /^https?:\/\/([^/:?#]+)/i.exec(String(url ?? ""))?.[1];
  return (host && IBRAM_TERMS_PAGES[host]) || null;
}

// Falls through to the raw slug for an unmapped value rather than hiding
// it -- showing something unrecognized beats silently dropping the one
// field that tells someone their rights.
// `itemUrl` (the item's object page) is only read for a license whose terms
// page differs per institution.
export function licenseLabel(
  raw: string | null | undefined,
  itemUrl?: unknown,
): {
  label: string;
  deed: string | null;
} {
  const value = (raw ? String(raw) : "").trim();
  if (!value) return { label: "", deed: null };
  if (value.toLowerCase() === "public-domain-ibram") {
    return {
      label: LICENSE_LABELS["public-domain-ibram"][0],
      deed: ibramTermsPage(itemUrl),
    };
  }
  const entry = LICENSE_LABELS[value.toLowerCase()];
  return entry
    ? { label: entry[0], deed: entry[1] }
    : { label: value, deed: null };
}
