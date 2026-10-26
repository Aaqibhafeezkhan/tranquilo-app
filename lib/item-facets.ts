// Facet filter SQL shared by api/items.ts and lib/shelves.ts.

// Whitelisted so an unknown key never names a column.
const FACETS = [
  "category",
  "timeframe",
  "palette",
  "media_type",
  "region_primary",
  "source",
  "subject_type",
  // Real color filter -- array-contains against palette_buckets, not
  // equality; see the special case in facetClauses() below.
  "palette_bucket",
] as const;

function facetClauses(
  filter: Record<string, unknown>,
  bind: (value: unknown) => string,
): string[] {
  const where: string[] = [];
  for (const facet of FACETS) {
    const value = filter[facet];
    if (value === undefined || value === null || value === "") continue;
    if (facet === "region_primary") {
      // Matches alternates too (GIN index, sql/006_items_region_alt.sql)
      // -- a Cypriot item can legitimately count under both Europe and
      // West Asia, so filtered counts can sum to more than the catalogue.
      const bound = bind(value);
      where.push(
        `(region_primary = ${bound} OR region_alt @> ARRAY[${bound}]::text[])`,
      );
      continue;
    }
    if (facet === "palette_bucket") {
      // palette_buckets is multi-valued (GIN index,
      // sql/038_items_palette_buckets.sql), so an item with both blue sky
      // and green grass matches a "Blue" filter and a "Green" one.
      where.push(`palette_buckets @> ARRAY[${bind(value)}]::text[]`);
      continue;
    }
    where.push(`${facet} = ${bind(value)}`);
  }
  return where;
}

export { FACETS, facetClauses };
