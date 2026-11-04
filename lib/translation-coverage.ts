// How much of the live catalogue is served translated in one locale, by the
// same rules lib/translations.ts serves under: a reviewed term, or an
// approved item-level translation of the field's current text.
//
// Counts the requested locale only, not the English fallback. A field the
// source already supplies in that language counts as not translated.

import { LIVE_ITEMS_PREDICATE } from "./items-sql.ts";
import { reportError } from "./sentry.ts";
import { ITEM_FIELDS, TERM_FIELDS } from "./translations.ts";

export interface CoverageRow {
  field: string;
  items: number;
  translated: number;
}

export interface TranslationCoverage {
  locale: string;
  fields: Record<string, { items: number; translated: number }>;
}

const KEY = (value: string) =>
  `lower(regexp_replace(btrim(${value}), '\\s+', ' ', 'g'))`;

const nonEmpty = (column: string) => `btrim(coalesce(${column}, '')) <> ''`;

// Live items with a value in one field, as a subquery so a join against
// translations cannot mistake its review_status for the item's.
const liveValues = (field: string) =>
  `(SELECT id, ${field} AS v FROM items WHERE ${LIVE_ITEMS_PREDICATE}` +
  ` AND ${nonEmpty(field)})`;

// Items whose approved item-level translation is current, as ids.
function itemLevelIds(field: string): string {
  return (
    `SELECT i.id, i.v FROM translations tr JOIN ${liveValues(field)} i` +
    ` ON i.id = tr.entity_id` +
    ` WHERE tr.entity_type = 'item' AND tr.locale = $1 AND tr.field = '${field}'` +
    `   AND tr.review_status = 'approved'` +
    `   AND tr.origin IN ('original', 'human')` +
    `   AND (tr.origin = 'original' OR tr.source_hash =` +
    `        encode(sha256(convert_to(i.v, 'UTF8')), 'hex'))`
  );
}

const termHit = (field: string, value: string) =>
  `EXISTS (SELECT 1 FROM term_translations t WHERE t.field = '${field}'` +
  ` AND t.locale = $1 AND t.source_key = ${KEY(value)})`;

// Counts distinct values first and joins the small term table to those,
// rather than looking a term up once per item.
function translatedCount(field: string): string {
  const itemLevel = itemLevelIds(field);
  if (field === "tags") {
    const untranslatedToken =
      `EXISTS (SELECT 1 FROM unnest(string_to_array(x.v, ',')) AS tok` +
      ` WHERE btrim(tok) <> '' AND NOT ${termHit(field, "tok")})`;
    return (
      `(SELECT count(*) FROM ${liveValues(field)} x` +
      `  WHERE NOT ${untranslatedToken})` +
      ` + (SELECT count(*) FROM (${itemLevel}) x WHERE ${untranslatedToken})`
    );
  }
  if ((TERM_FIELDS as readonly string[]).includes(field)) {
    return (
      `(SELECT coalesce(sum(g.n), 0) FROM (` +
      `   SELECT ${KEY("v")} AS k, count(*) AS n FROM ${liveValues(field)} x GROUP BY 1` +
      ` ) g JOIN term_translations t ON t.field = '${field}'` +
      `  AND t.locale = $1 AND t.source_key = g.k)` +
      ` + (SELECT count(*) FROM (${itemLevel}) x WHERE NOT ${termHit(field, "x.v")})`
    );
  }
  return `(SELECT count(*) FROM (${itemLevel}) x)`;
}

export function coverageQuery(locale: string): {
  text: string;
  params: unknown[];
} {
  const parts = ITEM_FIELDS.map(
    (field) =>
      `SELECT '${field}' AS field,` +
      ` (SELECT count(*) FROM ${liveValues(field)} x)::int AS items,` +
      ` (${translatedCount(field)})::int AS translated`,
  );
  return { text: parts.join(" UNION ALL "), params: [locale] };
}

export function coverageResult(
  locale: string,
  rows: readonly CoverageRow[],
): TranslationCoverage {
  const fields: TranslationCoverage["fields"] = {};
  for (const row of rows) {
    fields[row.field] = { items: row.items, translated: row.translated };
  }
  return { locale, fields };
}

interface SqlClient {
  query(text: string, params: unknown[]): Promise<unknown[]>;
}

// Additive to the answer it joins, so a failure is reported and the answer
// goes out without it rather than failing.
export async function loadCoverage(
  sql: SqlClient,
  locale: string,
): Promise<TranslationCoverage | undefined> {
  try {
    const { text, params } = coverageQuery(locale);
    return coverageResult(
      locale,
      (await sql.query(text, params)) as CoverageRow[],
    );
  } catch (err) {
    console.error("translations: coverage query failed", err);
    await reportError(err);
    return undefined;
  }
}
