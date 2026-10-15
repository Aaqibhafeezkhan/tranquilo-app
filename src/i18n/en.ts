// English UI strings -- the source of truth. MessageKey is derived from
// this object, so every t("...") call is checked against it at typecheck,
// and every other language's dictionary is typed as a partial copy of it
// (a misspelled key in a translation file fails typecheck too).
//
// Conventions:
//   - Keys are flat and namespaced by component: "upsell.cta".
//   - {name} placeholders are filled by t(key, { name }).
//   - Plurals are sibling keys ending in a CLDR plural category --
//     "works.count.one" / "works.count.other" -- looked up with
//     tn("works.count", n). Always include ".other".
//   - Plain text only. Components insert strings with textContent or
//     setAttribute, never innerHTML, so markup here would show literally.

export const en = {
  // <tranquilo-upsell-toast>
  "upsell.body":
    "Saved temporarily in this browser. Permanent collections and organization are part of Pro, still taking shape.",
  "upsell.cta": "Join the waitlist",
  "upsell.dismiss": "Dismiss",
} as const;

export type MessageKey = keyof typeof en;

/** A translation: any subset of the English keys. Missing keys fall back. */
export type Dictionary = Partial<Record<MessageKey, string>>;
