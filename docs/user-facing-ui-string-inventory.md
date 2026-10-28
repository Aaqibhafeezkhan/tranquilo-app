# User-Facing UI String Inventory

Issue: [#33 — Audit and extract all user-facing UI strings](https://github.com/tranquilo-art/tranquilo-app/issues/33)

Snapshot of `main` as of commit `3b97086`. Copy and message keys change over time, so treat `src/i18n/en.ts` as the source of truth.

## Scope and method

This inventory is based on the current `main` source: the English message catalogue, component templates, app/search/feed helpers, HTML entry points and generated static-page templates. It records user-visible copy and accessibility labels, including loading/error/empty states, button labels, modal chrome, toasts and prompts. Artwork titles, artists, institution names, API error details and catalogue/facet values are data rather than fixed UI copy; they are called out separately where they can appear in the UI.

The application has a central English catalogue at `src/i18n/en.ts`, but some strings are still literal in component code, markup, export output, or the approved AI disclosure. A running-site walkthrough is still the best way to confirm conditional states and responsive variants; this source inventory identifies those states and their owning code so they can be exercised locally with `bun run dev` and offline fixtures.

## 1. Search panel and search results

**Files:** `src/components/TranquiloSearchBar.ts`, `src/app/SearchController.ts`, `src/app.ts`, `src/logic/logic.ts`, `src/i18n/en.ts`.

| UI/state | English copy / accessible text | Source |
|---|---|---|
| Search field | “Search artist, title, category, era…” | `search.placeholder` |
| Submit button | “Run search” | `search.submit` (aria-label) |
| Close button | “Close search” | `search.close` (aria-label) |
| Search history heading | “Recent searches” | `search.recent` |
| Browse suggestions heading | “Browse by” | `search.browseBy` |
| Concept-map result | “Showing pieces related to ‘{concept}’” | `search.related` |
| One result | “{count} result for ‘{query}’” | `search.results.one` |
| Multiple results | “{count} results for ‘{query}’” | `search.results.other` |
| No results | “No results for ‘{query}.’” | `search.noResults` |
| Spelling suggestion | “No results for ‘{query}.’ Did you mean {suggestion}?” | `search.didYouMean` |
| Artist profile links | “Read more on Wikipedia”; “View on Wikidata” | `artistCard.wikipedia`, `artistCard.wikidata` |
| Filter banner | “More by {artist}”; “{title} ({count})” | `filter.moreBy`, `filter.collection` |
| Filter reset | “Show all” | `topbar.filter.clear` |
| Category reset / overflow | “All”; “More”; “Storyline” | `chips.all`, `chips.more`, `chips.storyline` |

Dynamic suggestion labels are produced from catalogue facet values and search vocabulary, not all from literal strings. Search errors are also written to the console (for example, failed autocomplete requests) rather than shown verbatim to visitors. Search empty/dead-end behavior is owned by `SearchController.searchDeadEnd()`; correction and autocomplete rendering are owned by `TranquiloSearchBar`.

## 2. Artwork feed, slide actions and image states

**Files:** `src/feed/slideBuilder.ts`, `src/feed/introSlides.ts`, `src/components/TranquiloFeed.ts`, `src/i18n/en.ts`, `index.html`.

| UI/state | English copy / accessible text | Source |
|---|---|---|
| Initial loading | “Tranquilo” wordmark | `index.html`, `.feed-loading-wordmark` |
| Scroll hint | “scroll to explore” | `feed.scrollHint`, `#scrollHint` |
| Image loading failure | “Couldn’t load image — tap to retry” | `slide.imageError` |
| Potential nudity overlay | “This image may contain nudity. Tap to reveal.”; “May contain nudity”; “Tap to reveal” | `slide.nudity.label`, `slide.nudity.line1`, `slide.nudity.line2` |
| Slide position | “{index} of {total}” | `slide.position` |
| Set position | “{index} of {total} in set” | `slide.setPosition` |
| Storyline chip | “Storyline · {position}” | `slide.storylineChip` |
| Share action | “Copy share link” | `slide.share` |
| Add/remove collection action | “Collect this piece”; “Remove from collection” | `slide.collect.add`, `slide.collect.remove` |
| Generic missing title / artist | “Untitled”; “Unknown” | `common.untitled` plus fallback logic in slide/export code |
| Empty collection | “My Collection”; “Nothing collected\nyet.”; “Tap the bookmark on any piece to start.” | `collection.empty.eyebrow/title/body` |
| Collection toast | “Nothing collected yet” | `collection.toast.empty` |
| Share result | “Link copied”; “Couldn't copy link” | `share.copied`, `share.failed` |

The intro slide also contains three action cards:
- **Mission:** “Mission”, “Open source & ad‑free.”, “Get involved” (`intro.mission.title/body/cta`).
- **Connect:** “Connect”, “Monthly curated art.”, “Subscribe” (`intro.connect.title/body/cta`).
- **Support:** “Support”, “Sustained by community.”, “Give” (`intro.support.title/body/cta`).

The intro tagline is pluralized: “Enjoy calm scrolling with {works} public-domain works across {count} source/sources.” (`intro.tagline.one/other`). The visually hidden heading is “A calmer way to scroll.” (`intro.heading`).

## 3. Detail modal, citation, reporting, “The Twist” and “Meet the Cast”

**File:** `src/components/TranquiloDetailModal.ts`; shared copy in `src/i18n/en.ts`; source/credit helpers in `src/app/citation.ts` and `src/app/sourceLinks.ts`.

| UI/state | English copy / accessible text | Source |
|---|---|---|
| Close / shelf navigation | “Close”; “Previous in this shelf”; “Next in this shelf” | `detail.close`, `detail.shelfPrev`, `detail.shelfNext` |
| Source headings | “Source”; “Sources”; “Source: {host}”; “Book: {title}” | `detail.source`, `detail.sources`, `detail.sourceHost`, `detail.bookSource` |
| Plot twist section | “The Twist” | `detail.twist` |
| Cast section | “Meet the Cast”; “Possibly {name}”; “No verified detail available yet.” | `detail.cast.title/possibly/noDetail` |
| Fact section | “Did you know?”; “Basic Information” | `detail.fact.didYouKnow/basic` |
| Metadata labels | “Artist”; “Created”; “Material”; “Artist origin”; “Object origin”; “Origin”; “Culture”; “Date of photograph”; “Photographer”; “Provenance”; “Tagged”; “License” | `detail.meta.*` keys in `src/i18n/en.ts` |
| Institution link | “View on {institution}”; “View at {institution}” | `detail.sourceLink.on/at` |
| Citation flow | “Cite this work”; “Copy”; “Copied”; “Couldn't copy” | `detail.cite.button/copy/copied/failed` |
| Report flow | “Report a problem”; “There's an issue with image”; “There's an issue with content”; “I'm having a technical issue (broken link)”; “Tell us more”; “Anything else? (optional)”; “Send” | `detail.report.*` |
| Report success | “Thanks, your feedback has been sent. We'll take a look.” | `detail.report.thanks` |

The metadata values themselves (artist, dates, material, origin, culture, provenance, tags, license and institution name) are catalogue/source data, not fixed interface strings. Some section copy is conditionally rendered based on the fields present on an artwork. The AI disclosure shown with Tea/caption content is deliberately locked outside the normal translation calls: “Drafted with AI help; edited and reviewed by a person.” Its adjacent strings are “Spotted an error?” and the accessible badge label “How this text was written.” The approved wording is documented in `src/i18n/en.ts` and rendered directly in the relevant component code; keep it aligned with `tests/ai-disclosure-static.test.ts`.

## 4. Discover, shelves, Storyline and set-of-works modes

**Files:** `src/components/TranquiloShelvesMode.ts`, `src/components/TranquiloShelfMode.ts`, `src/components/TranquiloStorylineMode.ts`, `src/components/TranquiloSetOfWorksMode.ts`, `src/i18n/en.ts`.

| UI/state | English copy / accessible text | Source |
|---|---|---|
| Discover navigation | “Tranquilo, back to the homepage”; “Discover”; “Close discover” | `shelves.home/title/close` |
| Storyline shelf | “Storylines”; “Curated stories behind the art” | `shelves.storylines.title/subtitle` |
| Mood shelves | “Shelves, Curated by Hand”; “Pick a mood and enjoy” | `shelves.moods.title/subtitle` |
| Shelf controls | “Close shelf”; “Copy link to this shelf” | `shelf.close/share` |
| Shelf count | “{count} work”; “{count} works” | `shelf.works.one/other` |
| Storyline controls | “Close storyline”; “Previous page”; “Next page” | `storyline.close/prev/next` |
| First-use hint | “Use the arrows to begin →”; “Swipe to begin →” | `storyline.hint.arrows/swipe` |
| Storyline sharing / progress | “Copy link to this storyline”; “Chapter {index} of {total}”; “Go to chapter {index}” | `storyline.share/chapterOf/goToChapter` |
| Set-of-works action | “View details” | `setOfWorks.details` |

Chapter titles, storyline narratives, shelf names, shelf descriptions and artwork names are content from `src/data/storylines.ts`, `src/data/shelves.ts`, and catalogue records. They appear to visitors but are data/editorial content rather than reusable static UI chrome; record them separately if the audit is expanded to all content data.

## 5. Top bar, collection export, lightbox, toast and support

**Files:** `src/components/TranquiloTopbar.ts`, `src/components/TranquiloExportModal.ts`, `src/components/TranquiloLightbox.ts`, `src/components/TranquiloUpsellToast.ts`, `src/components/TranquiloSupportStrip.ts`, `src/app/ExportService.ts`, `src/i18n/en.ts`.

| UI/state | English copy / accessible text | Source |
|---|---|---|
| Top bar accessible actions | “Tranquilo, back to the top”; “Toggle music”; “Search”; “Discover shelves” | `topbar.home/music/search/discover` |
| Collection button | “My Collection”; “My Collection, empty”; “My Collection, {count} item/items” | `topbar.collection.*` |
| Share banner | “Tranquilo is open source and volunteer-run.”; “Get newsletter”; “Get involved”; “Dismiss” | `topbar.shareBanner.*` |
| Export / clear filter | “Export”; “Show all” | `topbar.filter.export/clear` |
| Temporary collection upsell | “Saved temporarily in this browser. Permanent collections and organization are part of Tranquilo Curator, still taking shape.”; “Join the waitlist”; “Dismiss” | `upsell.body/cta/dismiss` |
| Export confirmation | “Your CSV is downloading”; “Syncing across devices, organized lists, and sharing are part of Tranquilo Curator, still taking shape.” | `export.title/body` |
| Lightbox states | “Loading full resolution…”; “Source record at {institution}”; “Full resolution at {institution}” | `lightbox.*` |
| Support strip | “Tranquilo runs on direct support, not ads.”; “Donations are briefly unavailable. Thank you for wanting to — please try again shortly.”; “Donations open soon.”; “Donate” | `support.strip.*` |
| Donation dialog | “Close”; “Support Tranquilo”; “Every contribution goes to hosting and the quiet cost of keeping this running.”; “Give once”; “Give monthly”; “per month”; payment/privacy note; “Choose your own amount” | `support.dialog.*`, `support.once.note` |
| Patreon link | “Prefer a membership? Join us on Patreon and follow along as Tranquilo grows.”; “Join on Patreon”; “Patreon opens soon.” | `support.patreon.*` |

The export modal confirms the download, while the CSV itself uses literal column headings **Title, Artist, Date, Category, Source, URL** and fallback values **Untitled** and **Unknown** in `src/app/ExportService.ts`. These are user-visible in the downloaded file but are not currently message-catalogue entries. The app-level toast is a generic live region (`#toast` in `index.html`); individual callers pass messages, including copy success/failure and collection feedback. Audit those call sites as part of any future change to toast copy.

## 6. Loading/error and recovery states

**Files:** `src/errorState.ts`, `src/pages/404.ts`, `index.html`, `src/components/TranquiloFeed.ts`, `src/i18n/en.ts`.

- Shared error heading: “We’re having a problem right now, but we’ll be back soon.” (`error.heading`).
- Retry action on the in-app startup fallback: “Try again” (`error.retry`).
- Home action on the static 404: “Back to Tranquilo” (`error.home`).
- Error detail is contextual, e.g. “404 — Page not found” or a short API failure detail. This is assembled at runtime and is not a fixed translation string.
- Error artwork's title, artist, date, medium, credit, license and source-link label are dynamic artwork/source metadata; the source link reuses the detail modal's “View on/at {institution}” strings.

The homepage loading state is the wordmark rather than a sentence. Feed-level image failures have a separate retry prompt listed in section 2. Search autocomplete/API failures are logged and generally fall back to an empty suggestion state rather than exposing raw technical errors.

## 7. Newsletter and static-page forms

**Files:** `src/components/TranquiloNewsletterModal.ts`, `src/pages/about.ts`, `src/pages/curator.ts`, `src/pages/feedback.ts`, `src/pages/submit.ts`, `src/pages/get-involved.ts`, `src/pages/support.ts`, `src/pages/thank-you.ts`, `vite-plugins/base-template.mts`, `vite-plugins/community-partial.mts`, `src/i18n/en.ts`.

| UI/state | English copy / accessible text | Source |
|---|---|---|
| Newsletter modal | “Close”; “Enjoy a monthly art moment”; “A monthly note with curated art. No spam.”; “Subscribe”; “You're on the list — look out for our next note.” | `newsletter.*` |
| Shared form state | “Joining…”; “Something went wrong — please try again in a moment.”; “Email”; “you@example.com”; “Please enter a valid email address.” | `form.*` |
| About / Curator CTA | “Notify me”; “Join the waitlist” | `about.notify.cta`, `curator.cta` |
| Feedback form | “Sending…”; “Send feedback”; “That didn't send. Your message is still here — try again in a moment.” | `feedback.*` |
| Submit form | “Submitting…”; “Submit for review”; “Something went wrong sending this — please try again in a moment.” | `submit.*` |

Static-page headings, explanatory paragraphs, privacy/terms/legal text and form-specific field labels also appear in `pages/*.html` and `src/pages/*.ts`; shared navigation/footer strings are listed in section 8. The Portuguese pages under `pages/pt-BR/` are separate localized page content, not duplicates of English UI chrome.

## 8. Shared static-page navigation, footer and community section

**Files:** `vite-plugins/base-template.mts`, `vite-plugins/community-partial.mts`, `src/i18n/en.ts`.

| UI/state | English copy / accessible text | Source |
|---|---|---|
| Navigation | “Home”; “About”; “Submit”; “Get involved”; “Support us” | `nav.*` |
| Footer | “Feedback”; “Terms & Privacy”; “Tranquilo Curator Waitlist” | `footer.*` |
| Language switcher | “Language” | `language.label` |
| Community section | “Community”; “Tranquilo is built in the open, with help from these people. Thank you.”; “Contributors on GitHub”; “Supporters”; “Patrons on Patreon”; “{handle} on GitHub” | `community.*` |

The page shell is generated at build time from templates, so the visible result comes from `vite-plugins/` plus the page-specific source and localized dictionaries. Inspect the generated pages as well as source templates when verifying the actual running site.

## 9. Repeated verbatim strings and duplication risks

This section records clear repeats in the source/catalogue, not every instance of common words such as “Close” in different contexts.

| Repeated text | Locations / keys | Notes |
|---|---|---|
| “Close” | `detail.close`, `support.dialog.close`, `newsletter.close` | Same visible word, separate context-specific keys. |
| “Subscribe” | `intro.connect.cta`, `newsletter.subscribe` | Same action label on intro card and newsletter modal. |
| “Join the waitlist” | `upsell.cta`, `curator.cta` | Same phrase used for Curator waitlist entry points. |
| “Dismiss” | `upsell.dismiss`, `topbar.shareBanner.dismiss` | Same visible action in different components. |
| “My Collection” | `collection.empty.eyebrow`, `topbar.collection.label` | Same label in empty-state and top-bar UI. |
| “Untitled” | `common.untitled`, CSV fallback in `src/app/ExportService.ts` | Catalogue/feed and exported CSV use the same fallback phrase, but only the UI use is catalogued. |
| “Unknown” | Fallback in slide/feed rendering and `src/app/ExportService.ts` | Literal fallback is not a dedicated message key. |
| “View on {institution}” / “View at {institution}” | Detail modal and shared error state via `detail.sourceLink.on/at` | Shared message keys prevent detail/error attribution wording from drifting. |
| “Tranquilo Curator, still taking shape” messaging | `upsell.body`, `export.body` | Related but not identical copy; both describe unfinished Curator features. |
| CSV headings | `src/app/ExportService.ts` | “Title”, “Artist”, “Date”, “Category”, “Source”, “URL” are repeated export schema labels rather than UI dictionary entries. |

### Candidate strings outside the main dictionary

These are the highest-value literal-string follow-ups because they are visible and could be missed by a translation-key-only audit:

- CSV header and fallback fields in `src/app/ExportService.ts`.
- Approved AI disclosure text and its feedback/accessibility labels, rendered directly rather than through `t()`.
- Generic homepage loading wordmark and shell labels in `index.html`.
- Runtime error detail strings and the fallback “Tranquilo failed to load.” in `src/errorState.ts` / `src/app.ts`.
- Artwork, storyline, shelf, artist, institution and licence names are dynamic data; do not treat every value as UI chrome.
- Browser-native validation messages and controls (for example, the browser's native search-clear control) are supplied by the browser and are not application-owned copy.

## 10. Exclusions and follow-up checklist

- Category/facet chip labels such as “Paintings & Portraits” and “Baroque & Enlightenment” are controlled-vocabulary data with labels in `src/i18n/en.ts` and `src/i18n/facets.ts`; the issue explicitly defers the data-value extraction work to #68.
- This document does not propose or implement an i18n runtime, add translations, or change any product copy.
- Before treating the audit as a complete visual pass, run `bun run dev` and exercise: first load; search open/close, history, autocomplete, correction and no-results; feed image failure and nudity reveal; detail/citation/report states; collection empty/non-empty/export; Discover, shelf, Storyline and set-of-works navigation; newsletter and donation dialogs; mobile top bar; and startup/API error fallback. Use the offline fixtures described in `CONTRIBUTING.md`; no live database or API credentials are required for this UI review.
