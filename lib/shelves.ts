// Server-side access to Discover shelves (in Postgres, see
// sql/021_shelves.sql/sql/022_shelves_seed.sql). getShelves() takes an
// already-open `sql` client, same reasoning as lib/storylines.ts.
import { facetClauses } from "./item-facets.ts";
import { LIVE_ITEMS_AND, LIVE_ITEMS_PREDICATE } from "./items-sql.ts";

// No ingestion source may be named "shelf".
const SHELF_SLUG_PREFIX = "shelf";

// Filled client-side; storylines have their own /s/{id} links.
const UNSHAREABLE_SHELF_IDS = new Set(["storylines"]);

function shelfSlug(key: string): string {
  return `${SHELF_SLUG_PREFIX}-${key}`;
}

// The URL form of a shelf's English title, e.g. "feito-no-brasil".
function shelfTitleSlug(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// The shelf's title slug or id, or null if this slug addresses something else.
function parseShelfSlug(slug?: string | null): string | null {
  const raw = String(slug == null ? "" : slug);
  const prefix = `${SHELF_SLUG_PREFIX}-`;
  if (!raw.startsWith(prefix)) return null;
  return raw.slice(prefix.length) || null;
}

function isShareableShelf(shelf: any): boolean {
  return Boolean(shelf) && !UNSHAREABLE_SHELF_IDS.has(shelf.id);
}

// JSONB columns come back already parsed under this project's driver
// family, handled defensively anyway so a wrong assumption fails soft.
function parseJsonbField(value: any): any {
  if (value == null) return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (_e) {
      return value;
    }
  }
  return value;
}

function rowToShelf(row: any): any {
  const shelf: any = {
    id: row.id,
    // From the untranslated title, so a link reads the same in every locale.
    slug: shelfTitleSlug(row.title),
    title: row.title,
    type: row.type,
  };
  if (row.type === "hero") {
    shelf.itemIds = parseJsonbField(row.item_ids) || [];
  } else {
    shelf.filter = parseJsonbField(row.filter) || {};
    shelf.minItems = row.min_items;
  }
  return shelf;
}

// Every shelf, in Discover's display order. Small and always-fetched --
// no lazy half, since a shelf definition is already as small as the thing
// it would be split into.
async function getShelves(sql: any): Promise<any[]> {
  const rows = await sql`SELECT * FROM shelves ORDER BY position ASC`;
  return rows.map(rowToShelf);
}

// Matches the title slug first, then the id that older links used.
async function getShelf(sql: any, key?: string | null): Promise<any> {
  if (!key) return null;
  const shelves = await getShelves(sql);
  return (
    shelves.find((s) => s.slug === key) ||
    shelves.find((s) => s.id === key) ||
    null
  );
}

// Live work count, plus the first live work as cover.
async function getShelfPreview(
  sql: any,
  shelf: any,
): Promise<{ count: number; cover: any }> {
  if (shelf.type === "hero") {
    const ids = (shelf.itemIds || []).map(String);
    if (!ids.length) return { count: 0, cover: null };
    const rows = await sql.query(
      `SELECT * FROM items WHERE native_id = ANY($1) ${LIVE_ITEMS_AND}`,
      [ids],
    );
    const byId = new Map(rows.map((row: any) => [row.native_id, row]));
    const firstLive = ids.find((id: string) => byId.has(id));
    return {
      count: rows.length,
      cover: firstLive ? byId.get(firstLive) : null,
    };
  }

  const values: unknown[] = [];
  const where = [
    LIVE_ITEMS_PREDICATE,
    ...facetClauses(shelf.filter || {}, (value) => {
      values.push(value);
      return `$${values.length}`;
    }),
  ].join(" AND ");
  const [countRows, coverRows] = await Promise.all([
    sql.query(`SELECT count(*)::int AS n FROM items WHERE ${where}`, values),
    sql.query(
      `SELECT * FROM items WHERE ${where} ORDER BY shuffle_key, native_id LIMIT 1`,
      values,
    ),
  ]);
  return { count: countRows[0]?.n || 0, cover: coverRows[0] || null };
}

export {
  getShelf,
  getShelfPreview,
  getShelves,
  isShareableShelf,
  parseShelfSlug,
  SHELF_SLUG_PREFIX,
  shelfSlug,
  shelfTitleSlug,
};
