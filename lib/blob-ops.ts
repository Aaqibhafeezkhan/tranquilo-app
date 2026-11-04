// Count Blob operations, because nothing did -- the Vercel dashboard once
// reported 7.6K of 10K Simple Operations with ten days left in the month,
// found out via email, since operations had been inferred from cache
// hits/misses (which undercounts: hits are an immutable 302 that never
// re-enters the function).
//
// Wraps put/head rather than placing counters at call sites, so a new
// call site is counted automatically. Counts failures too, since Vercel
// bills an operation whether or not it succeeds. Fire-and-forget and
// approximate by design: serving an image matters more than counting it, so
// a failing recorder is swallowed. Aggregated on write (one row per day/op),
// never a per-request log, same discipline as img_cache_stats.

import type { QuerySql } from "./img-store.ts";

// `record(op)` is injected rather than imported so this stays testable
// without a database.
type BlobFn = (...args: never[]) => unknown;

type BlobOpsDeps<P extends BlobFn, H extends BlobFn> = {
  put: P;
  head: H;
  record: (op: string) => unknown;
};

function makeCountedBlobOps<P extends BlobFn, H extends BlobFn>(
  deps: BlobOpsDeps<P, H>,
) {
  const put = deps.put;
  const head = deps.head;
  const record = deps.record;

  function count(op: string): void {
    try {
      const p = record(op);
      // Swallow both a rejected promise and a synchronous throw.
      if (p instanceof Promise) p.catch(() => {});
    } catch (_e) {
      /* counting must never break serving */
    }
  }

  // The count happens BEFORE awaiting, so an operation that throws is still
  // counted -- see the note above about billing.
  return {
    put: (...args: Parameters<P>): ReturnType<P> => {
      count("put");
      return Reflect.apply(put, null, args) as ReturnType<P>;
    },
    head: (...args: Parameters<H>): ReturnType<H> => {
      count("head");
      return Reflect.apply(head, null, args) as ReturnType<H>;
    },
  };
}

// Aggregated upsert, one row per (day, op). Mirrors bumpStat's shape.
async function recordBlobOp(
  sql: QuerySql | null | undefined,
  op: string,
): Promise<void> {
  if (!sql) return;
  await sql.query(
    "INSERT INTO blob_ops_stats (day, op, n) VALUES (CURRENT_DATE, $1, 1) " +
      "ON CONFLICT (day, op) DO UPDATE SET n = blob_ops_stats.n + 1",
    [op],
  );
}

// Month-to-date total, the number the Vercel quota is measured against.
// Returns null (not 0) when unreachable, since "no data" and "zero
// operations" mean very different things in an alert.
async function monthToDateOps(
  sql: QuerySql | null | undefined,
): Promise<number | null> {
  if (!sql) return null;
  try {
    const rows = (await sql.query(
      "SELECT COALESCE(SUM(n), 0)::bigint AS total FROM blob_ops_stats " +
        "WHERE day >= date_trunc('month', CURRENT_DATE)",
    )) as { total: string | number }[];
    if (!rows?.length) return 0;
    return Number(rows[0].total);
  } catch (_e) {
    return null;
  }
}

export { makeCountedBlobOps, monthToDateOps, recordBlobOp };
