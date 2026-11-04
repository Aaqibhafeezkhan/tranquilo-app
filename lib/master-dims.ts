import type { Sql } from "./db.ts";
import { LIVE_ITEMS_AND } from "./items-sql.ts";

export const MEASURABLE_SOURCES = ["met", "cleveland"];
export const DAILY_LIMIT = 1500;
export const MIN_INTERVAL_MS = 3000;
export const HEADER_BYTES = [65_536, 524_288];

// These end the whole run, not just the item.
export const STOP_STATUSES = [401, 403, 429, 503];
export const ERROR_LIMIT = 3;

const SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

export function assertSourceMeasurable(source: string) {
  if (!MEASURABLE_SOURCES.includes(String(source).toLowerCase())) {
    throw new Error(
      `refusing to measure '${source}': only ${MEASURABLE_SOURCES.join(", ")} are approved`,
    );
  }
}

export function jpegDimensions(
  bytes: Uint8Array,
): { width: number; height: number } | null {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) return null;
    const marker = bytes[i + 1];
    if (marker === 0xff) {
      i += 1;
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      i += 2;
      continue;
    }
    if (SOF_MARKERS.has(marker)) {
      return {
        height: (bytes[i + 5] << 8) | bytes[i + 6],
        width: (bytes[i + 7] << 8) | bytes[i + 8],
      };
    }
    i += 2 + ((bytes[i + 2] << 8) | bytes[i + 3]);
  }
  return null;
}

export function printTier(width: number, height: number): "A" | "B" | "C" {
  const shortEdge = Math.min(width, height);
  if (shortEdge >= 3000) return "A";
  if (shortEdge >= 1800) return "B";
  return "C";
}

export function unmeasuredItemsSql(): string {
  return `SELECT id, full_img FROM items
    WHERE source = $1
      AND master_dims_checked_at IS NULL
      AND full_img IS NOT NULL
      ${LIVE_ITEMS_AND}
    ORDER BY id
    LIMIT $2`;
}

// Rolling 20h window lets the next day's run start earlier.
const CHECKED_TODAY_SQL = `SELECT count(*)::int AS n FROM items
  WHERE source = $1 AND master_dims_checked_at > now() - interval '20 hours'`;

const RECORD_SQL = `UPDATE items
  SET master_width = $2, master_height = $3, master_dims_checked_at = now()
  WHERE id = $1`;

async function readHeader(
  fetchImpl: typeof fetch,
  url: string,
  headers: Record<string, string>,
): Promise<{ status: number; dims: { width: number; height: number } | null }> {
  let status = 0;
  for (const bytes of HEADER_BYTES) {
    const res = await fetchImpl(url, {
      headers: { ...headers, Range: `bytes=0-${bytes - 1}` },
    });
    status = res.status;
    if (!res.ok) return { status, dims: null };
    const dims = jpegDimensions(new Uint8Array(await res.arrayBuffer()));
    if (dims) return { status, dims };
  }
  return { status, dims: null };
}

export async function measureBatch(opts: {
  sql: Sql;
  source: string;
  commit: boolean;
  fetchImpl?: typeof fetch;
  headers?: Record<string, string>;
  dailyLimit?: number;
  intervalMs?: number;
  shouldStop?: () => boolean;
  sleepMs?: (ms: number) => Promise<void>;
  onProgress?: (line: string) => void;
}) {
  assertSourceMeasurable(opts.source);
  const sql = opts.sql;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const dailyLimit = Math.min(opts.dailyLimit ?? DAILY_LIMIT, DAILY_LIMIT);
  const interval = Math.max(
    opts.intervalMs ?? MIN_INTERVAL_MS,
    MIN_INTERVAL_MS,
  );
  const sleep =
    opts.sleepMs ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const shouldStop = opts.shouldStop ?? (() => false);
  const log = opts.onProgress ?? (() => {});

  const [{ n: checkedToday }] = await sql.query(CHECKED_TODAY_SQL, [
    opts.source,
  ]);
  const allowance = Math.max(0, dailyLimit - checkedToday);
  const work = allowance
    ? await sql.query(unmeasuredItemsSql(), [opts.source, allowance])
    : [];
  log(
    `${opts.source}: ${checkedToday} checked in the last 20h, ` +
      `${work.length} to measure now, ${interval}ms apart ` +
      `(~${((work.length * interval) / 3_600_000).toFixed(1)}h)`,
  );

  const result = {
    planned: work.length,
    measured: 0,
    unreadable: 0,
    tiers: { A: 0, B: 0, C: 0 },
    stoppedBy: null as string | null,
  };
  if (!opts.commit) return result;

  let consecutiveErrors = 0;
  for (const [index, row] of work.entries()) {
    if (shouldStop()) {
      result.stoppedBy = "interrupted";
      break;
    }
    if (index > 0) await sleep(interval);
    try {
      const { status, dims } = await readHeader(
        fetchImpl,
        row.full_img,
        opts.headers ?? {},
      );
      if (STOP_STATUSES.includes(status)) {
        result.stoppedBy = `HTTP ${status} on ${row.id}`;
        break;
      }
      await sql.query(RECORD_SQL, [
        row.id,
        dims?.width ?? null,
        dims?.height ?? null,
      ]);
      consecutiveErrors = 0;
      if (dims) {
        result.measured++;
        result.tiers[printTier(dims.width, dims.height)]++;
      } else {
        result.unreadable++;
        log(`  unreadable ${row.id} (HTTP ${status})`);
      }
    } catch (err) {
      consecutiveErrors++;
      log(`  ERR ${row.id} -- ${String((err as Error)?.message || err)}`);
      if (consecutiveErrors >= ERROR_LIMIT) {
        result.stoppedBy = `${ERROR_LIMIT} consecutive network errors`;
        break;
      }
    }
    if ((index + 1) % 100 === 0) {
      log(`  ${index + 1}/${work.length} ${JSON.stringify(result.tiers)}`);
    }
  }
  return result;
}
