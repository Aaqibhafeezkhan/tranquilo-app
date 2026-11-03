// Daily retention for visitor-keyed rows: denial counters are kept 30 days,
// per-day bucket rows for items budgets two days (their key changes daily, so
// older rows can never be read again).
//
// Required env vars: CRON_SECRET, DATABASE_URL.
import type { CronRequest, CronResponse } from "../cron-types.ts";
import { getSql } from "../db.ts";

const EVENT_RETENTION_DAYS = 30;
const BUCKET_RETENTION_DAYS = 2;

export default async function handler(req: CronRequest, res: CronResponse) {
  const auth = req.headers?.authorization || "";
  if (
    !process.env.CRON_SECRET ||
    auth !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    res.statusCode = 401;
    res.json({ error: "Unauthorized" });
    return;
  }
  try {
    const sql = getSql();
    if (!sql) throw new Error("DATABASE_URL is not set");
    const events = (await sql.query(
      "DELETE FROM items_budget_events " +
        "WHERE day < (now() AT TIME ZONE 'UTC')::date - $1::int RETURNING 1",
      [EVENT_RETENTION_DAYS],
    )) as unknown[];
    const buckets = (await sql.query(
      "DELETE FROM visitor_fetch_state " +
        "WHERE ip LIKE 'items:%' " +
        "AND updated_at < now() - make_interval(days => $1::int) RETURNING 1",
      [BUCKET_RETENTION_DAYS],
    )) as unknown[];
    res.statusCode = 200;
    res.json({ events: events.length, buckets: buckets.length });
  } catch (err) {
    res.statusCode = 500;
    res.json({ error: err instanceof Error ? err.message : "prune failed" });
  }
}
