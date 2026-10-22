// The top bar (wordmark, the search/discover/collection/music button group, the
// category chip row and its overflow menu, and the filter banner), as a
// native custom element.
//
// app.ts hands it a plain object implementing ITopbarHost via a property
// assignment, not an attribute, since HTML attributes can only hold
// strings and this needs live functions. The topbar calls into that
// object on every interaction; app.ts calls back into the topbar via the
// setter methods below whenever its own state changes. Neither side
// reaches into the other's internals.
//
// Renders into light DOM: every style already lives in css/style.css.
// Light DOM also keeps every id this file renders reachable via plain
// getElementById, both from app.js's remaining direct references and the
// existing Playwright suite.

// A real asset import, not a hardcoded "/assets/..." path -- Vite hashes
// build output filenames, so a string literal in a template can't resolve
// once bundled. This gives the real, current URL either way.
import tranquiloFlowerVioletUrl from "../../assets/tranquilo-flower-violet.svg";
import type { ArtistProfile } from "../data/artist-profiles";
import {
  currentLocale,
  facetLabel,
  pagePath,
  setLocale,
  switcherLocales,
  t,
  tn,
} from "../i18n/index";
import type { ITopbarHost } from "../types/ITopbarHost";
import { on } from "../utils/on";

// Duplicated rather than imported from app.ts/slideBuilder.ts: small,
// fully static, cheaper to copy once than to add an import for -- same
// call TranquiloDetailModal.ts already made for its own copy.
function escapeHtml(str: unknown): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Built when the element mounts (not at module load) and escaped on the way
// in: text comes from src/i18n, and translations are contributed text that
// must never be parsed as markup. The icon buttons repeat their label as a
// title so a pointer user gets a hover tooltip; the collection button's
// aria-label later gains a count (setCollectionCount), its title doesn't.
const h = (s: string) => escapeHtml(s);
const topbarMarkup = () => `
<div class="share-banner" id="shareBanner" style="display:none;">
  <span>${h(t("topbar.shareBanner.text"))}</span>
  <div class="share-banner-actions">
    <button id="shareBannerNewsletter" type="button" data-open-newsletter><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="m22 6-10 7L2 6"></path></svg>${h(t("topbar.shareBanner.newsletter"))}</button>
    <a id="shareBannerInvolved" href="${pagePath("get-involved.html")}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>${h(t("topbar.shareBanner.involved"))}</a>
    <button id="shareBannerClose" type="button" aria-label="${h(t("topbar.shareBanner.dismiss"))}">&times;</button>
  </div>
</div>
<div class="topbar-row1">
  <a class="wordmark" href="/" aria-label="${h(t("topbar.home"))}"><img class="wordmark-mark" src="${tranquiloFlowerVioletUrl}" alt="" width="30" height="41" aria-hidden="true"><span>Tranquilo</span></a>
  <div class="topbar-icons" role="group">
    <button class="search-toggle" id="searchToggle" type="button" aria-label="${h(t("topbar.search"))}" title="${h(t("topbar.search"))}">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
    </button>
    <button class="discover-toggle" id="discoverToggle" type="button" aria-label="${h(t("topbar.discover"))}" title="${h(t("topbar.discover"))}">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
    </button>
    <button class="collection-toggle" id="collectionToggle" type="button" aria-label="${h(t("topbar.collection.label"))}" title="${h(t("topbar.collection.label"))}">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg><span class="collection-count" id="collectionCount" aria-hidden="true"></span>
    </button>
    <button class="music-toggle" id="musicToggle" type="button" aria-pressed="false" aria-label="${h(t("topbar.music"))}" title="${h(t("topbar.music"))}">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
    </button>${languageToggleMarkup()}
  </div>
</div>
<nav class="chips" id="chips"></nav>
<div class="filter-banner" id="filterBanner" style="display:none;">
  <span id="filterBannerLabel"></span>
  <button id="filterBannerExport" type="button" style="display:none;">${h(t("topbar.filter.export"))}</button>
  <button id="filterBannerClear" type="button">${h(t("topbar.filter.clear"))} &times;</button>
</div>
<div class="filter-banner-card" id="filterBannerCard" style="display:none;"></div>
`;

