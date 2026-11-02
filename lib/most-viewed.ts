import type { QuerySql } from "./img-store.ts";
import { LIVE_ITEMS_PREDICATE } from "./items-sql.ts";

export interface MostViewedRow {
  source: string;
  native_id: string;
  title: string | null;
  artist: string | null;
  views: number | string;
}

interface MostViewedOptions {
  limit: number;
  since?: Date;
}

// A view is one page load, however many events it sent.
export async function mostViewedArtworks(
  sql: QuerySql,
  { limit, since }: MostViewedOptions,
): Promise<MostViewedRow[]> {
  const rows = await sql.query(
    `SELECT i.source, i.native_id, i.title, i.artist, v.views
       FROM (
         SELECT props->>'source' AS source,
                props->>'item_id' AS native_id,
                count(DISTINCT props->>'page_load_id') AS views
           FROM analytics_events
          WHERE event_name = 'artwork_view'
            AND props->>'page_load_id' IS NOT NULL
            AND ($2::timestamptz IS NULL OR created_at >= $2)
          GROUP BY 1, 2
       ) v
       JOIN items i ON i.source = v.source AND i.native_id = v.native_id
      WHERE ${LIVE_ITEMS_PREDICATE.replace(/\b(review_status|category)\b/g, "i.$1")}
      ORDER BY v.views DESC, i.source, i.native_id
      LIMIT $1`,
    [limit, since ? since.toISOString() : null],
  );
  return rows as MostViewedRow[];
}
