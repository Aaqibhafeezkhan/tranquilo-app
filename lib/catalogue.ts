// How the tooling reads the whole catalogue. /api/items serves full rows
// only by lookups, so fetchAllItems() lists source:id keys from the
// shuffled manifest and resolves them in batches; fetchManifest() is
// enough when only identity/facets matter.
import { TRANQUILO_CONFIG } from "./config.generated.ts";

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

const MAX_IDS_PER_LOOKUP = TRANQUILO_CONFIG.feed.max_ids_per_lookup;

export async function fetchAllItems(api: string, options: PageOptions = {}) {
  const manifest = await fetchManifest(api, options);
  const items: typeof manifest = [];
  for (let at = 0; at < manifest.length; at += MAX_IDS_PER_LOOKUP) {
    // By key, not bare id: native ids repeat across sources.
    const keys = manifest
      .slice(at, at + MAX_IDS_PER_LOOKUP)
      .map((entry) => `${entry.source}:${entry.id}`);
    const query = keys
      .map((key) => `keys=${encodeURIComponent(key)}`)
      .join("&");
    const res = await apiFetch(`${api}?${query}`);
    if (!res.ok) throw new Error(`${api} key lookup responded ${res.status}`);
    const body = await res.json();
    if (body.missing?.length) {
      throw new Error(
        `key lookup could not resolve manifest entries: ${body.missing.join(", ")}`,
      );
    }
    items.push(...body.items);
  }
  return items;
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
