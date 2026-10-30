// Wikidata Query Service client -- artist identity cluster research.
//
// Compliant with WDQS's published rules: identifies via
// lib/source-identity.ts's Wikimedia-shaped User-Agent; the breaker
// opens after 3 CONSECUTIVE failures (WDQS allows 30/minute and can
// only ban the whole User-Agent or throttle globally, and we have one
// Wikimedia identity, so an error storm here would cost Commons access
// too); one query at a time with a gap between them; Retry-After is
// honoured when sent.
//
// Wikidata's structured data is CC0, so every result (including a
// confirmed "no such artist") is stored and never re-requested.

import * as identity from "./source-identity.ts";

const ENDPOINT = "https://query.wikidata.org/sparql";
const ERROR_LIMIT = 3; // WDQS allows 30/min; this is deliberately far under
const MIN_INTERVAL_MS = 2000; // one at a time, with air between

interface SparqlBinding {
  [variable: string]: { value?: string } | undefined;
}

interface SparqlResponse {
  results?: { bindings?: SparqlBinding[] };
}

interface ArtistCandidate {
  wikidata: string | null;
  description: string | null;
  birth: string | null;
  death: string | null;
  article: string | null;
}

// One shape for found, ambiguous and missed answers: stored entries are read
// back by callers that branch on `found` / `ambiguous`, not on a tag.
interface ArtistEntry extends Partial<ArtistCandidate> {
  name?: string;
  found?: boolean;
  fetched_at?: string;
  label?: string | null;
  nationality?: string[];
  movement?: string[];
  image?: string | null;
  ambiguous?: boolean;
  candidates?: ArtistCandidate[];
}

interface ArtistRecord extends ArtistEntry {
  name: string;
  wikidata: string | null;
  description: string | null;
  birth: string | null;
  death: string | null;
  article: string | null;
  label: string | null;
  nationality: string[];
  movement: string[];
  image: string | null;
  found: true;
  _byLabel?: boolean;
  _exact?: boolean;
}

type ArtistStore = Record<string, ArtistEntry>;

interface Breaker {
  consecutive: number;
  fail(): void;
  succeed(): void;
  tripped(): boolean;
}

function requestHeaders(): Record<string, string> {
  return {
    "User-Agent": identity.WIKIMEDIA_USER_AGENT,
    "Accept": "application/sparql-results+json",
  };
}

// Consecutive, not lifetime. A success means the run is healthy again.
function makeBreaker(): Breaker {
  return {
    consecutive: 0,
    fail: function (this: Breaker) {
      this.consecutive++;
    },
    succeed: function (this: Breaker) {
      this.consecutive = 0;
    },
    tripped: function (this: Breaker) {
      return shouldStop(this.consecutive);
    },
  };
}
function shouldStop(consecutiveErrors: number): boolean {
  return consecutiveErrors >= ERROR_LIMIT;
}

function retryAfterMs(
  headers: { get(name: string): string | null } | null | undefined,
): number | null {
  const raw = headers?.get ? headers.get("retry-after") : null;
  if (!raw) return null;
  const secs = Number(raw);
  if (!Number.isFinite(secs) || secs <= 0) return null; // a date form, or nonsense
  return Math.round(secs * 1000);
}

