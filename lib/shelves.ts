// Server-side access to Discover shelves (in Postgres, see
// sql/021_shelves.sql/sql/022_shelves_seed.sql). getShelves() takes an
// already-open `sql` client, same reasoning as lib/storylines.ts.
import type { Sql } from "./db.ts";
import { facetClauses } from "./item-facets.ts";
import { LIVE_ITEMS_AND, LIVE_ITEMS_PREDICATE } from "./items-sql.ts";

interface ShelfRow {
  id: string;
  title: string;
  type: string;
  item_ids: unknown;
  filter: unknown;
  min_items: number | null;
}

type Shelf = {
  id: string;
  slug: string;
  title: string;
  type: string;
  itemIds?: (string | number | { id: string | number; source?: string })[];
  filter?: Record<string, unknown>;
  minItems?: number | null;
};

type ShelfItemRow = {
  native_id: string;
  source: string;
  img?: string | null;
  accent_color?: string | null;
};

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

function isShareableShelf(shelf: Shelf | null | undefined): shelf is Shelf {
  return Boolean(shelf) && !UNSHAREABLE_SHELF_IDS.has((shelf as Shelf).id);
}

// JSONB columns come back already parsed under this project's driver
// family, handled defensively anyway so a wrong assumption fails soft.
function parseJsonbField(value: unknown): unknown {
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

function rowToShelf(row: ShelfRow): Shelf {
  const shelf: Shelf = {
    id: row.id,
    // From the untranslated title, so a link reads the same in every locale.
    slug: shelfTitleSlug(row.title),
    title: row.title,
    type: row.type,
  };
  if (row.type === "hero") {
    shelf.itemIds = (parseJsonbField(row.item_ids) as Shelf["itemIds"]) || [];
  } else {
    shelf.filter = (parseJsonbField(row.filter) as Shelf["filter"]) || {};
    shelf.minItems = row.min_items;
  }
  return shelf;
}

// Every shelf, in Discover's display order. Small and always-fetched --
// no lazy half, since a shelf definition is already as small as the thing
// it would be split into.
async function getShelves(sql: Sql): Promise<Shelf[]> {
  const rows =
    (await sql`SELECT * FROM shelves ORDER BY position ASC`) as ShelfRow[];
  return rows.map(rowToShelf);
}

// Matches the title slug first, then the id that older links used.
async function getShelf(sql: Sql, key?: string | null): Promise<Shelf | null> {
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
  sql: Sql,
  shelf: Shelf,
): Promise<{ count: number; cover: ShelfItemRow | null }> {
  if (shelf.type === "hero") {
    const refs = (shelf.itemIds || []).map((entry) =>
      typeof entry === "object"
        ? { id: String(entry.id), source: entry.source }
        : { id: String(entry), source: undefined },
    );
    if (!refs.length) return { count: 0, cover: null };
    const bare = refs.filter((r) => !r.source);
    const keyed = refs.filter((r) => r.source);
    const rows = (await sql.query(
      `SELECT * FROM items WHERE (native_id = ANY($1)
         OR (source, native_id) IN (SELECT * FROM unnest($2::text[], $3::text[])))
         ${LIVE_ITEMS_AND}`,
      [
        bare.map((r) => r.id),
        keyed.map((r) => r.source),
        keyed.map((r) => r.id),
      ],
    )) as ShelfItemRow[];
    const byKey = new Map(
      rows.map((row) => [`${row.source}:${row.native_id}`, row]),
    );
    const byId = new Map(rows.map((row) => [row.native_id, row]));
    const ordered = refs
      .map((r) =>
        r.source ? byKey.get(`${r.source}:${r.id}`) : byId.get(r.id),
      )
      .filter((row): row is ShelfItemRow => !!row);
    return {
      count: ordered.length,
      cover: ordered[0] || null,
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
  return {
    count: (countRows[0]?.n as number) || 0,
    cover: (coverRows[0] as ShelfItemRow) || null,
  };
}

export type { Shelf };
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
