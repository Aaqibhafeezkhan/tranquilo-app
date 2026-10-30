// ?shape=vocabulary: every controlled-vocabulary value with its display
// label in a locale. The value is the stable code filters match on; the
// label is for display only.
import { readFileSync } from "node:fs";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { describe, expect, it, vi } from "vitest";
import { vocabularyLabels } from "../lib/vocabulary-labels.ts";

vi.mock("../lib/db.ts", () => ({ getSql: () => null }));
vi.mock("../lib/sentry.ts", () => ({ Sentry: {}, reportError: vi.fn() }));

const { default: handler } = await import("../api/items.ts");

const VOCABULARY = JSON.parse(readFileSync("shared/vocabulary.json", "utf8"));
const LISTS = {
  category: "categories",
  region_primary: "regions",
  timeframe: "timeframes",
  media_type: "media_types",
  palette: "palettes",
  subject_type: "subject_types",
} as const;

function mockRes() {
  const res = {
    statusCode: 200,
    body: null as unknown,
    headers: {} as Record<string, string>,
    setHeader(k: string, v: string) {
      res.headers[k] = v;
    },
    json(payload: unknown) {
      res.body = payload;
      return res;
    },
  };
  return res;
}

type Answer = {
  locale: string;
  fields: Record<string, { value: string; label: string }[]>;
};

async function get(query: Record<string, unknown>) {
  const res = mockRes();
  await handler(
    { method: "GET", query } as unknown as VercelRequest,
    res as unknown as VercelResponse,
  );
  return { ...res, answer: res.body as Answer };
}

describe("vocabularyLabels", () => {
  it("lists every vocabulary value, unchanged and in file order, under its filter name", () => {
    const { fields } = vocabularyLabels("pt-BR");
    for (const [name, list] of Object.entries(LISTS)) {
      expect(fields[name].map((e) => e.value)).toEqual(VOCABULARY[list]);
    }
  });

  it("labels values in the requested locale", () => {
    const { locale, fields } = vocabularyLabels("pt-BR");
    expect(locale).toBe("pt-BR");
    expect(fields.category).toContainEqual({
      value: "Paintings & Portraits",
      label: "Pinturas e retratos",
    });
    expect(fields.region_primary).toContainEqual({
      value: "East Asia",
      label: "Ásia Oriental",
    });
  });

  it("gives English labels for English, and for no locale", () => {
    const en = vocabularyLabels("en").fields.category;
    expect(en).toContainEqual({
      value: "Paintings & Portraits",
      label: "Paintings & Portraits",
    });
    expect(vocabularyLabels(null)).toEqual(vocabularyLabels("en"));
  });

  it("never leaves a label empty", () => {
    for (const locale of ["en", "pt-BR"]) {
      for (const entries of Object.values(vocabularyLabels(locale).fields)) {
        for (const e of entries) expect(e.label.trim()).not.toBe("");
      }
    }
  });
});

describe("shape=vocabulary", () => {
  it("answers without a database, cached, in the requested locale", async () => {
    const res = await get({ shape: "vocabulary", locale: "pt-br" });
    expect(res.statusCode).toBe(200);
    expect(res.answer.locale).toBe("pt-BR");
    expect(res.answer.fields.category.length).toBe(
      VOCABULARY.categories.length,
    );
    expect(res.headers["Cache-Control"]).toMatch(/s-maxage/);
  });

  it("is English without a locale", async () => {
    const res = await get({ shape: "vocabulary" });
    expect(res.answer.locale).toBe("en");
  });

  it("rejects an unknown locale", async () => {
    const res = await get({ shape: "vocabulary", locale: "xx-YY" });
    expect(res.statusCode).toBe(400);
  });
});
