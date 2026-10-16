import tranquiloIconLightUrl from "../../assets/tranquilo-icon-light.svg";
import { t, tn } from "../i18n/index";
import { roundedWorkCount } from "../logic/logic";
import { escapeHtml } from "./slideBuilder";

// One of the three homepage action cards. `action` is either a plain link
// (Mission, Support) or a button that opens the newsletter modal (Connect).
// The icon sits in its own row with the title (.action-card-title-row) so
// it can lay out as a small inline mark beside the title on a phone, and
// the button lives outside .action-card-body so it can stack under the
// text on a phone and pin to the card's bottom everywhere wider -- see the
// .action-card rules in css/style.css.
function actionCard({
  icon,
  title,
  body,
  action,
  attrs = "",
}: {
  icon: string;
  title: string;
  body: string;
  action: string;
  attrs?: string;
}): string {
  return (
    `<div class="action-card"${attrs}>` +
    `<div class="action-card-body">` +
    `<div class="action-card-title-row">` +
    `<div class="icon-chip" aria-hidden="true">${icon}</div>` +
    `<h2>${title}</h2>` +
    `</div>` +
    `<p>${body}</p>` +
    `</div>` +
    action +
    `</div>`
  );
}

// Text comes from src/i18n. These slides are built as HTML strings, so every
// t() result is escaped on the way in -- translations are contributed text
// and must never be parsed as markup.
const h = (s: string) => escapeHtml(s);

// The feed's two static, catalogue-independent slides -- the intro trailer
// and the "nothing collected yet" placeholder for My Collection. Neither
// reads or builds an Item, so they live in their own module rather than
// alongside slideBuilder.ts.
export function buildIntroSlide(facets: {
  sources?: unknown[];
  total?: number;
}): HTMLElement {
  // Computed at render time from ?shape=facets, not by iterating `items`
  // (which now holds only scrolled-through pages, not the whole catalogue).
  const sourceCount = (facets.sources || []).length;
  const liveCount = facets.total || 0;
  const el = document.createElement("section");
  el.className = "slide intro";
  el.innerHTML =
    // Light icon, not violet: this slide sits on the near-black ground
    // with no artwork behind it, unlike the top bar's scrim over a painting.
    `<div class="intro-lockup-wrap">` +
    `<img class="intro-lockup" src="${tranquiloIconLightUrl}" ` +
    `alt="" aria-hidden="true" width="150" height="245">` +
    `<div class="intro-lockup-word">Tranquilo.art</div>` +
    `</div>` +
    `<h1 class="visually-hidden">${h(t("intro.heading"))}</h1>` +
    `<div class="intro-rule"></div>` +
    `<p>${h(tn("intro.tagline", sourceCount, { works: roundedWorkCount(liveCount) }))}</p>` +
    `<div class="action-cards">` +
    actionCard({
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`,
      title: h(t("intro.mission.title")),
      body: h(t("intro.mission.body")),
      action: `<a class="action-card-btn" href="/pages/get-involved.html">${h(t("intro.mission.cta"))}</a>`,
    }) +
    actionCard({
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="m22 6-10 7L2 6"></path></svg>`,
      title: h(t("intro.connect.title")),
      body: h(t("intro.connect.body")),
      action: `<button type="button" class="action-card-btn" data-open-newsletter>${h(t("intro.connect.cta"))}</button>`,
    }) +
    // Marked data-donations on the whole card, not just the link, so the
    // donations kill switch (tests/donations-flag.test.ts) hides the icon
    // and copy along with the button rather than leaving a headless card.
    actionCard({
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>`,
      title: h(t("intro.support.title")),
      body: h(t("intro.support.body")),
      action: `<a class="action-card-btn" href="/pages/support.html">${h(t("intro.support.cta"))}</a>`,
      attrs: " data-donations",
    }) +
    `</div>`;
  return el;
}

export function buildEmptyCollectionSlide(): HTMLElement {
  const el = document.createElement("section");
  el.className = "slide intro";
  // The title's line break is a newline in the string, rendered by
  // white-space: pre-line (css/style.css), so translations can place it.
  el.innerHTML =
    `<div class="intro-eyebrow">${h(t("collection.empty.eyebrow"))}</div>` +
    `<h1>${h(t("collection.empty.title"))}</h1>` +
    `<div class="intro-rule"></div>` +
    `<p>${h(t("collection.empty.body"))}</p>`;
  return el;
}
