import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { makeSql } from "./helpers/pg.ts";

const db = vi.hoisted(() => ({ sql: null as any }));

vi.mock("../lib/db.ts", () => ({ getSql: () => db.sql }));
vi.mock("../lib/sentry.ts", () => ({
  Sentry: { startSpan: (_opts: any, fn: any) => fn() },
  reportError: vi.fn(),
}));
vi.mock("../lib/img-visitor-rate-limit.ts", () => ({
  rateLimitOrRespond: async () => false,
}));
vi.mock("../lib/img-fetch-guard.ts", async (importOriginal) => ({
  ...(await importOriginal<any>()),
  bumpStat: async () => {},
}));

const proxy = await import("../api/img/[source]/[id]/[tier].ts");

const CDN = "https://cdn.example.test";
const OBJECT_KEY = "img-cache/met/1/display/abc123.webp";

let sql: any;
beforeAll(async () => {
  sql = await makeSql([
    "001_items_schema.sql",
    "003_items_harmonization.sql",
    "009_blob_usage_tracker_schema.sql",
    "011_img_cache_entries.sql",
    "025_img_cache_native_id.sql",
    "026_img_object_keys.sql",
  ]);
  await sql.query(
    `INSERT INTO img_cache_entries (cache_key, source, tier, native_id, object_key, content_hash, bytes, admitted_at)
     VALUES ('met:1:display', 'met', 'display', '1', $1, 'abc123', 1000, now())`,
    [OBJECT_KEY],
  );
  db.sql = sql;
});
afterAll(async () => {
  if (sql) await sql.$close();
});

beforeEach(() => {
  process.env.BLOB_READ_WRITE_TOKEN = "test-token";
  process.env.S3_BUCKET = "bucket";
  process.env.S3_REGION = "us-east-1";
  process.env.S3_ACCESS_KEY_ID = "id";
  process.env.S3_SECRET_ACCESS_KEY = "secret";
  process.env.IMG_CDN_BASE_URL = CDN;
});

function call(id: string) {
  const req: any = {
    query: { source: "met", id, tier: "display" },
    headers: {},
  };
  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    setHeader(k: string, v: string) {
      this.headers[k.toLowerCase()] = String(v);
    },
    json() {},
    end() {},
  };
  return proxy.default(req, res).then(() => res);
}

describe("the redirect for an image already stored in S3", () => {
  it("sends the visitor to the CDN object", async () => {
    const res = await call("1");
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe(`${CDN}/${OBJECT_KEY}`);
  });

  it("lets a shared cache keep the redirect, not just the visitor's browser", async () => {
    const res = await call("1");
    expect(res.headers["cache-control"]).toMatch(/\bs-maxage=\d+/);
  });

  it("still lets the visitor's browser keep it for a year", async () => {
    const res = await call("1");
    expect(res.headers["cache-control"]).toMatch(/\bmax-age=31536000\b/);
  });
});