// SPARQL string literals escape backslash and double-quote. An unescaped quote
// does not return nothing -- it is a malformed query, which WDQS counts as an
// ERROR against the budget.
function sparqlString(s: unknown): string {
  return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

// Art occupations, since rdfs:label alone matches ANY human with that
// English label (a name-only query once matched the wrong person for
// most names).
//
// Q1028181 painter, Q11569986 printmaker, Q1281618 sculptor,
// Q33231 photographer, Q483501 artist, Q15296811 draughtsperson,
// Q644687 illustrator, Q1925963 graphic artist.
const ART_OCCUPATIONS = [
  "wd:Q1028181",
  "wd:Q11569986",
  "wd:Q1281618",
  "wd:Q33231",
  "wd:Q483501",
  "wd:Q15296811",
  "wd:Q644687",
  "wd:Q1925963",
];

// Facts plus the two citable URLs. The Wikidata item is the fact source; the
// Wikipedia article is where the narrative material lives, which is the half
// that actually makes a Tea Voice caption rather than a wall label.
// Every word capitalised: "Rembrandt van Rijn" -> "Rembrandt Van Rijn".
// Wikidata matches labels and aliases case-sensitively, and catalogues
// disagree about particles (van, de, della), so a lower-case particle on
// our side can miss an alias that capitalises it.
function capitalisedVariant(name: string): string {
  return name
    .split(" ")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function artistQuery(names: string[] | null | undefined): string {
  // (?asked ?name) pairs: the catalogue's name, and each spelling tried for
  // it. ?asked travels with every match so it's filed under our spelling.
  const lit = (s: unknown) => `"${sparqlString(s)}"@en`;
  const values = (names || [])
    .flatMap((n) => {
      const variant = capitalisedVariant(String(n));
      const pairs = [`(${lit(n)} ${lit(n)})`];
      if (variant !== n) pairs.push(`(${lit(n)} ${lit(variant)})`);
      return pairs;
    })
    .join(" ");
  return [
    "SELECT ?asked ?name ?via ?artist ?artistLabel ?artistDescription ?birth ?death",
    "       ?nationalityLabel ?movementLabel ?article ?image WHERE {",
    // The catalogue's name for an artist is often an alias rather than
    // Wikidata's main English label ("Rembrandt van Rijn" vs "Rembrandt"),
    // so both are matched. A property path in the same group as VALUES
    // keeps ?name bound for the lookup; a UNION of label/alias branches
    // did not, and scanned every alias (WDQS 504s even at 3 names).
    // ?via then says which matched, so parseArtists() can prefer a
    // main-label match when deciding between people.
    `  VALUES (?asked ?name) { ${values} }`,
    "  ?artist rdfs:label|skos:altLabel ?name .",
    "  ?artist wdt:P31 wd:Q5 .", // human: a museum must not match a name
    // and an artist, not a badminton player. FILTER EXISTS rather than a
    // join, so an artist with several art occupations is still one row.
    "  FILTER EXISTS {",
    "    ?artist wdt:P106 ?occupation .",
    `    VALUES ?occupation { ${ART_OCCUPATIONS.join(" ")} }`,
    "  }",
    '  BIND(IF(EXISTS { ?artist rdfs:label ?name }, "label", "alias") AS ?via)',
    "  OPTIONAL { ?artist wdt:P569 ?birth }",
    "  OPTIONAL { ?artist wdt:P570 ?death }",
    "  OPTIONAL { ?artist wdt:P27 ?nationality }",
    "  OPTIONAL { ?artist wdt:P135 ?movement }",
    "  OPTIONAL { ?artist wdt:P18 ?image }", // portrait/depiction, Commons-hosted
    "  OPTIONAL {",
    "    ?article schema:about ?artist ;",
    "             schema:isPartOf <https://en.wikipedia.org/> .",
    "  }",
    '  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }',
    "}",
  ].join("\n");
}

function year(iso: unknown): string | null {
  if (!iso) return null;
  const m = String(iso).match(/^(-?\d{4})/);
  return m ? m[1] : null;
}

function httpsify(url: unknown): string | null {
  if (!url) return null;
  return String(url).replace(/^http:/, "https:");
}

// Wikidata returns one row per combination -- an artist with two
// nationalities and two movements arrives as four rows sharing one
// ?artist URI -- so rows are grouped by artist and multi-valued fields
// collected, rather than keeping only the last row seen.
//
// Results are keyed by the name we ASKED for (?name), not by Wikidata's
// label: an alias match ("Rembrandt van Rijn" -> label "Rembrandt") must
// land under the catalogue's spelling, or the card's exact-name lookup
// never finds it. Wikidata's own label is kept as `label`. Old-style
// result rows without ?name/?via are read as label matches.
function parseArtists(json: SparqlResponse | null | undefined): ArtistEntry[] {
  const rows = json?.results?.bindings;
  if (!Array.isArray(rows)) return [];

  // name -> artist URI -> record
  const byName = new Map<string, Map<string, ArtistRecord>>();
  rows.forEach((b) => {
    const v = (k: string): string | null => b[k]?.value || null;
    // Old-style rows (no ?asked/?name) are label matches on the label.
    const name = v("asked") || v("name") || v("artistLabel");
    const key = v("artist") || v("artistLabel");
    if (!name || !key) return;

    let people = byName.get(name);
    if (!people) {
      people = new Map();
      byName.set(name, people);
    }
    let rec = people.get(key);
    if (!rec) {
      rec = {
        name,
        label: v("artistLabel"),
        wikidata: v("artist"),
        description: v("artistDescription"),
        birth: year(v("birth")),
        death: year(v("death")),
        nationality: [],
        movement: [],
        article: v("article"),
        // Special:FilePath is what Commons resolves directly to file bytes,
        // so this is usable as an <img src> with no further lookup -- but
        // WDQS returns it as http:, and the browser page is https:, so a
        // plain <img> would be a mixed-content block without this rewrite.
        image: httpsify(v("image")),
        found: true,
        fetched_at: new Date().toISOString(),
        // Internal: did any row match this person on the main label, and
        // did any match our spelling exactly (not a capitalised variant)?
        _byLabel: false,
        _exact: false,
      };
      people.set(key, rec);
    }
    if ((v("via") || "label") === "label") rec._byLabel = true;
    if (!v("asked") || v("asked") === v("name")) rec._exact = true;
    // Later rows may carry a value an earlier one lacked.
    if (!rec.article) rec.article = v("article");
    if (!rec.image) rec.image = httpsify(v("image"));
    if (!rec.description) rec.description = v("artistDescription");
    if (!rec.birth) rec.birth = year(v("birth"));
    if (!rec.death) rec.death = year(v("death"));

    const nat = v("nationalityLabel");
    if (nat && rec.nationality.indexOf(nat) === -1) rec.nationality.push(nat);
    const mov = v("movementLabel");
    if (mov && rec.movement.indexOf(mov) === -1) rec.movement.push(mov);
  });

  // Two painters can share a name. Main-label matches outrank alias-only
  // matches, and within either, our exact spelling outranks a capitalised
  // variant: exactly one person left at the top tier resolves it.
  // Anything else is recorded as ambiguous, with every contender kept and
  // no facts of its own, rather than silently picking.
  const out: ArtistEntry[] = [];
  byName.forEach((people, name) => {
    const all = Array.from(people.values());
    const byLabel = all.filter((r) => r._byLabel);
    const tier = byLabel.length ? byLabel : all;
    // Within that tier, our exact spelling outranks a capitalised variant.
    const exact = tier.filter((r) => r._exact);
    const contenders = exact.length ? exact : tier;
    all.forEach((r) => {
      delete r._byLabel;
      delete r._exact;
    });
    if (contenders.length === 1) {
      out.push(contenders[0]);
      return;
    }
    out.push({
      name,
      found: true,
      ambiguous: true,
      candidates: contenders.map((c) => ({
        wikidata: c.wikidata,
        description: c.description,
        birth: c.birth,
        death: c.death,
        article: c.article,
      })),
      fetched_at: new Date().toISOString(),
    });
  });
  return out;
}

// Merge, never replace. Overwriting the store would throw away every earlier
// query and make us re-ask Wikimedia for answers we already hold.
function mergeStore(
  existing: ArtistStore | null | undefined,
  rows: ArtistEntry[] | null | undefined,
  missNames?: string[] | null,
): ArtistStore {
  const out: ArtistStore = Object.assign({}, existing || {});
  (rows || []).forEach((r) => {
    if (r?.name) out[r.name] = r;
  });
  // A miss is an answer too. Without recording it, every run re-queries the
  // names Wikidata has never heard of.
  (missNames || []).forEach((n) => {
    if (!out[n])
      out[n] = { name: n, found: false, fetched_at: new Date().toISOString() };
  });
  return out;
}

// A stored answer is never re-asked -- except, when explicitly requested,
// a stored miss: matching has changed since some misses were recorded
// (aliases are matched now), so they're worth exactly one more question.
// Ambiguous names stay as they are; asking again can't make them less so.
function namesToFetch(
  names: string[] | null | undefined,
  existing: ArtistStore | null | undefined,
  opts: { recheckMisses?: boolean } = {},
): string[] {
  const have = existing || {};
  return (names || []).filter(
    (n) => !have[n] || (opts.recheckMisses === true && have[n].found === false),
  );
}

export type {
  ArtistCandidate,
  ArtistEntry,
  ArtistRecord,
  ArtistStore,
  Breaker,
  SparqlResponse,
};
export {
  ART_OCCUPATIONS,
  artistQuery,
  ENDPOINT,
  ERROR_LIMIT,
  MIN_INTERVAL_MS,
  makeBreaker,
  mergeStore,
  namesToFetch,
  parseArtists,
  requestHeaders,
  retryAfterMs,
  shouldStop,
};
