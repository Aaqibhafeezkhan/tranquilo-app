// Daily retention for visitor-keyed rows: denial counters are kept 30 days,
// per-day bucket rows for items budgets two days (their key changes daily, so
// older rows can never be read again).
//
// Required env vars: CRON_SECRET, DATABASE_URL.
import * as Sentry from "@sentry/node";
import type { CronRequest, CronResponse } from "../cron-types.ts";
import { getSql } from "../db.ts";
import { reportError } from "../sentry.ts";

const EVENT_RETENTION_DAYS = 30;
const BUCKET_RETENTION_DAYS = 2;

const MONITOR_SLUG = "prune-visitor-data";
const CRON_SCHEDULE = "37 4 * * *";
function monitorConfig() {
  return {
    schedule: { type: "crontab" as const, value: CRON_SCHEDULE },
    checkinMargin: 60,
    maxRuntime: 5,
    timezone: "UTC",
  };
}

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

  const checkInId = Sentry.captureCheckIn(
    { monitorSlug: MONITOR_SLUG, status: "in_progress" },
    monitorConfig(),
  );

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

    Sentry.captureCheckIn(
      { checkInId: checkInId, monitorSlug: MONITOR_SLUG, status: "ok" },
      monitorConfig(),
    );
    await Sentry.flush(2000);

    res.statusCode = 200;
    res.json({ events: events.length, buckets: buckets.length });
  } catch (err) {
    Sentry.captureCheckIn(
      { checkInId: checkInId, monitorSlug: MONITOR_SLUG, status: "error" },
      monitorConfig(),
    );
    await reportError(err);
    res.statusCode = 500;
    res.json({ error: "prune-visitor-data failed, see Sentry" });
  }
}
