// The locale contract in api/openapi.yaml, checked against the code that
// implements it: what the spec lists as translatable, supported or served
// must be what the API does.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ITEM_FIELDS,
  parseLocaleParam,
  SERVED_ORIGINS,
  TERM_FIELDS,
} from "../lib/translations.ts";
import { LOCALES } from "../src/i18n/locales.ts";

const spec = readFileSync("api/openapi.yaml", "utf8");

function flowList(pattern: RegExp): string[] {
  const match = spec.match(pattern);
  expect(match, `spec is missing ${pattern}`).not.toBeNull();
  return (match?.[1] ?? "").split(",").map((s) => s.trim());
}

function schemaBlock(name: string): string {
  const start = spec.indexOf(`\n    ${name}:\n`);
  expect(start, `schema ${name}`).toBeGreaterThan(-1);
  const rest = spec.slice(start + 1);
  const end = rest.slice(1).search(/\n {4}[A-Za-z]+:\n/);
  return end === -1 ? rest : rest.slice(0, end + 1);
}

describe("translatable fields", () => {
  const listed = () => flowList(/x-translatable-fields: \[([^\]]*)\]/);

  it("are exactly the fields the API translates", () => {
    expect([...listed()].sort()).toEqual([...ITEM_FIELDS].sort());
  });

  it("are all properties of an item", () => {
    const item = schemaBlock("Item");
    for (const field of listed()) {
      expect(item).toMatch(new RegExp(`\\n {8}${field}:`));
    }
  });

  it("include every catalogue-term field", () => {
    for (const field of TERM_FIELDS) expect(ITEM_FIELDS).toContain(field);
  });
});

describe("supported locales", () => {
  it("are exactly the registry's, and each is accepted", () => {
    const listed = flowList(/x-supported-locales: \[([^\]]*)\]/);
    expect([...listed].sort()).toEqual(LOCALES.map((l) => l.code).sort());
    for (const code of listed) expect(parseLocaleParam(code)).toBe(code);
  });
});

describe("translated", () => {
  it("lists exactly the origins that are served", () => {
    const origins = flowList(/origin:\n\s+type: string\n\s+enum: \[([^\]]*)\]/);
    expect([...origins].sort()).toEqual([...SERVED_ORIGINS].sort());
  });
});
