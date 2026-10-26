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
        b.artist.length - a.artist.length,
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
): Rewrite[] {
  return rows
    .filter(
      (r) =>
        !isPlaceholder(r.artist) &&
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
