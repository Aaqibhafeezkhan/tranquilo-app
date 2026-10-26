// Which artist string can be recorded as raw for an existing row.

export interface RawCandidateRow {
  artist: string | null;
  created_at: Date;
}

// A value counts as raw when ingestion could not have rewritten it: the row
// predates canonicalisation, or no map ever produced that value.
export function rawArtistFor(
  row: RawCandidateRow,
  earliestAudited: string | undefined,
  everCanonical: ReadonlySet<string>,
  canonicalisedFrom: Date,
): string | null {
  const earliest = earliestAudited ?? row.artist;
  if (!earliest) return null;
  if (row.created_at < canonicalisedFrom) return earliest;
  return everCanonical.has(earliest) ? null : earliest;
}
