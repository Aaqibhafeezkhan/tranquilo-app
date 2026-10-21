// The export confirmation modal ("Your CSV is downloading" plus a Tranquilo Curator
// waitlist link). Purely static, so its host only needs the shared
// overlay-history mechanism; the actual CSV export stays app.js's job,
// this element just owns the confirmation UI shown after. Light DOM, not
// shadow root -- styles already live in css/style.css.

import { escapeHtml } from "../feed/slideBuilder";
import { t } from "../i18n/index";
import type { ITranquiloExportModalHost } from "../types/ITranquiloExportModalHost";
import { on } from "../utils/on";

const exportModalMarkup = () => `
<div class="export-modal-inner">
  <button class="export-modal-close" id="exportModalClose" type="button" aria-label="${escapeHtml(t("detail.close"))}">&times;</button>
  <h2>${escapeHtml(t("export.title"))}</h2>
  <p>${escapeHtml(t("export.body"))}</p>
  <a class="upsell-cta" href="/pages/curator.html">${escapeHtml(t("upsell.cta"))}</a>
</div>
`;

export class TranquiloExportModal extends HTMLElement {
  app: ITranquiloExportModalHost | null = null;

  private closeBtn!: HTMLButtonElement;

  private requireApp(): ITranquiloExportModalHost {
    if (!this.app) {
      throw new Error("<tranquilo-export-modal>: called before app was set");
    }
    return this.app;
  }

  connectedCallback(): void {
    if (this.getAttribute("data-export-modal-mounted") === "1") return;
    this.setAttribute("data-export-modal-mounted", "1");

    this.innerHTML = exportModalMarkup();
    const closeBtn = this.querySelector<HTMLButtonElement>("#exportModalClose");
    if (!closeBtn) {
      throw new Error(
        "<tranquilo-export-modal>: missing #exportModalClose in its own template",
      );
    }
    this.closeBtn = closeBtn;

    on(this.closeBtn, () => {
      this.requireApp().requestOverlayClose(() => this.close());
    });
  }

  open(): void {
    this.classList.add("open");
    this.setAttribute("aria-hidden", "false");
    this.requireApp().pushOverlayHistoryState("exportModal");
  }

  close(): void {
    this.classList.remove("open");
    this.setAttribute("aria-hidden", "true");
  }
}

customElements.define("tranquilo-export-modal", TranquiloExportModal);
