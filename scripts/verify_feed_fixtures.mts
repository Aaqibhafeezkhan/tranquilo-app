// Checks the live feed against itself rather than a stored baseline:
// server-side search (?q=) must return exactly what matchesQuery() picks
// from the live catalogue, and server-paged ordering must keep the
// same-artist adjacency budget and show each item once per session.
//
// Deliberately a script rather than a vitest test: the JS suite is offline by
// design and this needs the live API.
//
// Run:  bun scripts/verify_feed_fixtures.mts
//       bun scripts/verify_feed_fixtures.mts --api http://localhost:3000/api/items
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const logic = await import(path.join(ROOT, "src/logic/logic.ts"));

const { resolveApi, fetchAllItems, apiFetch } = await import(
  path.join(ROOT, "lib/catalogue.ts")
);
const API = resolveApi();

// Real queries, including accented, multi-word, CJK and no-match cases.
const SEARCH_TERMS = [
  "cezanne",
  "Cézanne",
  "monet",
  "rembrandt",
  "vermeer",
  "buddha",
  "landscape",
  "portrait",
  "still life",
  "唐",
  "gold",
  "silk",
  "bronze",
  "qing",
  "ming",
  "van gogh",
  "self-portrait",
  "zzzznomatch",
];

const itemKey = (i: { source: string; id: string | number }) =>
  `${i.source}:${i.id}`;

// Full items: matchesQuery() reads title, medium, tags and bio --
// fields the manifest deliberately omits.
const items = await fetchAllItems(API);

async function serverSearch(q: string): Promise<Set<string>> {
  const keys = new Set<string>();
  let cursor: string | null = null;
  for (let pages = 0; pages < 2000; pages++) {
    const url: string = `${API}?shape=manifest&order=shuffle&q=${encodeURIComponent(q)}&limit=200${
      cursor ? `&cursor=${encodeURIComponent(cursor)}` : "&start=0"
    }`;
    const res: Response = await apiFetch(url);
    if (!res.ok) throw new Error(`${url} responded ${res.status}`);
    const body: {
      items: { source: string; id: string }[];
      next_cursor?: string;
    } = await res.json();
    for (const item of body.items) keys.add(itemKey(item));
    if (!body.next_cursor || body.next_cursor === cursor) return keys;
    cursor = body.next_cursor;
  }
  throw new Error(`?q=${q} did not stop paging`);
}

const searchProblems: string[] = [];
for (const q of SEARCH_TERMS) {
  const local = new Set<string>(
    items.filter((i: any) => logic.matchesQuery(i, q)).map(itemKey),
  );
  const server = await serverSearch(q);
  const onlyLocal = [...local].filter((k) => !server.has(k));
  const onlyServer = [...server].filter((k) => !local.has(k));
  if (onlyLocal.length || onlyServer.length) {
    searchProblems.push(
      `"${q}": server ${server.size}, matchesQuery ${local.size}` +
        (onlyLocal.length
          ? `; missing from server ${onlyLocal.length}: ${onlyLocal.slice(0, 4).join(", ")}`
          : "") +
        (onlyServer.length
          ? `; extra from server ${onlyServer.length}: ${onlyServer.slice(0, 4).join(", ")}`
          : ""),
    );
  }
}

// Ordering is randomised, so it is checked as invariants rather than sequence.
// These are the guarantees declusterOrder() makes, and they must survive any
// server-side reimplementation of feed ordering.
function checkInvariants(list: any[], checkCategory: boolean) {
  const violations = [];
  for (let i = 1; i < list.length; i++) {
    const a = list[i - 1],
      b = list[i];
    if (logic.isNamedMaker(a.artist) && a.artist === b.artist) {
      violations.push(`consecutive same artist at ${i}: ${a.artist}`);
    }
    if (checkCategory && a.category === b.category) {
      violations.push(`consecutive same category at ${i}: ${a.category}`);
    }
  }
  return violations;
}

// A threshold, not an assertion of zero: declusterOrder() is a single
// left-to-right pass, not a solver, and cannot always satisfy the
// no-adjacent-same-artist constraint (particularly at the tail). A
// zero-tolerance check would flag normal behavior as a regression.
const ADJACENCY_BUDGET = 6;
const RUNS = 5;
let worst = 0;
for (let run = 0; run < RUNS; run++) {
  const shuffle = logic.declusterOrder(logic.shuffled(items.slice()), true);
  worst = Math.max(worst, checkInvariants(shuffle, false).length);
}
const tailViolations =
  worst > ADJACENCY_BUDGET
    ? [
        `${worst} same-artist adjacencies across ${RUNS} shuffles (budget ${ADJACENCY_BUDGET})`,
      ]
    : [];

