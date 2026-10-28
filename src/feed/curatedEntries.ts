// Curated entries (storyline chapters, set members, hero-shelf items) name an
// item by native id, plus its source where that id is shared across sources.
import type { Item } from "../types/Item";

export type CuratedRef = { id: string | number; source?: string };

export interface CuratedLookupHost {
  getItem(id: string): Item | undefined;
  getItemByKey(key: string): Item | undefined;
  resolveItemsByIds(ids: string[]): Promise<Item[]>;
  resolveItemsByKeys(keys: string[]): Promise<Item[]>;
}

export function curatedKey(ref: CuratedRef): string | null {
  return ref.source ? `${ref.source}:${ref.id}` : null;
}

export function sameCuratedItem(
  ref: CuratedRef,
  item: Pick<Item, "id" | "source">,
): boolean {
  return (
    String(ref.id) === String(item.id) &&
    (!ref.source || ref.source === item.source)
  );
}

export function findCuratedItem(
  host: Pick<CuratedLookupHost, "getItem" | "getItemByKey">,
  ref: CuratedRef,
): Item | undefined {
  const key = curatedKey(ref);
  return key ? host.getItemByKey(key) : host.getItem(String(ref.id));
}

export function shelfRefs(
  itemIds: (string | number | CuratedRef)[],
): CuratedRef[] {
  return itemIds.map((entry) =>
    typeof entry === "object" ? entry : { id: entry },
  );
}

// Items in the order of `refs`; entries that no longer resolve are dropped.
export async function resolveCuratedList(
  host: Pick<CuratedLookupHost, "resolveItemsByIds" | "resolveItemsByKeys">,
  refs: CuratedRef[],
): Promise<Item[]> {
  const keys = refs.map(curatedKey).filter((k): k is string => !!k);
  const ids = refs.filter((r) => !r.source).map((r) => String(r.id));
  const [keyed, bare] = await Promise.all([
    keys.length ? host.resolveItemsByKeys(keys) : [],
    ids.length ? host.resolveItemsByIds(ids) : [],
  ]);
  const byKey = new Map(keyed.map((i) => [`${i.source}:${i.id}`, i]));
  const byId = new Map(bare.map((i) => [String(i.id), i]));
  return refs
    .map((r) =>
      r.source ? byKey.get(curatedKey(r) as string) : byId.get(String(r.id)),
    )
    .filter((i): i is Item => !!i);
}

export async function resolveCuratedItems(
  host: Pick<CuratedLookupHost, "resolveItemsByIds" | "resolveItemsByKeys">,
  refs: CuratedRef[],
): Promise<void> {
  const keys: string[] = [];
  const ids: string[] = [];
  for (const ref of refs) {
    const key = curatedKey(ref);
    if (key) keys.push(key);
    else ids.push(String(ref.id));
  }
  await Promise.all([
    keys.length ? host.resolveItemsByKeys(keys) : null,
    ids.length ? host.resolveItemsByIds(ids) : null,
  ]);
}
