import { afterEach, beforeEach, describe, expect, it } from "vitest";
import handler from "../api/items.ts";
import { regionForCountry } from "../lib/print-region.ts";

function mockRes(): any {
  return {
    statusCode: 200,
    body: null,
    headers: {} as any,
    setHeader(k: string, v: any) {
      this.headers[k] = v;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
  };
}

async function get(headers: Record<string, any>) {
  const res = mockRes();
  await handler(
    { method: "GET", query: { shape: "print_region" }, headers } as any,
    res,
  );
  return res;
}

describe("mapping a country to a print region", () => {
  it("groups launch countries into their regions", () => {
    expect(regionForCountry("US")).toBe("us");
    expect(regionForCountry("CA")).toBe("ca");
    expect(regionForCountry("DE")).toBe("eu");
    expect(regionForCountry("GB")).toBe("uk");
    expect(regionForCountry("AU")).toBe("au");
    expect(regionForCountry("BR")).toBe("br");
  });

  it("accepts lowercase codes", () => {
    expect(regionForCountry("fr")).toBe("eu");
  });

  it("offers nothing outside the launch regions", () => {
    expect(regionForCountry("JP")).toBeNull();
  });

  it("offers nothing for a missing or malformed country", () => {
    for (const bad of [undefined, null, "", "XX", "USA", "u1", ["US", "DE"]]) {
      expect(regionForCountry(bad as any)).toBeNull();
    }
  });
});

describe("?shape=print_region", () => {
  let savedUrl: string | undefined;
  beforeEach(() => {
    savedUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
  });
  afterEach(() => {
    if (savedUrl !== undefined) process.env.DATABASE_URL = savedUrl;
  });

  it("answers from the visitor's country without touching the database", async () => {
    const res = await get({ "x-vercel-ip-country": "DE" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ country: "DE", region: "eu" });
  });

  it("is never cached where another visitor could receive it", async () => {
    const res = await get({ "x-vercel-ip-country": "US" });
    const cc = String(res.headers["Cache-Control"] || "");
    expect(cc).toMatch(/no-store/);
    expect(cc).not.toMatch(/public|s-maxage/);
  });

  it("reports no country and no region when the header is absent", async () => {
    const res = await get({});
    expect(res.body).toEqual({ country: null, region: null });
  });

  it("reports the country but no region outside the launch regions", async () => {
    const res = await get({ "x-vercel-ip-country": "JP" });
    expect(res.body).toEqual({ country: "JP", region: null });
  });
});

describe("a local development country", () => {
  const saved = {
    dev: process.env.PRINT_REGION_DEV_COUNTRY,
    env: process.env.VERCEL_ENV,
  };
  afterEach(() => {
    for (const [k, v] of [
      ["PRINT_REGION_DEV_COUNTRY", saved.dev],
      ["VERCEL_ENV", saved.env],
    ] as const) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("stands in for the missing header outside production", async () => {
    process.env.PRINT_REGION_DEV_COUNTRY = "US";
    process.env.VERCEL_ENV = "development";
    const res = await get({});
    expect(res.body).toEqual({ country: "US", region: "us" });
  });

  it("never overrides a real header", async () => {
    process.env.PRINT_REGION_DEV_COUNTRY = "US";
    process.env.VERCEL_ENV = "development";
    const res = await get({ "x-vercel-ip-country": "JP" });
    expect(res.body).toEqual({ country: "JP", region: null });
  });

  it("is ignored in production", async () => {
    process.env.PRINT_REGION_DEV_COUNTRY = "US";
    process.env.VERCEL_ENV = "production";
    const res = await get({});
    expect(res.body).toEqual({ country: null, region: null });
  });
});
