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

function requestHeaders(): any {
  return {
    "User-Agent": identity.WIKIMEDIA_USER_AGENT,
    "Accept": "application/sparql-results+json",
  };
}

// Consecutive, not lifetime. A success means the run is healthy again.
function makeBreaker(): any {
  return {
    consecutive: 0,
    fail: function (this: any) {
      this.consecutive++;
    },
    succeed: function (this: any) {
      this.consecutive = 0;
    },
    tripped: function (this: any) {
      return shouldStop(this.consecutive);
    },
  };
}
function shouldStop(consecutiveErrors: any): boolean {
  return consecutiveErrors >= ERROR_LIMIT;
}

function retryAfterMs(headers: any): any {
  const raw = headers?.get ? headers.get("retry-after") : null;
  if (!raw) return null;
  const secs = Number(raw);
  if (!Number.isFinite(secs) || secs <= 0) return null; // a date form, or nonsense
  return Math.round(secs * 1000);
}

// SPARQL string literals escape backslash and double-quote. An unescaped quote
// does not return nothing -- it is a malformed query, which WDQS counts as an
// ERROR against the budget.
function sparqlString(s: any): string {
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
function artistQuery(names: any): string {
  const values = (names || [])
    .map((n: any) => `"${sparqlString(n)}"@en`)
    .join(" ");
  return [
    "SELECT ?name ?via ?artist ?artistLabel ?artistDescription ?birth ?death",
    "       ?nationalityLabel ?movementLabel ?article ?image WHERE {",
    // The catalogue's name for an artist is often an alias rather than
    // Wikidata's main English label ("Rembrandt van Rijn" vs "Rembrandt"),
    // so both are matched. A property path in the same group as VALUES
    // keeps ?name bound for the lookup; a UNION of label/alias branches
    // did not, and scanned every alias (WDQS 504s even at 3 names).
    // ?via then says which matched, so parseArtists() can prefer a
    // main-label match when deciding between people.
    `  VALUES ?name { ${values} }`,
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

function year(iso: any): any {
  if (!iso) return null;
  const m = String(iso).match(/^(-?\d{4})/);
  return m ? m[1] : null;
}

function httpsify(url: any): any {
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
function parseArtists(json: any): any[] {
  const rows = json?.results?.bindings;
  if (!Array.isArray(rows)) return [];

  // name -> artist URI -> record
  const byName = new Map<string, Map<string, any>>();
  rows.forEach((b: any) => {
    const v = (k: any) => (b[k]?.value ? b[k].value : null);
    const name = v("name") || v("artistLabel");
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
        // Internal: did any row match this person on the main label?
        _byLabel: false,
      };
      people.set(key, rec);
    }
    if ((v("via") || "label") === "label") rec._byLabel = true;
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
  // matches: exactly one person whose label IS the name resolves it, even
  // if others carry it as an alias. Otherwise exactly one alias match
  // resolves it. Anything else is recorded as ambiguous, with every
  // contender kept and no facts of its own, rather than silently picking.
  const out: any[] = [];
  byName.forEach((people, name) => {
    const all = Array.from(people.values());
    const byLabel = all.filter((r: any) => r._byLabel);
    const contenders = byLabel.length ? byLabel : all;
    contenders.forEach((r: any) => {
      delete r._byLabel;
    });
    if (contenders.length === 1) {
      out.push(contenders[0]);
      return;
    }
    out.push({
      name,
      found: true,
      ambiguous: true,
      candidates: contenders.map((c: any) => ({
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
function mergeStore(existing: any, rows: any, missNames?: any): any {
  const out = Object.assign({}, existing || {});
  (rows || []).forEach((r: any) => {
    if (r?.name) out[r.name] = r;
  });
  // A miss is an answer too. Without recording it, every run re-queries the
  // names Wikidata has never heard of.
  (missNames || []).forEach((n: any) => {
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
  names: any,
  existing: any,
  opts: { recheckMisses?: boolean } = {},
): any[] {
  const have = existing || {};
  return (names || []).filter(
    (n: any) =>
      !have[n] || (opts.recheckMisses === true && have[n].found === false),
  );
}

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
