// One shelf's works in a grid, opened from a /shelf/{id} link.
import { ShelfType } from "../enums/ShelfType";
import { escapeHtml, SHARE_SVG } from "../feed/slideBuilder";
import { t, tn } from "../i18n/index";
import type { ITranquiloShelfModeHost } from "../types/ITranquiloShelfModeHost";
import type { Item } from "../types/Item";
import type { RuleShelf, Shelf } from "../types/Shelf";
import { on } from "../utils/on";

// Mirrors lib/shelves.ts's UNSHAREABLE_SHELF_IDS; src/ never imports lib/.
const UNSHAREABLE_SHELF_IDS = new Set(["storylines"]);

export function isShareableShelf(shelf: Shelf | undefined): shelf is Shelf {
  return Boolean(shelf) && !UNSHAREABLE_SHELF_IDS.has((shelf as Shelf).id);
}

const RULE_PAGE_SIZE = 24;

const shelfMarkup = () => `
<div class="shelf-mode-header">
  <div class="shelf-mode-heading">
    <h2 class="shelf-mode-title" id="shelfModeTitle"></h2>
    <div class="shelf-mode-meta">
      <span class="shelf-mode-count" id="shelfModeCount"></span>
      <button class="btn-share shelf-mode-share" id="shelfModeShare" type="button" aria-label="${escapeHtml(t("shelf.share"))}" title="${escapeHtml(t("shelf.share"))}">${SHARE_SVG}</button>
    </div>
  </div>
  <button class="shelf-mode-close" id="shelfModeClose" type="button" aria-label="${escapeHtml(t("shelf.close"))}">&times;</button>
</div>
<div class="shelf-mode-body" id="shelfModeBody">
  <div class="shelf-mode-grid" id="shelfModeGrid"></div>
  <div class="shelf-mode-sentinel" id="shelfModeSentinel"></div>
</div>
`;

export class TranquiloShelfMode extends HTMLElement {
  app: ITranquiloShelfModeHost | null = null;
  // Handed over once by app.ts, read-only.
  shelves: Shelf[] = [];

  private titleEl!: HTMLElement;
  private countEl!: HTMLElement;
  private gridEl!: HTMLElement;
  private sentinelEl!: HTMLElement;

  private shelf: Shelf | null = null;
  private items: Item[] = [];
  private cursor: string | null = null;
  private start = 0;
  private loading = false;
  // Bumped per open; stale responses compare against it.
  private generation = 0;
  private observer: IntersectionObserver | null = null;

  private requireEl<T extends Element>(selector: string): T {
    const el = this.querySelector<T>(selector);
    if (!el) {
      throw new Error(
        `<tranquilo-shelf-mode>: missing ${selector} in its own template`,
      );
    }
    return el;
  }

  private requireApp(): ITranquiloShelfModeHost {
    if (!this.app) {
      throw new Error("<tranquilo-shelf-mode>: called before app was set");
    }
    return this.app;
  }

  connectedCallback(): void {
    if (this.getAttribute("data-shelf-mode-mounted") === "1") return;
    this.setAttribute("data-shelf-mode-mounted", "1");

    this.innerHTML = shelfMarkup();
    this.titleEl = this.requireEl("#shelfModeTitle");
    this.countEl = this.requireEl("#shelfModeCount");
    this.gridEl = this.requireEl("#shelfModeGrid");
    this.sentinelEl = this.requireEl("#shelfModeSentinel");

    on(this.requireEl("#shelfModeClose"), () => {
      this.requireApp().requestOverlayClose(() => this.close());
    });
    on(this.requireEl("#shelfModeShare"), () => {
      if (this.shelf) this.requireApp().shareShelf(this.shelf);
    });
  }

  // Takes a title slug or, for older links, an id. False if unknown.
  open(key: string): boolean {
    const shelf =
      this.shelves.find((s) => s.slug === key) ||
      this.shelves.find((s) => s.id === key);
    if (!isShareableShelf(shelf)) return false;
    const host = this.requireApp();

    this.generation++;
    this.shelf = shelf;
    this.items = [];
    this.cursor = null;
    this.start = Math.random();
    this.loading = false;
    this.titleEl.textContent = shelf.title;
    this.countEl.textContent = "";
    this.gridEl.innerHTML = "";
    this.requireEl<HTMLElement>("#shelfModeBody").scrollTop = 0;

    host.trackEvent("shelf_open", { shelf_id: shelf.id });
    this.show();
    host.pushOverlayHistoryState("shelf");

    // Rule shelves skip minItems; that gate is Discover-only.
    if (shelf.type === ShelfType.Hero) {
      this.loadHero(shelf.itemIds.map(String));
    } else {
      this.loadRuleCount(shelf);
      this.loadRulePage(shelf);
      this.watchSentinel(shelf);
    }
    return true;
  }

