import type { Sql } from "./db.ts";

// Server-side access to ambient-music buckets (in Postgres, see
// sql/023_music_buckets.sql/sql/024_music_buckets_seed.sql).
//
// getMusicBuckets() takes an already-open `sql` client, same reasoning as
// lib/storylines.ts/lib/shelves.ts.
//
// Returns buckets keyed by `key`, not an array, matching how
// TranquiloMusicToggle.ts always looks one up. No separate category->bucket
// map in the response either: each bucket carries its own `category`, and a
// hand-written duplicate of that 1:1 relationship used to drift -- the
// caller derives it with one reduce instead.
interface MusicBucketRow {
  key: string;
  label: string;
  category: string;
  track: string;
  credit: string;
  credit_url: string | null;
  license: string;
}

interface MusicBucket {
  label: string;
  category: string;
  track: string;
  credit: string;
  creditUrl: string | null;
  license: string;
}

async function getMusicBuckets(sql: Sql): Promise<Record<string, MusicBucket>> {
  const rows = (await sql`SELECT * FROM music_buckets`) as MusicBucketRow[];
  const buckets: Record<string, MusicBucket> = {};
  rows.forEach((row) => {
    buckets[row.key] = {
      label: row.label,
      category: row.category,
      track: row.track,
      credit: row.credit,
      creditUrl: row.credit_url,
      license: row.license,
    };
  });
  return buckets;
}

export { getMusicBuckets };