// The language switcher's globe closes the icon group. Icon-only, like its
// neighbours, so a longer translation can't push the top bar onto another
// line on a phone; the menu lists languages by their own names (never
// flags, which name countries), so it grows to any number of them. Not
// rendered at all when there is nothing to switch to -- see
// switcherLocales() for which languages appear.
function languageToggleMarkup(): string {
  if (switcherLocales().length < 2) return "";
  const name = h(t("language.label"));
  return `
    <button class="language-toggle" id="languageToggle" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="languageMenu" aria-label="${name}" title="${name}">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
    </button>`;
}

// Text already on screen was drawn in the old language and components
// don't re-render on a locale change, so a switch reloads the page.
// ?lang= is dropped first: on a preview link it would otherwise win again
// on the reload and undo the choice just made.
function switchLanguage(code: string): void {
  setLocale(code);
  const url = new URL(location.href);
  url.searchParams.delete("lang");
  history.replaceState(history.state, "", url);
  location.reload();
}

export class TranquiloTopbar extends HTMLElement {
  app: ITopbarHost | null = null;

  private chipsEl!: HTMLElement;
  private shareBannerEl!: HTMLElement;
  private filterBannerEl!: HTMLElement;
  private filterBannerLabelEl!: HTMLElement;
  private filterBannerExportEl!: HTMLButtonElement;
  private filterBannerCardEl!: HTMLElement;
  private musicToggleEl!: HTMLButtonElement;
  private searchToggleEl!: HTMLButtonElement;
  private collectionToggleEl!: HTMLButtonElement;
  private collectionCountEl!: HTMLElement;

  // The chips row's overflow ("More") menu. .chips is overflow-x:auto
  // with the scrollbar suppressed, unreachable with a mouse, so past
  // 720px wide this menu keeps the row one line tall instead of wrapping.
  // Mobile is untouched, since swiping is correct on touch there.
  private chipsMoreBtn: HTMLButtonElement | null = null;
  private chipsMoreMenu: HTMLDivElement | null = null;
  private chipsReflowTimer: ReturnType<typeof setTimeout> | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private filterBannerResizeObserver: ResizeObserver | null = null;

  // Throws a clear error instead of a silent null if topbarMarkup() and a
  // selector below ever drift apart.
  private requireEl<T extends Element>(selector: string): T {
    const el = this.querySelector<T>(selector);
    if (!el)
      throw new Error(
        `<tranquilo-topbar>: missing ${selector} in its own template`,
      );
    return el;
  }

