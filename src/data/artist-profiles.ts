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
import { isRealArtist } from "../logic/logic";

export interface ArtistProfile {
  name: string;
  description: string | null;
  birth: string | null;
  death: string | null;
  nationality: string[];
  movement: string[];
  article: string | null;
  wikidata: string | null;
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
}

const STORE = wikidataArtists as Record<string, WikidataEntry>;

// Ambiguous records (one name, several distinct people) and stored misses
// must never render -- a wrong birth year or bio is invisible once shown
// and worse than no card.
export function getArtistProfile(
  name: string | null | undefined,
): ArtistProfile | null {
  if (!isRealArtist(name)) return null;
  const entry = STORE[name as string];
  if (!entry?.found || entry.ambiguous) return null;
  return {
    name: entry.name,
    description: entry.description ?? null,
    birth: entry.birth ?? null,
    death: entry.death ?? null,
    nationality: entry.nationality ?? [],
    movement: entry.movement ?? [],
    article: entry.article ?? null,
    wikidata: entry.wikidata ?? null,
  };
}
