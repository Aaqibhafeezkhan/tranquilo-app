// Host contract for <tranquilo-shelf-mode>; shelves arrive as a property.
import type { Item } from "./Item";
import type { Shelf } from "./Shelf";

export interface ITranquiloShelfModeHost {
  apiUrl(params: Record<string, unknown>): string;
  fetchJson(
    url: string,
    what: string,
  ): Promise<{
    items?: unknown[];
    next_cursor?: string | null;
    total?: number;
  }>;
  absorbPage(rows: unknown[]): Item[];
  resolveItemsByIds(ids: string[]): Promise<Item[]>;
  hydrateItems(items: Item[]): Promise<void>;
  applyNudityGate(frame: HTMLElement, item: Item, compact?: boolean): void;
  trackEvent(name: string, props: Record<string, unknown>): void;
  shareShelf(shelf: Shelf): void;
  openDetailModal(
    item: Item,
    shelfContext: { items: Item[]; index: number },
  ): void;
  pushOverlayHistoryState(name: string): void;
  requestOverlayClose(closeFn: () => void): void;
}
