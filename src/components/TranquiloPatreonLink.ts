// Patreon call to action; shows "opens soon" until config.toml's
// [patreon].url is set.
import { TRANQUILO_CONFIG } from "../data/config.generated";
import { t } from "../i18n/index";
import { patreonLinkHtml, patreonUrl } from "./patreonLink";

export class TranquiloPatreonLink extends HTMLElement {
  connectedCallback(): void {
    this.classList.add("support-patreon");
    this.innerHTML = patreonLinkHtml(patreonUrl(TRANQUILO_CONFIG.patreon.url), {
      body: t("support.patreon.body"),
      join: t("support.patreon.join"),
      soon: t("support.patreon.soon"),
    });
  }
}

customElements.define("tranquilo-patreon-link", TranquiloPatreonLink);
