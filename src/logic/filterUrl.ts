import { MAX_QUERY_CHARS } from "../../lib/query-limits";
import type { ActiveConcept } from "../app/SearchController";

export interface FilterUrlSource {
  category: string;
  artist: string | null;
  search: string | null;
  concept: ActiveConcept | null;
  collectionFilter: boolean;
  storylineFilter: boolean;
  paletteBucket: string | null;
  source: string | null;
}

export interface AllowedFilterValues {
  categories: readonly string[];
  sources: readonly string[];
  paletteBuckets: readonly string[];
}

export interface ParsedFilters {
  query: string | null;
  artist: string | null;
  category: string;
  source: string | null;
  paletteBucket: string | null;
  storylineFilter: boolean;
}

// The personal collection view is deliberately absent: it is per-device
// and would mean nothing to whoever opens the link.
export function filterQueryString(state: FilterUrlSource): string {
  if (state.collectionFilter) return "";
  const params = new URLSearchParams();
  const query = state.search ?? state.concept?.query ?? null;
  if (query) {
    params.set("q", query);
  } else if (state.artist) {
    params.set("artist", state.artist);
  } else if (state.category !== "All") {
    params.set("category", state.category);
  }
  if (state.source) params.set("source", state.source);
  if (state.paletteBucket) params.set("palette", state.paletteBucket);
  if (state.storylineFilter) params.set("storylines", "1");
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function parseFilterQuery(
  search: string,
  allowed: AllowedFilterValues,
): ParsedFilters {
  const params = new URLSearchParams(search);
  const text = (key: string): string | null => {
    const value = params.get(key)?.trim().slice(0, MAX_QUERY_CHARS);
    return value ? value : null;
  };
  const oneOf = (value: string | null, options: readonly string[]) =>
    value !== null && options.includes(value) ? value : null;

  const query = text("q");
  return {
    query,
    artist: query ? null : text("artist"),
    category: oneOf(text("category"), allowed.categories) ?? "All",
    source: oneOf(text("source"), allowed.sources),
    paletteBucket: oneOf(text("palette"), allowed.paletteBuckets),
    storylineFilter: params.get("storylines") === "1",
  };
}
