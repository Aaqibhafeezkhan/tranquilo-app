// Page through the entire catalogue over real HTTP: the shuffled manifest
// from mid-catalogue, compared against the same manifest from start=0.
// A fixture comparison exercises filtering, not paging, so it cannot catch
// a cursor that stops advancing or a wrap that skips or repeats items.
//
// The invariant is set equality, not page count: each paging must yield
// the same live set, each item once -- holds regardless of catalogue size
// or limit, so it never needs re-baselining.
//
// Run:  node scripts/verify_pagination.mts
//       node scripts/verify_pagination.mts --api http://localhost:3000/api/items
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { resolveApi, fetchManifest, apiFetch } = await import(
  path.join(__dirname, "../lib/catalogue.ts")
);

const API = resolveApi();

// Keyed by source as well: native ids repeat across sources.
const itemKey = (i: { source: string; id: string | number }) =>
  `${i.source}:${i.id}`;

// The baseline is the manifest paged from start=0. The check below pages
// it again from mid-catalogue, so the wrap from the top of the key space
// back to the start is exercised -- if the two disagree, a visitor whose
// session starts mid-feed sees missing or repeated items.
const manifest = await fetchManifest(API);
const expected = new Set<string>(manifest.map(itemKey));

const LIMIT = 200;
const START = 0.5;
const MAX_PAGES = 2000; // a stuck cursor must terminate, not spin
const seen = new Set<string>();
const duplicates: string[] = [];
let cursor: string | null = null;
let pages = 0;
let stuck: string | null = null;

while (pages < MAX_PAGES) {
  const url: string = `${API}?shape=manifest&order=shuffle&limit=${LIMIT}${
    cursor ? `&cursor=${encodeURIComponent(cursor)}` : `&start=${START}`
  }`;
  const res: Response = await apiFetch(url);
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  const body: any = await res.json();
  pages++;

  for (const item of body.items) {
    const id = itemKey(item);
    if (seen.has(id)) duplicates.push(id);
    seen.add(id);
  }
  if (!body.next_cursor) break;
  // The exact failure mode from the bug above: a cursor that repeats itself.
  if (body.next_cursor === cursor) {
    stuck = cursor;
    break;
  }
  cursor = body.next_cursor;
}

const missing = [...expected].filter((id) => !seen.has(id));
const extra = [...seen].filter((id) => !expected.has(id));

console.log(`Paging ${API}`);
console.log(`  manifest baseline: ${expected.size} items`);
console.log(
  `  paged: ${seen.size} unique across ${pages} page(s) of ${LIMIT}\n`,
);

const problems = [];
if (stuck) problems.push(`cursor stopped advancing (repeated ${stuck})`);
if (pages >= MAX_PAGES)
  problems.push(
    `hit the ${MAX_PAGES}-page ceiling -- cursor is not terminating`,
  );
if (duplicates.length)
  problems.push(
    `${duplicates.length} duplicate(s): ${duplicates.slice(0, 4).join(", ")}`,
  );
if (missing.length)
  problems.push(
    `${missing.length} never returned: ${missing.slice(0, 4).join(", ")}`,
  );
if (extra.length)
  problems.push(
    `${extra.length} not in the baseline: ${extra.slice(0, 4).join(", ")}`,
  );

if (!problems.length) {
  console.log("  Paging returns exactly the manifest's set, each item once.");
  process.exit(0);
}
for (const p of problems) console.log(`  FAIL: ${p}`);
process.exit(1);