// ---------------------------------------------------------------------------
// The same invariant, over the order a VISITOR actually gets.
// ---------------------------------------------------------------------------
//
// The check above shuffles locally and declusters in one global pass, which
// the client no longer does -- the feed is now ordered server-side by a
// precomputed shuffle_key, paged, and declustered per-page against the
// previous page's trailing item. The local check stays as the baseline the
// paged result is judged against; this walks real pages from the live
// endpoint to measure whether per-page declustering with carry-over holds up.
// Exact equivalence isn't the bar: a 60-item page can't find a swap a
// whole-catalogue pass might find 300 items later, hence the budget.
async function walkPagedFeed(
  start: number,
  { limit = 60, maxPages = 4000 } = {},
) {
  const out: any[] = [];
  let carry: any = null;
  let cursor: string | null = null;
  let pages = 0;

  for (;;) {
    const url: string = `${API}?shape=manifest&order=shuffle&limit=${limit}${
      cursor ? `&cursor=${encodeURIComponent(cursor)}` : `&start=${start}`
    }`;
    const res: Response = await apiFetch(url);
    if (!res.ok) throw new Error(`${url} responded ${res.status}`);
    const body: any = await res.json();
    if (++pages > maxPages) {
      throw new Error(
        `paging did not terminate after ${maxPages} pages -- ` +
          `the wrap is not stopping where the session began`,
      );
    }
    // Same call the client makes, from the same module. A second
    // implementation here would be measuring itself rather than the feed.
    const page: any[] = logic.declusterPageOrder(
      body.items || [],
      carry,
      false,
    );
    if (page.length) {
      carry = page[page.length - 1];
      out.push(...page);
    }
    if (!body.next_cursor) return { order: out, pages };
    if (body.next_cursor === cursor) {
      throw new Error(
        `cursor stopped advancing after ${pages} page(s) -- ` +
          `paging is broken, not finished`,
      );
    }
    cursor = body.next_cursor;
  }
}

let pagedWorst = 0;
let pagedPages = 0;
let pagedCount = 0;
let pagedDupes = 0;
let pagedError: unknown = null;
try {
  for (let run = 0; run < RUNS; run++) {
    const { order, pages } = await walkPagedFeed(Math.random());
    pagedWorst = Math.max(pagedWorst, checkInvariants(order, false).length);
    pagedPages = pages;
    pagedCount = order.length;
    // A session must see each live item exactly once. Counting by the
    // composite source:id, not native_id, since some items share a
    // native_id across sources (met:107208, cleveland:107208).
    const keys = order.map((i) => `${i.source}:${i.id}`);
    pagedDupes = Math.max(pagedDupes, keys.length - new Set(keys).size);
  }
} catch (err) {
  pagedError = err;
}

console.log(`Checking ${API}`);
console.log(`  live: ${items.length} items\n`);

if (!searchProblems.length) {
  console.log(
    `  Search: ${SEARCH_TERMS.length} terms, ?q= matches matchesQuery() exactly.`,
  );
} else {
  console.log(`  Search: ${searchProblems.length} term(s) disagree\n`);
  for (const p of searchProblems) console.log(`    ${p}`);
}

console.log(
  tailViolations.length
    ? `\n  Ordering (local baseline): WORSE than baseline -- ${tailViolations[0]}`
    : `\n  Ordering (local baseline): worst of ${RUNS} shuffles had ${worst} same-artist ` +
        `adjacency of ${items.length - 1} pairs (budget ${ADJACENCY_BUDGET}).`,
);

if (pagedError) {
  const message =
    pagedError instanceof Error ? pagedError.message : String(pagedError);
  console.log(`\n  Ordering (server-paged): COULD NOT MEASURE -- ${message}`);
} else {
  console.log(
    `\n  Ordering (server-paged): worst of ${RUNS} sessions had ${pagedWorst} same-artist ` +
      `adjacency of ${Math.max(0, pagedCount - 1)} pairs (budget ${ADJACENCY_BUDGET}), ` +
      `over ~${pagedPages} pages/session.`,
  );
  console.log(
    `  Coverage: ${pagedCount} items per session, ${pagedDupes} duplicate(s) ` +
      `-- a session must see each live item exactly once.`,
  );
  if (pagedWorst > ADJACENCY_BUDGET) {
    console.log(`  OVER BUDGET -- per-page declustering has regressed.`);
  }
  if (pagedDupes > 0) {
    console.log(
      `  DUPLICATES -- the wrap is not stopping where the session began.`,
    );
  }
}

const pagedBad =
  !!pagedError || pagedWorst > ADJACENCY_BUDGET || pagedDupes > 0;
process.exit(searchProblems.length || pagedBad ? 1 : 0);