  close(): void {
    this.hide();
    this.observer?.disconnect();
  }

  // No re-render or history push; keeps grid and scroll position.
  restore(): void {
    this.show();
  }

  private show(): void {
    this.classList.add("open");
    this.setAttribute("aria-hidden", "false");
  }

  private hide(): void {
    this.classList.remove("open");
    this.setAttribute("aria-hidden", "true");
  }

  private loadHero(ids: string[]): void {
    const host = this.requireApp();
    const generation = this.generation;
    host
      .resolveItemsByIds(ids)
      .then((items) => host.hydrateItems(items).then(() => items))
      .then((items) => {
        if (generation !== this.generation) return;
        this.countEl.textContent = tn("shelf.works", items.length);
        this.appendCards(items);
      })
      .catch((err) => {
        console.error("items: shelf lookup failed", err);
      });
  }

  private loadRuleCount(shelf: RuleShelf): void {
    const host = this.requireApp();
    const generation = this.generation;
    host
      .fetchJson(
        host.apiUrl({ shape: "count", ...shelf.filter }),
        "shelf count",
      )
      .then((body) => {
        if (generation !== this.generation) return;
        this.countEl.textContent = tn("shelf.works", body.total || 0);
      })
      .catch((err) => {
        console.error("items: shelf count failed", err);
      });
  }

  // Loops because the shuffle wrap can end a page early.
  private loadRulePage(shelf: RuleShelf): void {
    if (this.loading) return;
    const host = this.requireApp();
    const generation = this.generation;
    const gathered: Item[] = [];
    this.loading = true;

    const step = (): Promise<void> => {
      const params: Record<string, unknown> = {
        shape: "manifest",
        order: "shuffle",
        limit: RULE_PAGE_SIZE,
        ...shelf.filter,
      };
      if (this.cursor) params.cursor = this.cursor;
      else params.start = this.start;
      return host.fetchJson(host.apiUrl(params), "shelf").then((body) => {
        if (generation !== this.generation) return;
        gathered.push(...host.absorbPage(body.items || []));
        this.cursor = body.next_cursor ?? null;
        if (this.cursor && gathered.length < RULE_PAGE_SIZE) return step();
      });
    };

    step()
      .then(() => host.hydrateItems(gathered))
      .then(() => {
        if (generation !== this.generation) return;
        this.appendCards(gathered);
      })
      .catch((err) => {
        console.error("items: shelf page failed", err);
      })
      .finally(() => {
        if (generation === this.generation) this.loading = false;
      });
  }

  private watchSentinel(shelf: RuleShelf): void {
    this.observer?.disconnect();
    if (typeof IntersectionObserver === "undefined") return;
    this.observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        if (this.cursor && this.shelf === shelf) this.loadRulePage(shelf);
      },
      { root: this.requireEl("#shelfModeBody"), rootMargin: "400px" },
    );
    this.observer.observe(this.sentinelEl);
  }

  private appendCards(items: Item[]): void {
    const host = this.requireApp();
    for (const item of items) {
      this.items.push(item);
      const index = this.items.length - 1;
      const card = document.createElement("button");
      card.type = "button";
      card.className = "shelf-mode-card";
      const title = item.title || "Untitled";
      card.innerHTML = `<img src="${escapeHtml(item.img)}" alt="${escapeHtml(title)}" loading="lazy" decoding="async"><span class="shelf-mode-card-title">${escapeHtml(title)}</span>`;
      host.applyNudityGate(card, item, true);
      on(card, () => {
        this.hide();
        host.openDetailModal(item, { items: this.items, index });
      });
      this.gridEl.appendChild(card);
    }
  }
}

customElements.define("tranquilo-shelf-mode", TranquiloShelfMode);
