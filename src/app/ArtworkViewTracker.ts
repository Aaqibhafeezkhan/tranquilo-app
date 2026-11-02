export const ARTWORK_VIEW_DWELL_MS = 2000;

interface ViewedItem {
  id: string;
  source: string;
}

export interface ArtworkViewHost {
  activeSlideIndex(): number;
  getSlideRecords(): { item?: ViewedItem | null }[];
  trackEvent(name: string, props?: Record<string, unknown>): void;
  pageLoadId: string;
}

// Item comes from the active record; non-item slides shift indexes.
export class ArtworkViewTracker {
  private counted = new Set<string>();
  private pendingKey: string | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pageVisible = true;

  constructor(private host: ArtworkViewHost) {}

  check(): void {
    const item = this.activeItem();
    const key = item ? `${item.source}:${item.id}` : null;
    if (key === this.pendingKey) return;
    this.cancel();
    if (!item || !key || this.counted.has(key) || !this.pageVisible) return;
    this.pendingKey = key;
    this.timer = setTimeout(() => this.fire(item, key), ARTWORK_VIEW_DWELL_MS);
  }

  setPageVisible(visible: boolean): void {
    this.pageVisible = visible;
    this.cancel();
    if (visible) this.check();
  }

  private activeItem(): ViewedItem | null {
    const idx = this.host.activeSlideIndex();
    if (idx < 0) return null;
    return this.host.getSlideRecords()[idx]?.item ?? null;
  }

  private cancel(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.pendingKey = null;
  }

  private fire(item: ViewedItem, key: string): void {
    this.timer = null;
    this.counted.add(key);
    this.host.trackEvent("artwork_view", {
      source: item.source,
      item_id: item.id,
      page_load_id: this.host.pageLoadId,
    });
  }
}
