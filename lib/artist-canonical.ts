// Shared by the canonical-map build and the merge; they must agree.

export interface SpellingCount {
  artist: string;
  n: number;
}

const diacritics = (s: string) =>
  (s.normalize("NFD").match(/[̀-ͯ]/g) || []).length;
const bare = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const isDisplayOrder = (s: string) => !s.includes(",");
const hyphens = (s: string) => (s.match(/-/g) || []).length;
// No parenthetical, dates or non-Latin script: what a byline should read.
const isPlain = (s: string) =>
  !/[(\d]|[^\p{Script=Latin}\p{M}\p{P}\p{Zs}]/u.test(s);

export function flipSurnameFirst(name: string): string | null {
  const parts = name.split(",");
  if (parts.length !== 2) return null;
  const [surname, given] = parts.map((p) => p.trim());
  if (!surname || !given) return null;
  return `${given} ${surname}`;
}

// Accented form beats a more-used unaccented twin.
function ourChoice(rows: SpellingCount[]): string {
  const sorted = rows
    .slice()
    .sort(
      (a, b) =>
        Number(isPlain(b.artist)) - Number(isPlain(a.artist)) ||
        Number(isDisplayOrder(b.artist)) - Number(isDisplayOrder(a.artist)) ||
        b.n - a.n ||
        diacritics(b.artist) - diacritics(a.artist) ||
        b.artist.length - a.artist.length ||
        hyphens(b.artist) - hyphens(a.artist) ||
        (a.artist < b.artist ? -1 : a.artist > b.artist ? 1 : 0),
    );
  const top = sorted[0];
  const sameNameBetterAccents = sorted.find(
    (r) =>
      bare(r.artist) === bare(top.artist) &&
      diacritics(r.artist) > diacritics(top.artist),
  );
  return (sameNameBetterAccents || top).artist;
}

export interface Rewrite {
  from: string;
  to: string;
  items: number;
}

// Placeholder guard mirrors ingestion's canonical_artist().
const isPlaceholder = (s: string) => /^\s*(unknown|anonymous)/i.test(s);

export function planFromMap(
  rows: SpellingCount[],
  map: Record<string, string>,
  skip: ReadonlySet<string> = new Set(),
): Rewrite[] {
  return rows
    .filter(
      (r) =>
        !isPlaceholder(r.artist) &&
        !skip.has(r.artist) &&
        Object.hasOwn(map, r.artist) &&
        map[r.artist] !== r.artist,
    )
    .map((r) => ({ from: r.artist, to: map[r.artist], items: r.n }));
}

export interface CanonicalGroup {
  canonical: string;
  ourNames: string[];
  variants: string[];
}

const HEDGED =
  /^(after|attributed to|circle of|copy after|copy of|follower of|formerly attributed to|imitator of|manner of|school of|studio of|style of|workshop of)\b|\(\?\)\s*$/i;

// Computed over every ULAN subject, not only those we currently hold.
export function excludedVariants(
  subjects: { variants: Iterable<string> }[],
  ambiguous: Set<string>,
): Set<string> {
  const owners = new Map<string, number>();
  const excluded = new Set(ambiguous);
  for (const s of subjects) {
    for (const v of new Set(s.variants)) {
      owners.set(v, (owners.get(v) ?? 0) + 1);
      if (HEDGED.test(v.trim())) excluded.add(v);
    }
  }
  for (const [v, n] of owners) if (n > 1) excluded.add(v);
  return excluded;
}

// A variant naming two artists maps to neither.
export function buildCanonicalMap(
  groups: CanonicalGroup[],
  ambiguous: Set<string>,
): Record<string, string> {
  const claims = new Map<string, Set<string>>();
  for (const g of groups) {
    for (const v of g.variants) {
      const s = claims.get(v) ?? new Set<string>();
      s.add(g.canonical);
      claims.set(v, s);
    }
  }
  const map: Record<string, string> = {};
  for (const g of groups) {
    for (const v of g.variants) {
      if (HEDGED.test(v.trim())) continue;
      if (ambiguous.has(v) || (claims.get(v)?.size ?? 0) > 1) continue;
      map[v] = g.canonical;
    }
  }
  for (const g of groups) {
    for (const n of g.ourNames) map[n] = g.canonical;
  }
  return map;
}

// Hand-curated spellings ULAN cannot settle. A target must already be a
// canonical, so a typo cannot mint a new byline. A null target means the
// spelling is never mapped.
export type Aliases = Record<string, string | null>;

export function neverMapped(aliases: Aliases): Set<string> {
  return new Set(
    Object.entries(aliases)
      .filter(([, canonical]) => canonical === null)
      .map(([spelling]) => spelling),
  );
}

export function applyAliases(
  map: Record<string, string>,
  aliases: Aliases,
): Record<string, string> {
  const out = { ...map };
  for (const spelling of neverMapped(aliases)) delete out[spelling];
  const canonicals = new Set(Object.values(out));
  for (const [spelling, canonical] of Object.entries(aliases)) {
    if (canonical === null) continue;
    if (HEDGED.test(spelling.trim()))
      throw new Error(`alias "${spelling}" is a hedged attribution`);
    if (!canonicals.has(canonical))
      throw new Error(`alias target "${canonical}" is not a canonical name`);
    out[spelling] = canonical;
  }
  return out;
}

export function chooseCanonical(
  rows: SpellingCount[],
  ulanVariants: Iterable<string> = [],
): string | null {
  if (!rows.length) return null;
  const chosen = ourChoice(rows);
  if (isDisplayOrder(chosen)) return chosen;

  // Flip only when ULAN lists the flipped form.
  const flipped = flipSurnameFirst(chosen);
  if (!flipped) return chosen;
  const target = bare(flipped);
  for (const v of ulanVariants) {
    if (bare(v) === target) return flipped;
  }
  return chosen;
}