  connectedCallback(): void {
    this.classList.add("topbar");
    // The markup this replaces was a <header>, with an implicit `banner`
    // landmark role -- a custom element gets no such default.
    this.setAttribute("role", "banner");
    if (this.getAttribute("data-topbar-mounted") === "1") return;
    this.setAttribute("data-topbar-mounted", "1");

    this.innerHTML = topbarMarkup();
    this.chipsEl = this.requireEl<HTMLElement>("#chips");
    this.shareBannerEl = this.requireEl<HTMLElement>("#shareBanner");
    const shareBannerNewsletterEl = this.requireEl<HTMLButtonElement>(
      "#shareBannerNewsletter",
    );
    const shareBannerInvolvedEl = this.requireEl<HTMLAnchorElement>(
      "#shareBannerInvolved",
    );
    const shareBannerCloseEl =
      this.requireEl<HTMLButtonElement>("#shareBannerClose");
    this.filterBannerEl = this.requireEl<HTMLElement>("#filterBanner");
    this.filterBannerLabelEl =
      this.requireEl<HTMLElement>("#filterBannerLabel");
    this.filterBannerExportEl = this.requireEl<HTMLButtonElement>(
      "#filterBannerExport",
    );
    this.filterBannerCardEl = this.requireEl<HTMLElement>("#filterBannerCard");
    this.musicToggleEl = this.requireEl<HTMLButtonElement>("#musicToggle");
    this.searchToggleEl = this.requireEl<HTMLButtonElement>("#searchToggle");
    this.collectionToggleEl =
      this.requireEl<HTMLButtonElement>("#collectionToggle");
    this.collectionCountEl = this.requireEl<HTMLElement>("#collectionCount");
    const discoverToggleEl =
      this.requireEl<HTMLButtonElement>("#discoverToggle");
    const filterBannerClearEl =
      this.requireEl<HTMLButtonElement>("#filterBannerClear");

    this.setUpLanguageMenu();
    on(this.musicToggleEl, () => this.app?.onMusicToggle());
    on(this.searchToggleEl, () => this.app?.onSearchToggle());
    on(discoverToggleEl, () => this.app?.onDiscoverToggle());
    on(this.collectionToggleEl, () => this.app?.onCollectionToggle());
    on(filterBannerClearEl, () => this.app?.onFilterBannerClear());
    on(this.filterBannerExportEl, () => this.app?.onFilterBannerExport());
    on(shareBannerCloseEl, () => {
      this.hideShareBanner();
      this.app?.onShareBannerDismiss();
    });
    // Fires alongside (not instead of) TranquiloNewsletterModal's own
    // delegated [data-open-newsletter] document listener, which actually
    // opens the dialog -- this just reports the click for the funnel.
    on(shareBannerNewsletterEl, () =>
      this.app?.onShareBannerCtaClick("newsletter"),
    );
    on(shareBannerInvolvedEl, () =>
      this.app?.onShareBannerCtaClick("get_involved"),
    );

    // --topbar-h stays in sync with the topbar's actual rendered height
    // (it grows on mobile, two rows) so .search-bar/.filter-banner can
    // position below it instead of a guessed constant. Self-managed since
    // it's the topbar's own height.
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => {
        document.documentElement.style.setProperty(
          "--topbar-h",
          `${this.offsetHeight}px`,
        );
      });
      this.resizeObserver.observe(this);
    }
    // Set once synchronously too -- a ResizeObserver's first callback
    // fires on a later frame, and the search bar/filter banner position
    // off this var from the very first paint.
    document.documentElement.style.setProperty(
      "--topbar-h",
      `${this.offsetHeight}px`,
    );

    // Same pattern for --filter-banner-h: the banner can wrap to a second
    // line on a narrow viewport with a long label, so it stays
    // measurement-driven for its whole life, not just when it appears.
    // Observes both #filterBanner and #filterBannerCard (a sibling, not a
    // child -- see updateFilterBannerHeight()'s own comment on why) so the
    // feed push accounts for the card's height too, not just the row's.
    if (typeof ResizeObserver !== "undefined") {
      this.filterBannerResizeObserver = new ResizeObserver(() =>
        this.updateFilterBannerHeight(),
      );
      this.filterBannerResizeObserver.observe(this.filterBannerEl);
      this.filterBannerResizeObserver.observe(this.filterBannerCardEl);
    }

    on(window, "resize", () => {
      if (this.chipsReflowTimer) clearTimeout(this.chipsReflowTimer);
      this.chipsReflowTimer = setTimeout(() => {
        this.reflowChips();
        this.positionChipsMenu();
      }, 120);
    });
  }

  // ---- Language menu ----

  // Appended to the host rather than inside .topbar-icons, which clips its
  // overflow -- same reason the chips' More menu lives here.
  private setUpLanguageMenu(): void {
    const toggle = this.querySelector<HTMLButtonElement>("#languageToggle");
    if (!toggle) return;
    // Not <html lang>: this runs while modules are still evaluating, which
    // can be before startup has set it.
    const current = currentLocale();
    const menu = document.createElement("div");
    menu.id = "languageMenu";
    menu.hidden = true;
    menu.setAttribute("aria-label", t("language.label"));
    for (const { code, nativeName } of switcherLocales()) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "chip";
      item.lang = code;
      item.textContent = nativeName;
      if (code === current) {
        item.classList.add("active");
        item.setAttribute("aria-current", "true");
      }
      on(item, () => {
        if (code === current) this.closeLanguageMenu();
        else switchLanguage(code);
      });
      menu.appendChild(item);
    }
    this.appendChild(menu);

    on(toggle, (e) => {
      e.stopPropagation();
      if (menu.hidden) this.openLanguageMenu();
      else this.closeLanguageMenu();
    });
    on(document, (e) => {
      if (menu.hidden || menu.contains(e.target as Node)) return;
      this.closeLanguageMenu();
    });
    on(document, "keydown", (e) => {
      if (e.key !== "Escape" || menu.hidden) return;
      this.closeLanguageMenu();
      toggle.focus();
    });
    on(window, "resize", () => this.positionLanguageMenu());
  }

  private openLanguageMenu(): void {
    const menu = this.querySelector<HTMLElement>("#languageMenu");
    const toggle = this.querySelector<HTMLElement>("#languageToggle");
    if (!menu || !toggle) return;
    menu.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    this.positionLanguageMenu();
    menu.querySelector<HTMLElement>("[aria-current]")?.focus();
  }

  private closeLanguageMenu(): void {
    const menu = this.querySelector<HTMLElement>("#languageMenu");
    if (menu) menu.hidden = true;
    this.querySelector("#languageToggle")?.setAttribute(
      "aria-expanded",
      "false",
    );
  }

  // Right-aligned under the globe: it sits at the screen's right edge, so a
  // left-anchored panel would run off it.
  private positionLanguageMenu(): void {
    const menu = this.querySelector<HTMLElement>("#languageMenu");
    const toggle = this.querySelector<HTMLElement>("#languageToggle");
    if (!menu || !toggle || menu.hidden) return;
    const btn = toggle.getBoundingClientRect();
    const bar = this.getBoundingClientRect();
    menu.style.top = `${btn.bottom - bar.top + 6}px`;
    menu.style.left = "auto";
    menu.style.right = `${bar.right - btn.right}px`;
  }

  // ---- Chips ----

  // `categories` is passed in on every call and this rebuilds the whole
  // row, which is why setCollectionCount() avoids calling this: rebuilding
  // resets the row's horizontal scroll, and saving an item shouldn't snap
  // a mid-browse chip row back to the start.
  setChips(
    categories: readonly string[],
    activeCategory: string,
    opts: { collectionActive: boolean; storylineActive: boolean },
  ): void {
    this.chipsEl.innerHTML = "";
    // A full rebuild owns the More menu's contents too: chips parked there
    // by the previous build are stale, and reflowChips() would otherwise
    // move them back into the row next to their replacements. (reflowChips
    // itself must not wipe the menu -- on a resize-only reflow the parked
    // chips are the only copies.)
    if (this.chipsMoreMenu) this.chipsMoreMenu.innerHTML = "";
    categories.forEach((cat) => {
      const chip = document.createElement("button");
      chip.className = `chip${cat === activeCategory && !opts.collectionActive ? " active" : ""}`;
      // The stored category value drives behaviour (dataset + the select
      // handler); the visible text is only its translated label, so
      // nothing below may compare against textContent.
      chip.dataset.category = cat;
      chip.textContent =
        cat === "All" ? t("chips.all") : facetLabel("category", cat);
      on(chip, () => this.app?.onCategorySelect(cat));
      this.chipsEl.appendChild(chip);
    });

    // The Storyline toggle sits at the end of the same row, singular to
    // match the item-level chip's wording.
    const storylineChip = document.createElement("button");
    storylineChip.id = "storylineChip";
    // No bespoke class: .chip.active already reads as related to the
    // item-level chip's own active color without inventing a variant.
    storylineChip.className = `chip${opts.storylineActive ? " active" : ""}`;
    storylineChip.textContent = t("chips.storyline");
    storylineChip.setAttribute(
      "aria-pressed",
      opts.storylineActive ? "true" : "false",
    );
    on(storylineChip, () => this.app?.onStorylineFilterToggle());
    this.chipsEl.appendChild(storylineChip);
    this.reflowChips();
  }

  private chipsOverflowEnabled(): boolean {
    return window.matchMedia("(min-width: 720px)").matches;
  }

  private closeChipsMenu(): void {
    if (this.chipsMoreMenu) this.chipsMoreMenu.hidden = true;
    if (this.chipsMoreBtn)
      this.chipsMoreBtn.setAttribute("aria-expanded", "false");
  }

  // Both nodes are always created together (first call only) -- returning
  // them lets callers use a local, non-null reference instead of
  // re-reading the nullable instance fields.
  private ensureChipsMoreNodes(): {
    btn: HTMLButtonElement;
    menu: HTMLDivElement;
  } {
    if (this.chipsMoreBtn && this.chipsMoreMenu) {
      return { btn: this.chipsMoreBtn, menu: this.chipsMoreMenu };
    }

    const menu = document.createElement("div");
    menu.id = "chipsMoreMenu";
    menu.hidden = true;
    // Appended to the topbar host, not .chips: .chips is an overflow
    // container and would clip a panel inside it.
    this.appendChild(menu);

    const btn = document.createElement("button");
    btn.id = "chipsMore";
    btn.type = "button";
    btn.className = "chip chip-more";
    btn.setAttribute("aria-haspopup", "true");
    btn.setAttribute("aria-expanded", "false");
    btn.textContent = t("chips.more");
    on(btn, (e) => {
      e.stopPropagation();
      const open = menu.hidden;
      menu.hidden = !open;
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) this.positionChipsMenu();
    });

    on(document, (e) => {
      if (menu.hidden) return;
      if (menu.contains(e.target as Node) || btn.contains(e.target as Node))
        return;
      this.closeChipsMenu();
    });
    on(document, "keydown", (e) => {
      if (e.key === "Escape") this.closeChipsMenu();
    });

    this.chipsMoreBtn = btn;
    this.chipsMoreMenu = menu;
    return { btn, menu };
  }

  // Anchors the panel under the button that summons it. Measured in JS
  // since the panel can't live inside .chips, so there's no positioned
  // ancestor that tracks the button.
  private positionChipsMenu(): void {
    if (!this.chipsMoreMenu || !this.chipsMoreBtn || this.chipsMoreMenu.hidden)
      return;
    const btn = this.chipsMoreBtn.getBoundingClientRect();
    const bar = this.getBoundingClientRect();
    this.chipsMoreMenu.style.right = "auto";
    this.chipsMoreMenu.style.top = `${btn.bottom - bar.top + 6}px`;
    this.chipsMoreMenu.style.left = `${btn.left - bar.left}px`;
    // Clamp to the viewport: a menu from a button near the right edge
    // would otherwise run off the screen.
    const menu = this.chipsMoreMenu.getBoundingClientRect();
    const overflowRight = menu.right - (window.innerWidth - 12);
    if (overflowRight > 0) {
      this.chipsMoreMenu.style.left = `${btn.left - bar.left - overflowRight}px`;
    }
  }

  // Moves trailing category chips into the menu until the row fits on one
  // line. "All" stays put, since it's the reset, and so does the
  // Storyline toggle, a different kind of control.
  private reflowChips(): void {
    if (!this.chipsEl) return;
    // Put everything back in the row before measuring. Never clear the
    // menu by wiping innerHTML: this also runs on resize without a
    // preceding setChips(), so parked chips are the only copies of themselves.
    const returnChipsToRow = () => {
      const menu = this.chipsMoreMenu;
      if (!menu) return;
      const parked = Array.from(menu.children);
      const anchor = this.querySelector("#storylineChip");
      for (const child of parked) {
        this.chipsEl.insertBefore(child, anchor || this.chipsMoreBtn || null);
      }
    };

    if (!this.chipsOverflowEnabled()) {
      returnChipsToRow();
      if (this.chipsMoreBtn?.parentNode) this.chipsMoreBtn.remove();
      this.closeChipsMenu();
      return;
    }
    const { btn: moreBtn, menu: moreMenu } = this.ensureChipsMoreNodes();
    returnChipsToRow();
    this.closeChipsMenu();
    this.chipsEl.appendChild(moreBtn);
    moreBtn.hidden = false;

    const movable = () =>
      Array.from(this.chipsEl.children).filter((c) => {
        // Never bury the active filter -- otherwise the only indication
        // of what's filtering the page hides inside a closed menu, and
        // picking from the menu would make the chosen chip vanish back
        // into it.
        return (
          c !== moreBtn &&
          c.id !== "storylineChip" &&
          (c as HTMLElement).dataset.category !== "All" &&
          !c.classList.contains("active")
        );
      });
    // Guard against a pathological loop: at most one pass per chip.
    let budget = movable().length;
    while (
      budget-- > 0 &&
      this.chipsEl.scrollWidth > this.chipsEl.clientWidth + 1
    ) {
      const candidates = movable();
      if (!candidates.length) break;
      const last = candidates[candidates.length - 1];
      moreMenu.insertBefore(last, moreMenu.firstChild);
    }

    const overflowed = moreMenu.children.length > 0;
    moreBtn.hidden = !overflowed;
    if (!overflowed && moreBtn.parentNode) moreBtn.remove();
  }

  // ---- Filter banner ----
  // The chips row is suppressed while a filter banner is up, since the
  // banner already says what the feed is showing. display:none (not
  // visibility:hidden) collapses the row's height, and --topbar-h is
  // written synchronously rather than waiting for the ResizeObserver, so
  // whatever sits below moves up in the same frame.
  private setChipsHidden(hidden: boolean): void {
    this.chipsEl.style.display = hidden ? "none" : "";
    document.documentElement.style.setProperty(
      "--topbar-h",
      `${this.offsetHeight}px`,
    );
  }

  // #filterBannerCard is a sibling of #filterBanner, not a child of it --
  // it has to render as its own full-width line at desktop widths (see its
  // CSS rule's comment), which a single row-flex item can't do while also
  // sharing a line with the wordmark/icons. That means its height isn't
  // part of #filterBanner's own offsetHeight, so --filter-banner-h (what
  // #feed.filter-push subtracts) has to sum both rather than read one.
  private updateFilterBannerHeight(): void {
    if (this.filterBannerEl.style.display === "none") return;
    const cardH =
      this.filterBannerCardEl.style.display === "none"
        ? 0
        : this.filterBannerCardEl.offsetHeight;
    document.documentElement.style.setProperty(
      "--filter-banner-h",
      `${this.filterBannerEl.offsetHeight + cardH}px`,
    );
  }

  // Full show: label, layout, hides the chip row, sizes --filter-banner-h.
  // app.js still owns the surrounding feed-scroll compensation; this only
  // does the topbar's own part of that synchronous DOM write.
  showFilterBanner(html: string): void {
    this.filterBannerLabelEl.innerHTML = html;
    this.filterBannerEl.style.display = "flex";
    this.setChipsHidden(true);
    this.updateFilterBannerHeight();
  }

  // Full hide: also resets the export button and restores the chip row.
  hideFilterBanner(): void {
    this.filterBannerEl.style.display = "none";
    this.filterBannerExportEl.style.display = "none";
    this.setArtistProfile(null);
    this.setChipsHidden(false);
  }

  // A raw display toggle, short of hideFilterBanner()'s full reset --
  // app.js's openSearch() uses this to hide the banner (and any open card)
  // while the search panel covers that space without losing the export
  // button's visibility or the remembered label/card, both restored once
  // the panel closes.
  setFilterBannerVisible(visible: boolean): void {
    this.filterBannerEl.style.display = visible ? "flex" : "none";
    if (this.filterBannerCardEl.innerHTML) {
      this.filterBannerCardEl.style.display = visible ? "block" : "none";
    }
  }

  setFilterBannerExportVisible(visible: boolean): void {
    this.filterBannerExportEl.style.display = visible ? "inline-block" : "none";
  }

  // Renders inline, immediately -- no chevron, no click to reveal. Shown
  // for every filter mode that resolved a profile (an artist filter or a
  // search matching one by name), hidden otherwise.
  setArtistProfile(profile: ArtistProfile | null): void {
    if (profile) {
      // The inner wrapper (not #filterBannerCard itself) carries the
      // visible card's width cap -- see its CSS rule's comment.
      this.filterBannerCardEl.innerHTML = `<div class="artist-card-inner">${this.renderArtistCard(profile)}</div>`;
      this.filterBannerCardEl.style.display = "block";
      // A fresh filter always lands back on its own first result (every
      // render() path resets scrollTop), so the card should always start
      // visible -- not wherever .is-scrolled happened to be left from
      // whatever was filtered before.
      this.filterBannerCardEl.classList.remove("is-scrolled");
    } else {
      this.filterBannerCardEl.innerHTML = "";
      this.filterBannerCardEl.style.display = "none";
    }
    // The ResizeObserver on filterBannerCardEl (above) would catch this on
    // its own a frame later; calling it synchronously here avoids a
    // one-frame flash of the feed sitting under the card before it's
    // pushed down.
    this.updateFilterBannerHeight();
  }

  // Collapses the card (CSS max-height/opacity transition, see its rule)
  // once the visitor scrolls past the first result of whatever's
  // filtered, and restores it on the way back -- app.ts drives this off
  // the feed's own scrollTop, not anything this component tracks itself.
  // A no-op when there's no card to begin with: toggling a class an empty,
  // hidden #filterBannerCard doesn't have content for is harmless.
  setArtistCardScrolled(scrolled: boolean): void {
    this.filterBannerCardEl.classList.toggle("is-scrolled", scrolled);
  }

  // Loosely modeled on a search engine's knowledge panel: photo + name up
  // top, facts and a short description below, a source link last.
  private renderArtistCard(profile: ArtistProfile): string {
    const dates =
      profile.birth || profile.death
        ? `${profile.birth ?? "?"}–${profile.death ?? "?"}`
        : null;
    const nationality = profile.nationality.join(", ") || null;
    const line1 = [dates, nationality].filter(Boolean).join(" · ");
    const line2 = profile.movement.join(", ");
    const sourceHref = profile.article ?? profile.wikidata ?? null;
    const sourceLabel = profile.article
      ? t("artistCard.wikipedia")
      : t("artistCard.wikidata");
    const photoHtml = profile.image
      ? `<img class="artist-card-photo" src="${escapeHtml(profile.image)}" alt="" loading="lazy">`
      : "";
    return (
      `<div class="artist-card-row">${photoHtml}` +
      `<div class="artist-card-text">` +
      `<div class="artist-card-name">${escapeHtml(profile.name)}</div>` +
      (line1
        ? `<div class="artist-card-meta">${escapeHtml(line1)}</div>`
        : "") +
      (line2
        ? `<div class="artist-card-meta artist-card-movement">${escapeHtml(line2)}</div>`
        : "") +
      (profile.description
        ? `<p class="artist-card-bio">${escapeHtml(profile.description)}</p>`
        : "") +
      (sourceHref
        ? `<a class="artist-card-source" href="${escapeHtml(sourceHref)}" target="_blank" rel="noopener">${escapeHtml(sourceLabel)} <span aria-hidden="true">&rarr;</span></a>`
        : "") +
      `</div></div>`
    );
  }

  // Unlike showFilterBanner/hideFilterBanner, this never touches a CSS
  // var of its own: it's plain topbar content, picked up by the existing
  // whole-topbar --topbar-h ResizeObserver above for free, and (unlike
  // --filter-banner-h/--search-bar-h) nothing subtracts its height from
  // #feed/.slide -- it's an overlay, not a push, so it never needs to know
  // its own height.
  showShareBanner(): void {
    this.shareBannerEl.style.display = "flex";
  }

  hideShareBanner(): void {
    this.shareBannerEl.style.display = "none";
  }

  // ---- Icon button state ----

  setMusicActive(on: boolean): void {
    this.musicToggleEl.classList.toggle("active", on);
    this.musicToggleEl.setAttribute("aria-pressed", on ? "true" : "false");
  }

  setSearchActive(on: boolean): void {
    this.searchToggleEl.classList.toggle("active", on);
  }

  setCollectionActive(on: boolean): void {
    this.collectionToggleEl.classList.toggle("active", on);
  }

  // The bookmark button carries three states, since it's the only way
  // into the collection now: empty (outlined, nothing else); has saved
  // items (outlined, count inside the bookmark); viewing them (filled
  // violet, like an active category chip, since it's doing the same job).
  //
  // Capped at 9+: two digits inside a 17px bookmark are unreadable, and
  // past a handful the exact number stops being the point.
  setCollectionCount(n: number): void {
    this.collectionToggleEl.classList.toggle("has-items", n > 0);
    this.collectionCountEl.textContent = n > 9 ? "9+" : n ? String(n) : "";
    // The visible count is aria-hidden, so the button's label carries it
    // for a screen reader.
    this.collectionToggleEl.setAttribute(
      "aria-label",
      n === 0 ? t("topbar.collection.empty") : tn("topbar.collection.count", n),
    );
  }
}

customElements.define("tranquilo-topbar", TranquiloTopbar);
