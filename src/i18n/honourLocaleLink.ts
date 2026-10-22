// Loaded by every English static page (injected by
// vite-plugins/base-template.mts). Most of them never touch src/i18n
// themselves, so without this a ?lang= link -- the language switcher on a
// translated page links here with ?lang=en -- would show the English page
// but leave the old choice stored, and the feed afterwards would still be
// in that language. Only records the choice: the page itself is English
// whatever was chosen, so <html lang> is left as built.
import { applyLocaleParam } from "./index";

applyLocaleParam();
