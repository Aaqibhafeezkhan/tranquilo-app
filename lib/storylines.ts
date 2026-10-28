// Server-side access to storylines (in Postgres, see
// sql/019_storylines.sql/sql/020_storylines_seed.sql), plus the slug scheme
// that gives a storyline a shareable URL.
//
// A prefixed slug rather than a dedicated route, since api/ is at Vercel
// Hobby's 12-function cap: /s/{id} rewrites into the existing
// api/v/[slug].js as slug "s-{id}", the same trick api/og/[slug].js and
// items.js's `?shape=` params use elsewhere. Safe because slug parsing
// splits on the first hyphen only, so "s-el-greco-evolution" yields the
// whole id -- stays safe only while no real source is named "s"
// (tests/storyline-share.test.js pins that).
//
// getStoryline()/getStorylineIndex() take an already-open `sql` client
// rather than opening their own, since every /api handler here already
// manages exactly one Neon client per invocation.
const STORYLINE_SLUG_PREFIX = "s";

function storylineSlug(id: string | number): string {
  return `${STORYLINE_SLUG_PREFIX}-${id}`;
}

// Returns the storyline id, or null if this slug addresses an artwork instead.
// Takes the raw slug rather than a parsed object so both handlers can ask the
// question before deciding whether to touch the database at all.
function parseStorylineSlug(slug?: string | null): string | null {
  const raw = String(slug == null ? "" : slug);
  const prefix = `${STORYLINE_SLUG_PREFIX}-`;
  if (raw.slice(0, prefix.length) !== prefix) return null;
  const id = raw.slice(prefix.length);
  return id ? id : null;
}

// JSONB columns come back already parsed under this project's driver family,
// handled defensively anyway so a wrong assumption fails soft.
function parseItemsField(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (_e) {
      return [];
    }
  }
  return [];
}

// The cover is one of the chapters, so its source is that chapter's.
function coverSource(
  coverId: unknown,
  chapters: { id?: unknown; source?: string }[],
): string | undefined {
  return chapters.find((c) => String(c.id) === String(coverId))?.source;
}

function rowToStoryline(row: any): any {
  const chapters = parseItemsField(row.items);
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    tier: row.tier,
    cover_item_id: row.cover_item_id,
    cover_source: coverSource(row.cover_item_id, chapters),
    intro_caption: row.intro_caption,
    source_note: row.source_note || undefined,
    items: chapters,
  };
}

// Full storyline detail, everything TranquiloStorylineMode.ts's open() needs
// to render. The LAZY half: fetched only when a reader opens that storyline,
// not on every page load.
async function getStoryline(sql: any, id?: string | null): Promise<any> {
  if (!id) return null;
  const rows = await sql.query("SELECT * FROM storylines WHERE id = $1", [id]);
  return rows[0] ? rowToStoryline(rows[0]) : null;
}

// The EAGER half: just enough for the always-on consumers (slideBuilder's
// chip/position label, shelves.ts's "Storylines" hero shelf), deliberately
// omitting title/intro_caption/source_note/chapter_caption -- the reason
// this is split out from getStoryline() at all.
async function getStorylineIndex(sql: any): Promise<any[]> {
  const rows = await sql`SELECT id, cover_item_id, items FROM storylines`;
  return rows.map((row: any) => {
    const chapters = parseItemsField(row.items);
    return {
      id: row.id,
      cover_item_id: row.cover_item_id,
      cover_source: coverSource(row.cover_item_id, chapters),
      items: chapters.map((chapter: any) => ({
        id: chapter.id,
        source: chapter.source,
        position: chapter.position,
      })),
    };
  });
}

export {
  getStoryline,
  getStorylineIndex,
  parseStorylineSlug,
  STORYLINE_SLUG_PREFIX,
  storylineSlug,
};
