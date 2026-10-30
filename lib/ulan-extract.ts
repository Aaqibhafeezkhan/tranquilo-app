// Getty ULAN -- artist identity and name variants, so "Rembrandt van Rijn",
// "Rijn, Rembrandt van" and "Rembrandt" resolve to one person instead of
// splitting a Tea Voice cluster, the artist facet, and the feed's
// de-clustering. Licence is ODC-BY 1.0 (attribution required), unlike
// Wikidata's CC0.
//
// TERM.out is tab-delimited, 13 columns, no header:
//   col 3  = preferred flag (Y preferred, I inverted/index form, NA alternate)
//   col 10 = subject id
//   col 11 = term text

interface TermRow {
  subjectId: string;
  term: string;
  preferred: boolean;
}

interface SubjectRecord {
  preferredName: string | null;
  variants: string[];
}

interface UlanIndex {
  byNorm: Map<string, Set<string>>;
  bySubject: Map<string, SubjectRecord>;
}

interface LookupResult {
  ambiguous?: boolean;
  subjectIds?: string[];
  subjectId?: string;
  preferredName?: string | null;
  variants?: string[];
}

interface SubjectGroup {
  subjectId: string;
  preferredName: string | null;
  variants: string[];
  ourNames: string[];
}

const TERM_COLS = 13;
const COL_PREFERRED = 2;
const COL_SUBJECT = 9;
const COL_TERM = 10;

function parseTermRow(line: unknown): TermRow | null {
  if (!line) return null;
  const parts = String(line).split("\t");
  if (parts.length < TERM_COLS) return null;
  const subjectId = (parts[COL_SUBJECT] || "").trim();
  const term = (parts[COL_TERM] || "").trim();
  if (!subjectId || !term) return null;
  return {
    subjectId: subjectId,
    term: term,
    preferred: parts[COL_PREFERRED] === "Y",
  };
}

// Conservative on purpose: case, accents, punctuation and a trailing
// parenthetical are noise, but word order is NOT -- a token-sorting matcher
// once merged Dai Jin, Ma Lin and Lü Ji into one artist. Fusing two artists
// is worse than failing to merge them, since it looks like a success.
function normalise(name: unknown): string {
  return String(name || "")
    .replace(/\s*\([^)]*\)\s*$/, "") // trailing parenthetical only
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildIndex(terms: (TermRow | null)[] | null | undefined): UlanIndex {
  const byNorm = new Map<string, Set<string>>(); // normalised term -> Set(subjectId)
  const bySubject = new Map<string, SubjectRecord>(); // subjectId -> { preferredName, variants[] }
  (terms || []).forEach((t) => {
    if (!t) return;
    const key = normalise(t.term);
    if (!key) return;
    if (!byNorm.has(key)) byNorm.set(key, new Set());
    byNorm.get(key)?.add(t.subjectId);

    let rec = bySubject.get(t.subjectId);
    if (!rec) {
      rec = { preferredName: null, variants: [] };
      bySubject.set(t.subjectId, rec);
    }
    if (rec.variants.indexOf(t.term) === -1) rec.variants.push(t.term);
    if (t.preferred) rec.preferredName = t.term;
  });
  return { byNorm: byNorm, bySubject: bySubject };
}

// "Guercino (Giovanni Francesco Barbieri)": the full name in the
// parenthetical picks one of the alias's candidates. Dates never do.
function narrowByParenthetical(
  index: Pick<UlanIndex, "byNorm">,
  name: unknown,
  candidates: string[],
): string[] {
  const inner = String(name).match(/\(([^()]*)\)\s*$/)?.[1];
  if (!inner || /\d/.test(inner)) return candidates;
  const innerIds = index.byNorm.get(normalise(inner));
  const both = candidates.filter((id) => innerIds?.has(id));
  return both.length === 1 ? both : candidates;
}

// Two different people can carry the same term -- there is more than one
// Rembrandt in ULAN. Choosing one silently would fuse two artists in our
// catalogue, so an ambiguous name reports every candidate and NO subjectId,
// leaving nothing for a merge step to act on by accident.
const HEDGED_PARENTHETICAL =
  /\([^)]*(\?|\b(after|attributed|circle|copy|d'apres|d'après|follower|manner|mukaan|naar|nach|perhaps|possibly|probably|school|studio|style|toegeschreven|workshop|zugeschrieben)\b)[^)]*\)\s*$/i;

function lookup(index: UlanIndex, name: unknown): LookupResult | null {
  if (HEDGED_PARENTHETICAL.test(String(name))) return null;
  const ids = index.byNorm.get(normalise(name));
  if (!ids?.size) return null;
  let list = Array.from(ids);
  if (list.length > 1) list = narrowByParenthetical(index, name, list);
  if (list.length > 1) return { ambiguous: true, subjectIds: list };
  const subjectId = list[0] as string;
  const rec = index.bySubject.get(subjectId);
  return {
    subjectId: subjectId,
    preferredName: rec?.preferredName || null,
    variants: rec?.variants || [],
  };
}

// Which of OUR artist names are the same person. Groups of one are dropped --
// a "merge" of a single spelling is not a merge, and emitting it would bury
// the real ones.
function groupBySubject(
  index: UlanIndex,
  ourNames: string[] | null | undefined,
): SubjectGroup[] {
  const bySubject = new Map<string, SubjectGroup>();
  (ourNames || []).forEach((name) => {
    const hit = lookup(index, name);
    if (!hit || hit.ambiguous || !hit.subjectId) return;
    let g = bySubject.get(hit.subjectId);
    if (!g) {
      g = {
        subjectId: hit.subjectId,
        preferredName: hit.preferredName ?? null,
        variants: hit.variants ?? [],
        ourNames: [],
      };
      bySubject.set(hit.subjectId, g);
    }
    if (g.ourNames.indexOf(name) === -1) g.ourNames.push(name);
  });
  return Array.from(bySubject.values());
}

export type { LookupResult, SubjectGroup, TermRow, UlanIndex };
export { buildIndex, groupBySubject, lookup, normalise, parseTermRow };
