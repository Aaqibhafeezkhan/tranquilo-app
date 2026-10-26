// How the tooling reads the whole catalogue now that /api/items no longer
// serves it in one response (the old endpoint was an unbounded SELECT *,
// ~390MB at the 200k target). Both page with a cursor: fetchAllItems()
// for callers needing full fields (title, medium, tags, bio);
// fetchManifest() for when only identity/facets matter.

const DEFAULT_API = "https://tranquilo.art/api/items";

export function resolveApi(argv: string[] = process.argv): string {
  const flag = argv.indexOf("--api");
  if (flag !== -1 && argv[flag + 1]) return argv[flag + 1];
  return process.env.FIXTURE_API || DEFAULT_API;
}

// Production's Bot Protection challenges scripted requests without this header.
export function apiFetch(url: string): Promise<Response> {
  const token = process.env.FIREWALL_BYPASS_TOKEN;
  return fetch(
    url,
    token ? { headers: { "x-tranquilo-bypass": token } } : undefined,
  );
}

type PageOptions = { limit?: number; maxPages?: number };

export function fetchAllItems(
  api: string,
  { limit = 200, maxPages = 2000 }: PageOptions = {},
) {
  return fetchAllPages(
    (cursor) =>
      `${api}?limit=${limit}${
        cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""
      }`,
    maxPages,
  );
}

export function fetchManifest(
  api: string,
  { limit = 200, maxPages = 2000 }: PageOptions = {},
) {
  return fetchAllPages(
    (cursor) =>
      `${api}?shape=manifest&order=shuffle&limit=${limit}${
        cursor ? `&cursor=${encodeURIComponent(cursor)}` : "&start=0"
      }`,
    maxPages,
  );
}

// Pages with a cursor until the endpoint says there is no next page. The
// page ceiling is a guard against a cursor that stops advancing (happened
// once when a millisecond-truncated created_at defeated the native_id
// tiebreak) -- terminating loudly beats hanging.
async function fetchAllPages(
  pageUrl: (cursor: string | null) => string,
  maxPages: number,
): Promise<any[]> {
  const items: any[] = [];
  let cursor: string | null = null;
  let pages = 0;

  while (pages < maxPages) {
    const url = pageUrl(cursor);
    const res: Response = await apiFetch(url);
    if (!res.ok) throw new Error(`${url} responded ${res.status}`);
    const body: any = await res.json();
    pages++;

    items.push(...body.items);
    if (!body.next_cursor) return items;
    if (body.next_cursor === cursor) {
      throw new Error(
        `cursor stopped advancing after ${pages} page(s) ` +
          `(${items.length} items) -- paging is broken, not finished`,
      );
    }
    cursor = body.next_cursor;
  }
  throw new Error(
    `hit the ${maxPages}-page ceiling; cursor is not terminating`,
  );
}
