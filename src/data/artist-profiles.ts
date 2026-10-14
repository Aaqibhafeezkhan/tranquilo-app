// Prototype lookup for the artist profile card: joins directly against the
// existing offline Wikidata reference data by the catalogue's already-
// canonicalized item.artist string. No museum ID involved -- see the
// linked ticket for why that path isn't buildable from today's adapters.
//
// Bundles the whole reference file into the browser. That's fine for
// trying the feature out at today's size (a couple hundred names), but the
// ticket's intended shipped version reads from a precomputed Neon table
// instead, with no runtime/bundle-time file reads at all -- swap this
// module's internals for that without changing its exported shape.
import wikidataArtists from "../../data/reference/wikidata-artists.json";
import { isRealArtist, normalizeForSearch } from "../logic/logic";

export interface ArtistProfile {
  name: string;
  description: string | null;
  birth: string | null;
  death: string | null;
  nationality: string[];
  movement: string[];
  article: string | null;
  wikidata: string | null;
  image: string | null;
}

interface WikidataEntry {
  name: string;
  found: boolean;
  ambiguous?: boolean;
  description?: string;
  birth?: string | null;
  death?: string | null;
  nationality?: string[];
  movement?: string[];
  article?: string | null;
  wikidata?: string;
  image?: string | null;
}

const STORE = wikidataArtists as Record<string, WikidataEntry>;

function toProfile(entry: WikidataEntry): ArtistProfile {
  return {
    name: entry.name,
    description: entry.description ?? null,
    birth: entry.birth ?? null,
    death: entry.death ?? null,
    nationality: entry.nationality ?? [],
    movement: entry.movement ?? [],
    article: entry.article ?? null,
    wikidata: entry.wikidata ?? null,
    image: entry.image ?? null,
  };
}

// Ambiguous records (one name, several distinct people) and stored misses
// must never render -- a wrong birth year or bio is invisible once shown
// and worse than no card.
export function getArtistProfile(
  name: string | null | undefined,
): ArtistProfile | null {
  if (!isRealArtist(name)) return null;
  const entry = STORE[name as string];
  if (!entry?.found || entry.ambiguous) return null;
  return toProfile(entry);
}

// ---------------------------------------------------------------------------
// Search-query matching: does a free-text search ("gauguin") identify one
// held artist profile? Built once, from the small set of names we actually
// hold usable data for, not the whole store.
// ---------------------------------------------------------------------------

interface SearchIndexEntry {
  entry: WikidataEntry;
  normalizedFull: string;
  normalizedSurname: string;
}

let searchIndex: SearchIndexEntry[] | null = null;

function buildSearchIndex(): SearchIndexEntry[] {
  return Object.values(STORE)
    .filter((entry) => entry.found && !entry.ambiguous)
    .map((entry) => {
      const tokens = entry.name.trim().split(/\s+/);
      return {
        entry,
        normalizedFull: normalizeForSearch(entry.name),
        normalizedSurname: normalizeForSearch(tokens[tokens.length - 1]),
      };
    });
}

// Exact match only -- on the full name, or on a surname unique among held
// profiles (so "gauguin" finds Paul Gauguin, but a surname shared by two
// held artists matches neither, same "no card beats a wrong card" rule as
// getArtistProfile's ambiguous check). Never substring/fuzzy: a query that
// merely contains an artist's name is too weak a signal that the search is
// actually about that person.
export function findArtistProfileForQuery(
  query: string | null | undefined,
): ArtistProfile | null {
  if (!query?.trim()) return null;
  if (!searchIndex) searchIndex = buildSearchIndex();

  const q = normalizeForSearch(query);
  const fullMatch = searchIndex.find((e) => e.normalizedFull === q);
  if (fullMatch) return toProfile(fullMatch.entry);

  const surnameMatches = searchIndex.filter((e) => e.normalizedSurname === q);
  if (surnameMatches.length === 1) return toProfile(surnameMatches[0].entry);
  return null;
}
