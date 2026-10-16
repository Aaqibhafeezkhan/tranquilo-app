// Loaded by every translated static page (injected by
// vite-plugins/base-template.mts), whatever that page's own script does.
// The page's data-locale is adopted as the visitor's choice on first
// lookup, so moving on to the feed or another page stays in that language
// -- even from a page whose own script never touches src/i18n.
import { applyDocumentLocale } from "./index";

applyDocumentLocale();
