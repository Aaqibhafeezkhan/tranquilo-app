# User-facing UI string inventory

Issue: [#33 — Audit and extract all user-facing UI strings](https://github.com/tranquilo-art/tranquilo-app/issues/33)

## Scope and reading guide

This inventory records user-facing copy in the repository snapshot at `3b9708604682`. The English UI dictionary is listed with the rendering modules that consume each key. Literal text nodes and selected user-facing attributes from the root entry point, shared page template, 404 page, English static pages, and shipped pt-BR static pages are listed separately.

Placeholders such as `{count}`, `{query}`, and `{institution}` remain placeholders. They are not additional messages.

**Runtime note:** the live site could not be loaded in this audit environment, so this document does not claim a completed hands-on `bun run dev` walkthrough. The source inventory is complete for the files listed below, and the checklist at the end is the remaining browser verification pass against the offline fixtures.

## Explicit exclusions

- Category/facet chip labels and controlled-vocabulary values are excluded as requested by issue #33; see [#68](https://github.com/tranquilo-art/tranquilo-app/issues/68). The `facet.*` keys are not repeated in the table.
- Artwork titles, artist names, dates, object metadata, verified narratives, storylines, shelves, and other catalogue content returned from APIs/database are content data, not static UI copy.
- CSS-only presentation, icon path data, comments, and developer-facing logs are not user-facing strings.
- AI-disclosure wording is separately marked as locked approved copy.

## 1. Interactive UI message catalogue

Source of truth: `src/i18n/en.ts`. The final column identifies the component or template that renders the key. Shared messages may appear on multiple UI surfaces.

| Message key | English UI string | Rendering location(s) |
|---|---|---|
| `upsell.body` | Saved temporarily in this browser. Permanent collections and organization are part of Tranquilo Curator, still taking shape. | `src/components/TranquiloUpsellToast.ts` |
| `upsell.cta` | Join the waitlist | `src/components/TranquiloUpsellToast.ts` |
| `upsell.dismiss` | Dismiss | `src/components/TranquiloUpsellToast.ts` |
| `feed.scrollHint` | scroll to explore | `index.html` |
| `intro.heading` | A calmer way to scroll. | `src/feed/introSlides.ts` |
| `intro.tagline.one` | Enjoy calm scrolling with {works} public-domain works across {count} source. | `src/feed/introSlides.ts` |
| `intro.tagline.other` | Enjoy calm scrolling with {works} public-domain works across {count} sources. | `src/feed/introSlides.ts` |
| `intro.mission.title` | Mission | `src/feed/introSlides.ts` |
| `intro.mission.body` | Open source & ad‑free. | `src/feed/introSlides.ts` |
| `intro.mission.cta` | Get involved | `src/feed/introSlides.ts` |
| `intro.connect.title` | Connect | `src/feed/introSlides.ts` |
| `intro.connect.body` | Monthly curated art. | `src/feed/introSlides.ts` |
| `intro.connect.cta` | Subscribe | `src/feed/introSlides.ts` |
| `intro.support.title` | Support | `src/feed/introSlides.ts` |
| `intro.support.body` | Sustained by community. | `src/feed/introSlides.ts` |
| `intro.support.cta` | Give | `src/feed/introSlides.ts` |
| `collection.empty.eyebrow` | My Collection | `src/feed/introSlides.ts` |
| `collection.empty.title` | Nothing collected<br>yet. | `src/feed/introSlides.ts` |
| `collection.empty.body` | Tap the bookmark on any piece to start. | `src/feed/introSlides.ts` |
| `ai.disclosure.text` | Drafted with AI help; edited and reviewed by a person. | Locked approved wording; detail/storyline UI |
| `ai.disclosure.errorPrompt` | Spotted an error? | Locked approved wording; detail/storyline UI |
| `ai.disclosure.badgeLabel` | How this text was written | Locked approved wording; detail/storyline UI |
| `common.untitled` | Untitled | Shared UI callers under `src/` |
| `slide.nudity.label` | This image may contain nudity. Tap to reveal. | `src/feed/slideBuilder.ts` |
| `slide.nudity.line1` | May contain nudity | `src/feed/slideBuilder.ts` |
| `slide.nudity.line2` | Tap to reveal | `src/feed/slideBuilder.ts` |
| `slide.imageError` | Couldn’t load image — tap to retry | `src/feed/slideBuilder.ts` |
| `slide.storylineChip` | Storyline · {position} | `src/feed/slideBuilder.ts` |
| `slide.position` | {index} of {total} | `src/feed/slideBuilder.ts` |
| `slide.setPosition` | {index} of {total} in set | `src/feed/slideBuilder.ts` |
| `slide.share` | Copy share link | `src/feed/slideBuilder.ts` |
| `slide.collect.add` | Collect this piece | `src/feed/slideBuilder.ts` |
| `slide.collect.remove` | Remove from collection | `src/feed/slideBuilder.ts` |
| `detail.close` | Close | `src/components/TranquiloDetailModal.ts` |
| `detail.shelfPrev` | Previous in this shelf | `src/components/TranquiloDetailModal.ts` |
| `detail.shelfNext` | Next in this shelf | `src/components/TranquiloDetailModal.ts` |
| `detail.source` | Source | `src/components/TranquiloDetailModal.ts` |
| `detail.sourceHost` | Source: {host} | `src/components/TranquiloDetailModal.ts` |
| `detail.sources` | Sources | `src/components/TranquiloDetailModal.ts` |
| `detail.bookSource` | Book: {title} | `src/components/TranquiloDetailModal.ts` |
| `detail.twist` | The Twist | `src/components/TranquiloDetailModal.ts` |
| `detail.cast.title` | Meet the Cast | `src/components/TranquiloDetailModal.ts` |
| `detail.cast.possibly` | Possibly {name} | `src/components/TranquiloDetailModal.ts` |
| `detail.cast.noDetail` | No verified detail available yet. | `src/components/TranquiloDetailModal.ts` |
| `detail.fact.didYouKnow` | Did you know? | `src/components/TranquiloDetailModal.ts` |
| `detail.fact.basic` | Basic Information | `src/components/TranquiloDetailModal.ts` |
| `detail.meta.artist` | Artist | `src/components/TranquiloDetailModal.ts` |
| `detail.meta.created` | Created | `src/components/TranquiloDetailModal.ts` |
| `detail.meta.material` | Material | `src/components/TranquiloDetailModal.ts` |
| `detail.meta.artistOrigin` | Artist origin | `src/components/TranquiloDetailModal.ts` |
| `detail.meta.objectOrigin` | Object origin | `src/components/TranquiloDetailModal.ts` |
| `detail.meta.origin` | Origin | `src/components/TranquiloDetailModal.ts` |
| `detail.meta.culture` | Culture | `src/components/TranquiloDetailModal.ts` |
| `detail.meta.photographDate` | Date of photograph | `src/components/TranquiloDetailModal.ts` |
| `detail.meta.photographer` | Photographer | `src/components/TranquiloDetailModal.ts` |
| `detail.meta.provenance` | Provenance | `src/components/TranquiloDetailModal.ts` |
| `detail.meta.tagged` | Tagged | `src/components/TranquiloDetailModal.ts` |
| `detail.meta.license` | License | `src/components/TranquiloDetailModal.ts` |
| `detail.sourceLink.on` | View on {institution} | `src/components/TranquiloDetailModal.ts` |
| `detail.sourceLink.at` | View at {institution} | `src/components/TranquiloDetailModal.ts` |
| `detail.cite.button` | Cite this work | `src/components/TranquiloDetailModal.ts` |
| `detail.cite.copy` | Copy | `src/components/TranquiloDetailModal.ts` |
| `detail.cite.copied` | Copied | `src/components/TranquiloDetailModal.ts` |
| `detail.cite.failed` | Couldn't copy | `src/components/TranquiloDetailModal.ts` |
| `detail.report.button` | Report a problem | `src/components/TranquiloDetailModal.ts` |
| `detail.report.image` | There's an issue with image | `src/components/TranquiloDetailModal.ts` |
| `detail.report.content` | There's an issue with content | `src/components/TranquiloDetailModal.ts` |
| `detail.report.technical` | I'm having a technical issue (broken link) | `src/components/TranquiloDetailModal.ts` |
| `detail.report.more` | Tell us more | `src/components/TranquiloDetailModal.ts` |
| `detail.report.commentPlaceholder` | Anything else? (optional) | `src/components/TranquiloDetailModal.ts` |
| `detail.report.send` | Send | `src/components/TranquiloDetailModal.ts` |
| `detail.report.thanks` | Thanks, your feedback has been sent. We'll take a look. | `src/components/TranquiloDetailModal.ts` |
| `search.placeholder` | Search artist, title, category, era… | `src/app/SearchController.ts`; `src/components/TranquiloSearchBar.ts` |
| `search.submit` | Run search | `src/app/SearchController.ts`; `src/components/TranquiloSearchBar.ts` |
| `search.close` | Close search | `src/app/SearchController.ts`; `src/components/TranquiloSearchBar.ts` |
| `search.recent` | Recent searches | `src/app/SearchController.ts`; `src/components/TranquiloSearchBar.ts` |
| `search.browseBy` | Browse by | `src/app/SearchController.ts`; `src/components/TranquiloSearchBar.ts` |
| `search.related` | Showing pieces related to “{concept}” | `src/app/SearchController.ts`; `src/components/TranquiloSearchBar.ts` |
| `search.results.one` | {count} result for “{query}” | `src/app/SearchController.ts`; `src/components/TranquiloSearchBar.ts` |
| `search.results.other` | {count} results for “{query}” | `src/app/SearchController.ts`; `src/components/TranquiloSearchBar.ts` |
| `search.noResults` | No results for “{query}.” | `src/app/SearchController.ts`; `src/components/TranquiloSearchBar.ts` |
| `search.didYouMean` | No results for “{query}.” Did you mean {suggestion}? | `src/app/SearchController.ts`; `src/components/TranquiloSearchBar.ts` |
| `filter.moreBy` | More by {artist} | `src/app.ts`; `src/app/SearchController.ts` |
| `filter.collection` | {title} ({count}) | `src/app.ts`; `src/app/SearchController.ts` |
| `collection.toast.empty` | Nothing collected yet | `src/app.ts` |
| `share.copied` | Link copied | `src/app/ShareService.ts`; `src/app.ts` |
| `share.failed` | Couldn't copy link | `src/app/ShareService.ts`; `src/app.ts` |
| `error.heading` | We’re having a problem right now, but we’ll be back soon. | `src/errorState.ts` |
| `error.retry` | Try again | `src/errorState.ts` |
| `error.home` | Back to Tranquilo | `src/errorState.ts` |
| `support.strip.line` | Tranquilo runs on direct support, not ads. | `src/components/TranquiloSupportStrip.ts`; `src/components/TranquiloPatreonLink.ts` |
| `support.strip.unavailable` | Donations are briefly unavailable. Thank you for wanting to — please try again shortly. | `src/components/TranquiloSupportStrip.ts`; `src/components/TranquiloPatreonLink.ts` |
| `support.strip.soon` | Donations open soon. | `src/components/TranquiloSupportStrip.ts`; `src/components/TranquiloPatreonLink.ts` |
| `support.strip.donate` | Donate | `src/components/TranquiloSupportStrip.ts`; `src/components/TranquiloPatreonLink.ts` |
| `support.dialog.close` | Close | `src/components/TranquiloSupportStrip.ts`; `src/components/TranquiloPatreonLink.ts` |
| `support.dialog.title` | Support Tranquilo | `src/components/TranquiloSupportStrip.ts`; `src/components/TranquiloPatreonLink.ts` |
| `support.dialog.body` | Every contribution goes to hosting and the quiet cost of keeping this running. | `src/components/TranquiloSupportStrip.ts`; `src/components/TranquiloPatreonLink.ts` |
| `support.dialog.once` | Give once | `src/components/TranquiloSupportStrip.ts`; `src/components/TranquiloPatreonLink.ts` |
| `support.dialog.monthly` | Give monthly | `src/components/TranquiloSupportStrip.ts`; `src/components/TranquiloPatreonLink.ts` |
| `support.dialog.perMonth` | per month | `src/components/TranquiloSupportStrip.ts`; `src/components/TranquiloPatreonLink.ts` |
| `support.dialog.note` | Payment is handled by Stripe — Tranquilo never sees your card details. Amounts are shown in your own currency at checkout. | `src/components/TranquiloSupportStrip.ts`; `src/components/TranquiloPatreonLink.ts` |
| `support.once.note` | Choose your own amount | `src/components/TranquiloSupportStrip.ts`; `src/components/TranquiloPatreonLink.ts` |
| `support.patreon.body` | Prefer a membership? Join us on Patreon and follow along as Tranquilo grows. | `src/components/TranquiloSupportStrip.ts`; `src/components/TranquiloPatreonLink.ts` |
| `support.patreon.join` | Join on Patreon | `src/components/TranquiloSupportStrip.ts`; `src/components/TranquiloPatreonLink.ts` |
| `support.patreon.soon` | Patreon opens soon. | `src/components/TranquiloSupportStrip.ts`; `src/components/TranquiloPatreonLink.ts` |
| `shelves.home` | Tranquilo, back to the homepage | `src/components/TranquiloShelvesMode.ts` |
| `shelves.title` | Discover | `src/components/TranquiloShelvesMode.ts` |
| `shelves.close` | Close discover | `src/components/TranquiloShelvesMode.ts` |
| `shelves.storylines.title` | Storylines | `src/components/TranquiloShelvesMode.ts` |
| `shelves.storylines.subtitle` | Curated stories behind the art | `src/components/TranquiloShelvesMode.ts` |
| `shelves.moods.title` | Shelves, Curated by Hand | `src/components/TranquiloShelvesMode.ts` |
| `shelves.moods.subtitle` | Pick a mood and enjoy | `src/components/TranquiloShelvesMode.ts` |
| `shelf.close` | Close shelf | `src/components/TranquiloShelfMode.ts` |
| `shelf.share` | Copy link to this shelf | `src/components/TranquiloShelfMode.ts` |
| `shelf.works.one` | {count} work | `src/components/TranquiloShelfMode.ts` |
| `shelf.works.other` | {count} works | `src/components/TranquiloShelfMode.ts` |
| `storyline.close` | Close storyline | `src/components/TranquiloStorylineMode.ts` |
| `storyline.prev` | Previous page | `src/components/TranquiloStorylineMode.ts` |
| `storyline.next` | Next page | `src/components/TranquiloStorylineMode.ts` |
| `storyline.hint.arrows` | Use the arrows to begin → | `src/components/TranquiloStorylineMode.ts` |
| `storyline.hint.swipe` | Swipe to begin → | `src/components/TranquiloStorylineMode.ts` |
| `storyline.share` | Copy link to this storyline | `src/components/TranquiloStorylineMode.ts` |
| `storyline.chapterOf` | Chapter {index} of {total} | `src/components/TranquiloStorylineMode.ts` |
| `storyline.goToChapter` | Go to chapter {index} | `src/components/TranquiloStorylineMode.ts` |
| `setOfWorks.details` | View details | `src/components/TranquiloDetailModal.ts` |
| `export.title` | Your CSV is downloading | `src/components/TranquiloExportModal.ts` |
| `export.body` | Syncing across devices, organized lists, and sharing are part of Tranquilo Curator, still taking shape. | `src/components/TranquiloExportModal.ts` |
| `lightbox.loading` | Loading full resolution… | `src/components/TranquiloLightbox.ts` |
| `lightbox.sourceRecord` | Source record at {institution} | `src/components/TranquiloLightbox.ts` |
| `lightbox.fullResolution` | Full resolution at {institution} | `src/components/TranquiloLightbox.ts` |
| `nav.home` | Home | `pages/_base.html`; `vite-plugins/base-template.mts` |
| `nav.about` | About | `pages/_base.html`; `vite-plugins/base-template.mts` |
| `nav.submit` | Submit | `pages/_base.html`; `vite-plugins/base-template.mts` |
| `nav.getInvolved` | Get involved | `pages/_base.html`; `vite-plugins/base-template.mts` |
| `nav.support` | Support us | `pages/_base.html`; `vite-plugins/base-template.mts` |
| `footer.feedback` | Feedback | `pages/_base.html`; `vite-plugins/base-template.mts` |
| `footer.legal` | Terms & Privacy | `pages/_base.html`; `vite-plugins/base-template.mts` |
| `footer.curator` | Tranquilo Curator Waitlist | `pages/_base.html`; `vite-plugins/base-template.mts` |
| `language.label` | Language | `src/i18n/index.ts`; `vite-plugins/base-template.mts` |
| `community.title` | Community | `vite-plugins/community-partial.mts` |
| `community.intro` | Tranquilo is built in the open, with help from these people. Thank you. | `vite-plugins/community-partial.mts` |
| `community.contributors` | Contributors on GitHub | `vite-plugins/community-partial.mts` |
| `community.donors` | Supporters | `vite-plugins/community-partial.mts` |
| `community.patrons` | Patrons on Patreon | `vite-plugins/community-partial.mts` |
| `community.avatarAlt` | {handle} on GitHub | `vite-plugins/community-partial.mts` |
| `form.joining` | Joining… | `src/pages/*.ts`; `src/components/TranquiloNewsletterModal.ts` |
| `form.error` | Something went wrong — please try again in a moment. | `src/pages/*.ts`; `src/components/TranquiloNewsletterModal.ts` |
| `form.email` | Email | `src/pages/*.ts`; `src/components/TranquiloNewsletterModal.ts` |
| `form.emailPlaceholder` | you@example.com | `src/pages/*.ts`; `src/components/TranquiloNewsletterModal.ts` |
| `form.emailInvalid` | Please enter a valid email address. | `src/pages/*.ts`; `src/components/TranquiloNewsletterModal.ts` |
| `about.notify.cta` | Notify me | `src/pages/*.ts`; `src/components/TranquiloNewsletterModal.ts` |
| `curator.cta` | Join the waitlist | `src/pages/*.ts`; `src/components/TranquiloNewsletterModal.ts` |
| `feedback.sending` | Sending… | `src/pages/*.ts`; `src/components/TranquiloNewsletterModal.ts` |
| `feedback.submit` | Send feedback | `src/pages/*.ts`; `src/components/TranquiloNewsletterModal.ts` |
| `feedback.error` | That didn't send. Your message is still here — try again in a moment. | `src/pages/*.ts`; `src/components/TranquiloNewsletterModal.ts` |
| `submit.sending` | Submitting… | `src/pages/*.ts`; `src/components/TranquiloNewsletterModal.ts` |
| `submit.submit` | Submit for review | `src/pages/*.ts`; `src/components/TranquiloNewsletterModal.ts` |
| `submit.error` | Something went wrong sending this — please try again in a moment. | `src/pages/*.ts`; `src/components/TranquiloNewsletterModal.ts` |
| `newsletter.close` | Close | `src/pages/*.ts`; `src/components/TranquiloNewsletterModal.ts` |
| `newsletter.title` | Enjoy a monthly art moment | `src/pages/*.ts`; `src/components/TranquiloNewsletterModal.ts` |
| `newsletter.body` | A monthly note with curated art. No spam. | `src/pages/*.ts`; `src/components/TranquiloNewsletterModal.ts` |
| `newsletter.subscribe` | Subscribe | `src/pages/*.ts`; `src/components/TranquiloNewsletterModal.ts` |
| `newsletter.success` | You're on the list — look out for our next note. | `src/pages/*.ts`; `src/components/TranquiloNewsletterModal.ts` |
| `topbar.shareBanner.text` | Tranquilo is open source and volunteer-run. | `src/components/TranquiloTopbar.ts` |
| `topbar.shareBanner.newsletter` | Get newsletter | `src/components/TranquiloTopbar.ts` |
| `topbar.shareBanner.involved` | Get involved | `src/components/TranquiloTopbar.ts` |
| `topbar.shareBanner.dismiss` | Dismiss | `src/components/TranquiloTopbar.ts` |
| `topbar.home` | Tranquilo, back to the top | `src/components/TranquiloTopbar.ts` |
| `topbar.music` | Toggle music | `src/components/TranquiloTopbar.ts` |
| `topbar.search` | Search | `src/components/TranquiloTopbar.ts` |
| `topbar.discover` | Discover shelves | `src/components/TranquiloTopbar.ts` |
| `topbar.collection.label` | My Collection | `src/components/TranquiloTopbar.ts` |
| `topbar.collection.empty` | My Collection, empty | `src/components/TranquiloTopbar.ts` |
| `topbar.collection.count.one` | My Collection, {count} item | `src/components/TranquiloTopbar.ts` |
| `topbar.collection.count.other` | My Collection, {count} items | `src/components/TranquiloTopbar.ts` |
| `topbar.filter.export` | Export | `src/components/TranquiloTopbar.ts` |
| `topbar.filter.clear` | Show all | `src/components/TranquiloTopbar.ts` |
| `artistCard.wikipedia` | Read more on Wikipedia | `src/app/SearchController.ts` |
| `artistCard.wikidata` | View on Wikidata | `src/app/SearchController.ts` |
| `chips.all` | All | `src/components/TranquiloTopbar.ts`; `src/app.ts` |
| `chips.storyline` | Storyline | `src/components/TranquiloTopbar.ts`; `src/app.ts` |
| `chips.more` | More | `src/components/TranquiloTopbar.ts`; `src/app.ts` |

## 2. Exact repeated values in the English dictionary

These are verbatim duplicates across message keys and should be reviewed in context before a future translation reuses one wording everywhere.

| Exact string | Message keys |
|---|---|
| Close | `detail.close`, `support.dialog.close`, `newsletter.close` |
| Dismiss | `upsell.dismiss`, `topbar.shareBanner.dismiss` |
| Get involved | `intro.mission.cta`, `nav.getInvolved`, `topbar.shareBanner.involved` |
| Join the waitlist | `upsell.cta`, `curator.cta` |
| My Collection | `collection.empty.eyebrow`, `topbar.collection.label` |
| Subscribe | `intro.connect.cta`, `newsletter.subscribe` |

## 3. Literal text in HTML entry points and static pages

Text nodes and selected user-facing attributes are transcribed separately. Shared chrome may repeat across pages because it is rendered from `pages/_base.html`; the page-by-page rows show the actual occurrence scope. English and Brazilian Portuguese text is kept in its original language.

| File | Location type | Literal text |
|---|---|---|
| `index.html` | document title | Tranquilo · A calm, ad-free digital museum |
| `index.html` | content | A calm, ad-free digital museum and open-source art platform. Browse public-domain art, one piece at a time. No accounts, no algorithm. |
| `index.html` | HTML text | Tranquilo |
| `index.html` | HTML text | scroll to explore |
| `404.html` | document title | Page not found — Tranquilo |
| `404.html` | content | This page doesn't exist, but here's a piece of public-domain art while you're here. |
| `404.html` | HTML text | Page not found — Tranquilo |
| `pages/_base.html` | content | width=device-width, initial-scale=1, viewport-fit=cover |
| `pages/_base.html` | HTML text | Feedback |
| `pages/_base.html` | HTML text | Terms & Privacy |
| `pages/_base.html` | HTML text | Tranquilo Curator Waitlist |
| `pages/about.html` | document title | About — Tranquilo |
| `pages/about.html` | content | Why Tranquilo exists, how it works, and what it's trying to be. |
| `pages/about.html` | placeholder | you@example.com |
| `pages/about.html` | HTML text | About — Tranquilo |
| `pages/about.html` | HTML text | About Tranquilo |
| `pages/about.html` | HTML text | Why Tranquilo exists |
| `pages/about.html` | HTML text | Hey! I'm Mel, the creator of Tranquilo.art, a calm, ad-free digital museum and open-source art platform where you can browse public domain art for free. It's privacy-friendly, too. |
| `pages/about.html` | HTML text | The origin of Tranquilo is personal for me. Not too long ago, I stepped back from corporate product & design to take care of my health. While focusing on rest, I noticed that scrolling through the usual apps was more stressful than enjoyable. |
| `pages/about.html` | HTML text | As I began to gain energy, I prototyped an app so that I could rest in bed and browse art from The Met. It started with about 40 works of art. As I used it during my downtime, I began discovering fun stories behind the artwork and thinking about how to bring the joy of discovering art to other people. Before I knew it, suggestions from friends and beyond began trickling in. I have been iterating ever since. Now it's grown to thousands of works across a growing set of institutions, and I am genuinely excited about each new set of works that are brought into our catalog. |
| `pages/about.html` | HTML text | A couple of things I'm focused on: |
| `pages/about.html` | HTML text | An honest product |
| `pages/about.html` | HTML text | that doesn't extract from users. I'm aiming to make Tranquilo sustainable, not growth-first. I'll continue to support a robust, free, public product. |
| `pages/about.html` | HTML text | No ads. No cookies. No tracking. |
| `pages/about.html` | HTML text | You can |
| `pages/about.html` | HTML text | donate here |
| `pages/about.html` | HTML text | to help keep Tranquilo free and privacy-friendly. |
| `pages/about.html` | HTML text | Focusing on public domain |
| `pages/about.html` | HTML text | (and equivalents). There's so much fabulous open access art out there waiting to be appreciated. I care a great deal about making it easy to find and browse these works. |
| `pages/about.html` | HTML text | It's still early stage. I hope you'll give me feedback and join me for the journey. |
| `pages/about.html` | HTML text | Frequently asked questions |
| `pages/about.html` | HTML text | Is Tranquilo free? |
| `pages/about.html` | HTML text | Yes. Browsing and collecting are free, with your collection saved locally in your browser. |
| `pages/about.html` | HTML text | What license types are accepted for submitted collections? |
| `pages/about.html` | HTML text | CC0, CC-BY, CC-BY-SA, public domain, or an equivalent open license for both the images and their metadata. I don't accept rights-restricted or unlicensed material — see the full eligibility statement on the |
| `pages/about.html` | HTML text | submission page |
| `pages/about.html` | HTML text | . |
| `pages/about.html` | HTML text | I think I see a bug. How do I report it? |
| `pages/about.html` | HTML text | Even though I'm testing, you might find some bugs that escape my visibility. The |
| `pages/about.html` | HTML text | feedback form |
| `pages/about.html` | HTML text | is the best way to report one — it notes which page you came from automatically. Please include the device you were using (laptop or phone, and the model) and your browser and version. |
| `pages/about.html` | HTML text | Stay in the loop |
| `pages/about.html` | HTML text | Get a note when new features ship, or anything else worth knowing about. No spam, unsubscribe any time. |
| `pages/about.html` | HTML text | Email |
| `pages/about.html` | HTML text | Please enter a valid email address. |
| `pages/about.html` | HTML text | Notify me |
| `pages/about.html` | HTML text | You're on the list — we'll be in touch. |
| `pages/curator.html` | document title | Tranquilo Curator |
| `pages/curator.html` | content | Tranquilo Curator is in early exploration. Join the waitlist to hear if it happens. |
| `pages/curator.html` | placeholder | you@example.com |
| `pages/curator.html` | HTML text | Tranquilo Curator |
| `pages/curator.html` | HTML text | Under development |
| `pages/curator.html` | HTML text | Tranquilo Curator is in early exploration |
| `pages/curator.html` | HTML text | We're exploring a paid tier for people who want more from their collection. No pricing or timeline yet — join the waitlist to hear if it happens. |
| `pages/curator.html` | HTML text | Email |
| `pages/curator.html` | HTML text | Please enter a valid email address. |
| `pages/curator.html` | HTML text | Join the waitlist |
| `pages/curator.html` | HTML text | You're on the list. |
| `pages/curator.html` | HTML text | We'll let you know when Tranquilo Curator is ready. |
| `pages/feedback.html` | document title | Send Feedback — Tranquilo |
| `pages/feedback.html` | content | Report a bug or suggest something for Tranquilo. No account needed, and an email address is optional. |
| `pages/feedback.html` | placeholder | The more specific the better — what you were doing, what you expected, what happened instead. For a bug, your device and browser help a lot (e.g. iPhone 14, Safari 17). |
| `pages/feedback.html` | placeholder | e.g. the feed, an artwork page, this form |
| `pages/feedback.html` | placeholder | Only if you'd like a reply |
| `pages/feedback.html` | HTML text | Send Feedback — Tranquilo |
| `pages/feedback.html` | HTML text | Send Feedback |
| `pages/feedback.html` | HTML text | Something broken, or something missing? |
| `pages/feedback.html` | HTML text | Only the message is required. Your email is optional — leave it out if you'd rather stay anonymous, and we simply won't be able to reply. |
| `pages/feedback.html` | HTML text | What kind of thing is this? |
| `pages/feedback.html` | HTML text | Something is broken |
| `pages/feedback.html` | HTML text | An idea for a feature |
| `pages/feedback.html` | HTML text | Something about a specific artwork |
| `pages/feedback.html` | HTML text | Something else |
| `pages/feedback.html` | HTML text | What happened? * |
| `pages/feedback.html` | HTML text | Please tell us what happened. |
| `pages/feedback.html` | HTML text | Where were you? |
| `pages/feedback.html` | HTML text | Filled in automatically if you came from the app. Edit or clear it freely. |
| `pages/feedback.html` | HTML text | Your email (optional) |
| `pages/feedback.html` | HTML text | We use it to reply to you about this, and nothing else. |
| `pages/feedback.html` | HTML text | That doesn't look like a valid email address — fix it, or clear the field to send anonymously. |
| `pages/feedback.html` | HTML text | Send feedback |
| `pages/feedback.html` | HTML text | Feedback goes to a real person, not a ticket queue. We read everything, and we act on patterns rather than one-offs — so if something matters to you, it's worth saying even if you think someone else already has. |
| `pages/feedback.html` | HTML text | Thanks — that's in |
| `pages/feedback.html` | HTML text | We read every one of these. If you left an email we'll reply when there's something worth saying. |
| `pages/get-involved.html` | document title | Get involved — Tranquilo |
| `pages/get-involved.html` | content | Tranquilo is looking for volunteers to help with art curation, UX research, and grant strategy — plus a standing invite to contribute on GitHub. |
| `pages/get-involved.html` | HTML text | Get involved — Tranquilo |
| `pages/get-involved.html` | HTML text | Get involved |
| `pages/get-involved.html` | HTML text | Tranquilo.art is seeking volunteers |
| `pages/get-involved.html` | HTML text | Tranquilo.art is looking for art lovers who are interested in volunteering their time to make public domain art free for all to enjoy. |
| `pages/get-involved.html` | HTML text | Developers: |
| `pages/get-involved.html` | HTML text | join us on |
| `pages/get-involved.html` | HTML text | GitHub |
| `pages/get-involved.html` | HTML text | , where we'd welcome your contributions and feedback. |
| `pages/get-involved.html` | HTML text | Prefer to give money instead of time? You can also |
| `pages/get-involved.html` | HTML text | support us |
| `pages/get-involved.html` | HTML text | directly. |
| `pages/get-involved.html` | HTML text | Art Storyteller — Content Curation |
| `pages/get-involved.html` | HTML text | Volunteer, part time |
| `pages/get-involved.html` | HTML text | Do you enjoy helping other people enjoy art? Do you find art history fascinating? Tranquilo.art is a passion project: a calm, ad-free digital museum where everyone can enjoy art and become immersed in the story behind it. It's a free product, and we're seeking volunteers to help curate our catalogue of thousands of public domain works. |
| `pages/get-involved.html` | HTML text | What you'll do: |
| `pages/get-involved.html` | HTML text | Write narrative prose about art works in the Tranquilo catalog |
| `pages/get-involved.html` | HTML text | Curate collections of art around narrative stories |
| `pages/get-involved.html` | HTML text | Fact-check the history or provenance of works |
| `pages/get-involved.html` | HTML text | Recommend adjustments to the Tranquilo catalog and help with procurement strategy for future items |
| `pages/get-involved.html` | HTML text | Preferred background & time expectations: |
| `pages/get-involved.html` | HTML text | Art history or humanities studies |
| `pages/get-involved.html` | HTML text | Solid writing skills with a good command of English grammar and prose |
| `pages/get-involved.html` | HTML text | We're also looking for storytellers who can write and translate in Portuguese and Spanish |
| `pages/get-involved.html` | HTML text | 3-5 hours per week is preferred |
| `pages/get-involved.html` | HTML text | What we can offer: |
| `pages/get-involved.html` | HTML text | Flexible timing; work when it suits you best |
| `pages/get-involved.html` | HTML text | See your content live — use your work here to help grow your portfolio and resume |
| `pages/get-involved.html` | HTML text | We are willing to collaborate with university programs for school credit or other arrangements that could benefit students |
| `pages/get-involved.html` | HTML text | Interested? |
| `pages/get-involved.html` | HTML text | Reach out to Mel directly: |
| `pages/get-involved.html` | HTML text | hello@tranquilo.art |
| `pages/get-involved.html` | HTML text | UX Researcher — Art Use Cases |
| `pages/get-involved.html` | HTML text | Volunteer, part time |
| `pages/get-involved.html` | HTML text | Are you a UX researcher who'd like to use your skills to understand how people use art in their work lives? Tranquilo.art is a passion project: a calm, ad-free digital museum where everyone can enjoy art and become immersed in the story behind it. It's a free product, and we're looking for a user researcher to help us decide where to take the product next. We're looking to understand more about how educators, creatives, and others use art in their professional lives so that we can consider additional features. |
| `pages/get-involved.html` | HTML text | What you'll do: |
| `pages/get-involved.html` | HTML text | Recruit educators and creatives for user research |
| `pages/get-involved.html` | HTML text | Conduct exploratory sessions with users |
| `pages/get-involved.html` | HTML text | Summarize findings and make recommendations based on what you learn |
| `pages/get-involved.html` | HTML text | Preferred background & time expectations: |
| `pages/get-involved.html` | HTML text | Background in user research |
| `pages/get-involved.html` | HTML text | 3-5 hours per week preferred |
| `pages/get-involved.html` | HTML text | What we can offer: |
| `pages/get-involved.html` | HTML text | Flexible timing; work when it suits you best |
| `pages/get-involved.html` | HTML text | Your research will be used to improve the product, and anything you produce with us can be used in your portfolio and resume |
| `pages/get-involved.html` | HTML text | We are willing to collaborate with university programs for school credit or other arrangements that could benefit students |
| `pages/get-involved.html` | HTML text | Interested? |
| `pages/get-involved.html` | HTML text | Reach out to Mel directly: |
| `pages/get-involved.html` | HTML text | hello@tranquilo.art |
| `pages/get-involved.html` | HTML text | Grant Advisor |
| `pages/get-involved.html` | HTML text | Volunteer, part time |
| `pages/get-involved.html` | HTML text | Do you have grant research and grant writing experience in areas of arts & culture? Tranquilo.art is a passion project: a calm, ad-free digital museum where everyone can enjoy art and become immersed in the story behind it. It's a free product, and we're seeking an advisor who can help us understand the grant landscape so that we can keep it free for everyone. |
| `pages/get-involved.html` | HTML text | What you'll do: |
| `pages/get-involved.html` | HTML text | Advise on grant research & grant writing strategies |
| `pages/get-involved.html` | HTML text | Review grant applications and offer feedback for improvement prior to submission |
| `pages/get-involved.html` | HTML text | Preferred background & time expectations: |
| `pages/get-involved.html` | HTML text | Prior experience researching and submitting grants |
| `pages/get-involved.html` | HTML text | Experience in the arts & culture space |
| `pages/get-involved.html` | HTML text | Bonus for experience across different countries and regions of the world |
| `pages/get-involved.html` | HTML text | What we can offer: |
| `pages/get-involved.html` | HTML text | Flexible timing; work when it suits you best |
| `pages/get-involved.html` | HTML text | We are willing to collaborate with university programs for school credit or other arrangements that could benefit students |
| `pages/get-involved.html` | HTML text | Interested? |
| `pages/get-involved.html` | HTML text | Reach out to Mel directly: |
| `pages/get-involved.html` | HTML text | hello@tranquilo.art |
| `pages/get-involved.html` | HTML text | Don't see a role here that matches your skills? We encourage you to reach out anyway if interested to see if there's a potential fit. |
| `pages/privacy.html` | document title | Privacy Policy — Tranquilo |
| `pages/privacy.html` | content | What Tranquilo stores, what it doesn't, and why. No accounts, no tracking for advertising. |
| `pages/privacy.html` | HTML text | Privacy Policy — Tranquilo |
| `pages/privacy.html` | HTML text | Legal |
| `pages/privacy.html` | HTML text | Privacy Policy |
| `pages/privacy.html` | HTML text | Short version: |
| `pages/privacy.html` | HTML text | Tranquilo doesn't collect personal information about you. |
| `pages/privacy.html` | HTML text | There are no accounts, no cookies, and nothing that follows you from one visit to the next. This page explains that in a bit more detail. |
| `pages/privacy.html` | HTML text | Last updated: 13 September 2026 |
| `pages/privacy.html` | HTML text | Tranquilo is operated by Cora Studios LTDA, a microempresa registered in Belo Horizonte, Brazil. Brazil's data protection law (LGPD) applies to personal data — information that can identify a person. We don't collect any on this site, so there isn't any to protect, sell, or lose. Keeping it that way is the point. |
| `pages/privacy.html` | HTML text | Our |
| `pages/privacy.html` | HTML text | Terms of Service |
| `pages/privacy.html` | HTML text | cover everything else. |
| `pages/privacy.html` | HTML text | What we don't collect |
| `pages/privacy.html` | HTML text | No accounts. |
| `pages/privacy.html` | HTML text | You can't sign up, so we never have a name, email, or password from you. |
| `pages/privacy.html` | HTML text | No cookies. |
| `pages/privacy.html` | HTML text | We don't set tracking cookies, and there are no advertising or social-media trackers on the site. |
| `pages/privacy.html` | HTML text | No identifiers. |
| `pages/privacy.html` | HTML text | We don't assign you a user ID or a session ID, and we don't track you across visits or across devices. |
| `pages/privacy.html` | HTML text | No profiles. |
| `pages/privacy.html` | HTML text | We don't build a picture of who you are, and we have nothing to sell to anyone. |
| `pages/privacy.html` | HTML text | What we do measure |
| `pages/privacy.html` | HTML text | We keep count of how the site is being used, so we know whether it's working and can describe it honestly to the institutions and supporters we work with. |
| `pages/privacy.html` | HTML text | Visits & Network Security |
| `pages/privacy.html` | HTML text | — roughly how many people come to the site, which country they're in, and what browser and kind of device they're using. This is handled by Cloudflare, our hosting provider. Additionally, Vercel provides infrastructure security and bot protection. When you request a page, network firewalls temporarily inspect network metadata (like your IP address) in real time to protect the site from DDoS attacks, malicious traffic, and automated abuse. These edge security logs are strictly used for infrastructure defence, kept separate from any site analytics, and deleted automatically. |
| `pages/privacy.html` | HTML text | Feature use |
| `pages/privacy.html` | HTML text | — counts of things like which category labels get clicked, whether music is turned on, how often share links are used, and how often art stories are opened. These are stored in our database (Neon) and also sent to PostHog, an analytics processor, configured in its strictest anonymous mode: no visitor profiles, no session recording, no on-page surveys, and no identifier saved anywhere that would let one visit be connected to the next. Like any server you visit, PostHog receives standard web request data (including IP address) to process each event. |
| `pages/privacy.html` | HTML text | Search terms |
| `pages/privacy.html` | HTML text | — the words typed into the search box, so we can see what people are looking for and go and find more of it. These are stored on their own, with nothing attached: we can see that someone searched for "Vermeer", and not who, or what else they did. |
| `pages/privacy.html` | HTML text | All of it is anonymous by design. In our own analytics and database, there's no user ID, no session ID, no stored IP address, and no way to connect one action to another or to link anything back to you. We can see that a share link was clicked 400 times. We can't see who clicked it, or that the same visitor did anything twice. |
| `pages/privacy.html` | HTML text | We built it this way deliberately, not as an afterthought. If that ever changes, this page changes first. |
| `pages/privacy.html` | HTML text | What stays in your browser |
| `pages/privacy.html` | HTML text | Your collection is saved only in your own browser's local storage, on the device you're using — we don't set cookies, and your collection is never sent to us. Export simply reads that local copy and builds the CSV file on your device. |
| `pages/privacy.html` | HTML text | A few small settings live in the same place: whether music is on, whether you've dismissed a prompt, and your recent searches for the length of the visit. None of it leaves your device. |
| `pages/privacy.html` | HTML text | We can't see any of it. Clearing your browser data deletes it, and we have no copy to restore. |
| `pages/privacy.html` | HTML text | If you contact us |
| `pages/privacy.html` | HTML text | If you email us, send feedback, or submit a collection, we'll use what you give us to respond to you and handle your request. That's it — we don't add you to anything or share it with anyone. Email is handled through Resend, our email provider. |
| `pages/privacy.html` | HTML text | If you sign up for occasional updates, we use your email address to send them and nothing else — also through Resend. Every message has an unsubscribe link, and unsubscribing removes your address. |
| `pages/privacy.html` | HTML text | Donations |
| `pages/privacy.html` | HTML text | If you choose to support Tranquilo financially, payment is handled entirely by Stripe. They collect your payment details under their own privacy policy, and keep them on file if you set up a recurring donation, until you cancel it. We never see or store your card or bank information. |
| `pages/privacy.html` | HTML text | If you become a member on Patreon, Patreon handles your payment under its own privacy policy. Patreon tells us your name, your membership tier and whether your membership is active — never your email or payment details. We use that to thank patrons on our About page, shown as your first name and last initial. Write to us and we'll show you under a different name or leave you off the list entirely. If you leave Patreon, we remove your name. |
| `pages/privacy.html` | HTML text | If we add other ways to donate later, we'll update this page. |
| `pages/privacy.html` | HTML text | Why we're allowed to hold the little we hold |
| `pages/privacy.html` | HTML text | Brazilian data protection law (LGPD) asks us to say what our basis is for each thing: |
| `pages/privacy.html` | HTML text | Newsletter |
| `pages/privacy.html` | HTML text | — your consent. You gave it by subscribing, and you can take it back at any time. |
| `pages/privacy.html` | HTML text | Messages you send us |
| `pages/privacy.html` | HTML text | — your own request. You wrote to us, so we use what you sent to write back, and for nothing else. |
| `pages/privacy.html` | HTML text | Donations |
| `pages/privacy.html` | HTML text | — Stripe processes what's needed to complete the payment you asked for, under its own terms. |
| `pages/privacy.html` | HTML text | Thanking patrons |
| `pages/privacy.html` | HTML text | — legitimate interest. We show patrons' names on the About page to thank them, and you can ask us to change or remove yours at any time. |
| `pages/privacy.html` | HTML text | Network security & abuse prevention |
| `pages/privacy.html` | HTML text | — legitimate interest. Infrastructure providers (Vercel and Cloudflare) process temporary network logs (like IP addresses) solely to protect the platform against automated bots, spam, and cyberattacks. |
| `pages/privacy.html` | HTML text | That's the whole list, because that's all the personal information there is. |
| `pages/privacy.html` | HTML text | Your rights |
| `pages/privacy.html` | HTML text | For that small amount of information, LGPD gives you the right to ask us to: |
| `pages/privacy.html` | HTML text | confirm whether we hold anything about you, and show you what |
| `pages/privacy.html` | HTML text | correct anything wrong or incomplete |
| `pages/privacy.html` | HTML text | delete it |
| `pages/privacy.html` | HTML text | give you a copy you can take elsewhere |
| `pages/privacy.html` | HTML text | tell you who we've shared it with |
| `pages/privacy.html` | HTML text | withdraw your consent, where consent is what we relied on |
| `pages/privacy.html` | HTML text | Email |
| `pages/privacy.html` | HTML text | hello@tranquilo.art |
| `pages/privacy.html` | HTML text | and we'll do it. No form, no charge, no reason required. We'll reply as quickly as we can, and within the deadlines LGPD sets. |
| `pages/privacy.html` | HTML text | If you've only ever browsed the site, these rights have nothing to attach to — we don't hold anything about you to show, correct, or delete. |
| `pages/privacy.html` | HTML text | You can also complain to Brazil's data protection authority, the |
| `pages/privacy.html` | HTML text | ANPD |
| `pages/privacy.html` | HTML text | , if you think we've handled something badly. |
| `pages/privacy.html` | HTML text | Children |
| `pages/privacy.html` | HTML text | We don't collect personal information from anyone, including children. There's nothing to sign up for and nothing to disclose. |
| `pages/privacy.html` | HTML text | Where the data lives |
| `pages/privacy.html` | HTML text | Our hosting and analytics providers (Cloudflare, Vercel, Neon, PostHog) operate servers around the world, so anonymous usage counts may be processed outside Brazil. Because none of it identifies a person, there's no personal data crossing a border there. |
| `pages/privacy.html` | HTML text | Where personal information does exist — your email address with Resend if you write to us or subscribe |
| `pages/privacy.html` | HTML text | , and your payment details with Stripe if you donate |
| `pages/privacy.html` | HTML text | — it is handled by companies based in the United States, so that information is processed outside Brazil. Each is bound by its own contractual and legal safeguards |
| `pages/privacy.html` | HTML text | , and in Stripe's case we never hold the information ourselves at all |
| `pages/privacy.html` | HTML text | . |
| `pages/privacy.html` | HTML text | How long we keep things |
| `pages/privacy.html` | HTML text | Visit statistics and security logs sit with Cloudflare and Vercel and are kept only as long as required for infrastructure protection and security monitoring — see |
| `pages/privacy.html` | HTML text | Cloudflare's |
| `pages/privacy.html` | HTML text | and |
| `pages/privacy.html` | HTML text | Vercel's |
| `pages/privacy.html` | HTML text | respective privacy policies for details. |
| `pages/privacy.html` | HTML text | The anonymous feature-use counts and search terms in our own database are kept as long as they're useful for understanding how Tranquilo is doing. The copy PostHog receives follows its own retention schedule — see |
| `pages/privacy.html` | HTML text | PostHog's privacy policy |
| `pages/privacy.html` | HTML text | for details. Messages you send us are kept as long as needed to deal with them. Newsletter addresses are kept until you unsubscribe. |
| `pages/privacy.html` | HTML text | Changes to this policy |
| `pages/privacy.html` | HTML text | If we change what we collect, we'll update this page and change the date at the top. We'd rather over-explain a change than let this page quietly go out of date. |
| `pages/privacy.html` | HTML text | Getting in touch |
| `pages/privacy.html` | HTML text | Questions about privacy, requests about your data, or anything on this page: |
| `pages/privacy.html` | HTML text | hello@tranquilo.art |
| `pages/privacy.html` | HTML text | This is our official channel for data protection matters. As a microempresa, we aren't required to appoint a data protection officer, and this address stands in place of one — a real person reads it. |
| `pages/submit.html` | document title | Submit a Collection — Tranquilo |
| `pages/submit.html` | content | Submit an openly licensed art collection for consideration on Tranquilo. |
| `pages/submit.html` | placeholder | e.g., Highsmith Street Photography |
| `pages/submit.html` | placeholder | Full name |
| `pages/submit.html` | placeholder | you@example.com |
| `pages/submit.html` | placeholder | Name the open license used |
| `pages/submit.html` | placeholder | Where this license is documented |
| `pages/submit.html` | placeholder | What's in this collection? |
| `pages/submit.html` | placeholder | Optional |
| `pages/submit.html` | HTML text | Submit a Collection — Tranquilo |
| `pages/submit.html` | HTML text | Submit a Collection |
| `pages/submit.html` | HTML text | Submit an open collection for consideration |
| `pages/submit.html` | HTML text | We only accept openly licensed collections — CC0, CC-BY, public domain, or equivalent. No rights-restricted or unlicensed material. |
| `pages/submit.html` | HTML text | Collection name * |
| `pages/submit.html` | HTML text | Please enter the collection's name. |
| `pages/submit.html` | HTML text | Your name * |
| `pages/submit.html` | HTML text | Please enter your name. |
| `pages/submit.html` | HTML text | Your email * |
| `pages/submit.html` | HTML text | Please enter a valid email address. |
| `pages/submit.html` | HTML text | Collection link * |
| `pages/submit.html` | HTML text | Site, repo, or API where the collection lives. |
| `pages/submit.html` | HTML text | Please enter a valid link, starting with http:// or https:// |
| `pages/submit.html` | HTML text | License type * |
| `pages/submit.html` | HTML text | Select a license… |
| `pages/submit.html` | HTML text | CC0 |
| `pages/submit.html` | HTML text | CC-BY |
| `pages/submit.html` | HTML text | CC-BY-SA |
| `pages/submit.html` | HTML text | Public Domain |
| `pages/submit.html` | HTML text | Other open license |
| `pages/submit.html` | HTML text | Please select a license type. |
| `pages/submit.html` | HTML text | Describe the license * |
| `pages/submit.html` | HTML text | Please describe the license. |
| `pages/submit.html` | HTML text | License verification link * |
| `pages/submit.html` | HTML text | Please enter a valid link, starting with http:// or https:// |
| `pages/submit.html` | HTML text | Short description * |
| `pages/submit.html` | HTML text | Please add a short description. |
| `pages/submit.html` | HTML text | Estimated size (number of works) |
| `pages/submit.html` | HTML text | I confirm this collection is openly licensed and I have the right to submit it. |
| `pages/submit.html` | HTML text | Please confirm the license statement before submitting. |
| `pages/submit.html` | HTML text | Also send me occasional updates about Tranquilo — new sources, features, and what's next. No spam, unsubscribe any time. |
| `pages/submit.html` | HTML text | Submit for review |
| `pages/submit.html` | HTML text | We review every submission and will follow up with a decision. We can't promise a specific timeline, but we'll keep you posted. |
| `pages/submit.html` | HTML text | Submission received |
| `pages/submit.html` | HTML text | Thanks — we'll review this and follow up. We can't promise a specific timeline, but we'll keep you posted. |
| `pages/support.html` | document title | Support us — Tranquilo |
| `pages/support.html` | content | Tranquilo is ad-free by choice. Your support covers hosting and the quiet cost of keeping it running. |
| `pages/support.html` | HTML text | Support us — Tranquilo |
| `pages/support.html` | HTML text | Support us |
| `pages/support.html` | HTML text | Your support keeps us going |
| `pages/support.html` | HTML text | Tranquilo is ad-free by choice — we don't sell your attention, so we ask for support instead. Your contribution covers hosting and the quiet cost of keeping this running. |
| `pages/support.html` | HTML text | Prefer to give time instead of money? |
| `pages/support.html` | HTML text | We're looking for |
| `pages/support.html` | HTML text | volunteers |
| `pages/support.html` | HTML text | to help with art curation, UX research, and grant strategy. |
| `pages/support.html` | HTML text | Developers: we're open source on |
| `pages/support.html` | HTML text | GitHub |
| `pages/support.html` | HTML text | and welcome your contributions. |
| `pages/terms.html` | document title | Terms of Service — Tranquilo |
| `pages/terms.html` | content | The terms of use for Tranquilo, and how the artwork it shows is licensed. |
| `pages/terms.html` | HTML text | Terms of Service — Tranquilo |
| `pages/terms.html` | HTML text | Legal |
| `pages/terms.html` | HTML text | Terms of Service |
| `pages/terms.html` | HTML text | Tranquilo is a free website for browsing public-domain and openly licensed art. These terms explain what you can expect from us and what we ask of you. We've tried to write them in plain language. |
| `pages/terms.html` | HTML text | Last updated: 15 August 2026 |
| `pages/terms.html` | HTML text | Tranquilo is operated by Cora Studios LTDA, a microempresa registered in Belo Horizonte, Brazil. |
| `pages/terms.html` | HTML text | Separately, our |
| `pages/terms.html` | HTML text | Privacy Policy |
| `pages/terms.html` | HTML text | covers what data Tranquilo does and does not collect. |
| `pages/terms.html` | HTML text | Accepting these terms |
| `pages/terms.html` | HTML text | By using tranquilo.art, you agree to these terms. If you don't agree with them, please don't use the site. |
| `pages/terms.html` | HTML text | We may update these terms as Tranquilo changes. When we do, we'll change the date at the top of this page. Continuing to use the site after an update means you accept the new version. |
| `pages/terms.html` | HTML text | What Tranquilo is |
| `pages/terms.html` | HTML text | Tranquilo lets you browse, save, and share artwork from museums and cultural institutions that publish their collections under open licenses. |
| `pages/terms.html` | HTML text | The service is free. There are no accounts, no product subscriptions, and no ads. Every feature is available to everyone, whether or not they've ever given us money. |
| `pages/terms.html` | HTML text | We may change, pause, or discontinue any part of the site at any time. Tranquilo is an early-stage project, and we can't promise it will always be available or error-free. |
| `pages/terms.html` | HTML text | The artwork and the writing |
| `pages/terms.html` | HTML text | The artwork |
| `pages/terms.html` | HTML text | comes from public-domain and openly licensed collections (CC0, CC BY, CC BY-SA, or equivalent). Each piece keeps whatever license it came with, and we show the source and license alongside it. Your rights to reuse an image come from that license, not from us — check it before you reuse anything. |
| `pages/terms.html` | HTML text | The writing on the site |
| `pages/terms.html` | HTML text | — our descriptions, art stories, collections, and editorial voice — belongs to Tranquilo. You're welcome to quote or share it with credit and a link back. |
| `pages/terms.html` | HTML text | The site itself |
| `pages/terms.html` | HTML text | — the name, design, and code — belongs to Tranquilo. |
| `pages/terms.html` | HTML text | If you believe something on the site infringes your rights, email us at |
| `pages/terms.html` | HTML text | hello@tranquilo.art |
| `pages/terms.html` | HTML text | and we'll look into it. |
| `pages/terms.html` | HTML text | AI-generated content |
| `pages/terms.html` | HTML text | Some of the writing on Tranquilo — particularly art stories and narratives — is drafted with AI assistance. All of these are human-reviewed and human-corrected before publishing. |
| `pages/terms.html` | HTML text | Our writing and the results of our own research are geared for a general-interest audience, not presented as scholarship. If you need rigorously researched facts for research, teaching, or publication, please verify it against the source institution's own record. We link to it for exactly that reason. |
| `pages/terms.html` | HTML text | How you can use Tranquilo |
| `pages/terms.html` | HTML text | Please use the site in the ordinary way: browse it, save what you like, share what you love. |
| `pages/terms.html` | HTML text | Please don't: |
| `pages/terms.html` | HTML text | Scrape, bulk-download, or systematically harvest the site or its data |
| `pages/terms.html` | HTML text | Try to break, overload, or gain unauthorized access to the site or its infrastructure |
| `pages/terms.html` | HTML text | Use the site for anything illegal, or to harass or harm anyone |
| `pages/terms.html` | HTML text | Remove or obscure attribution and license information |
| `pages/terms.html` | HTML text | Misrepresent Tranquilo's content as your own |
| `pages/terms.html` | HTML text | If you want programmatic access to the catalogue, |
| `pages/terms.html` | HTML text | get in touch |
| `pages/terms.html` | HTML text | . |
| `pages/terms.html` | HTML text | Things you submit |
| `pages/terms.html` | HTML text | If you submit a collection for consideration, or send us feedback, a bug report, or a message: |
| `pages/terms.html` | HTML text | You confirm you have the right to submit what you're sending, and that any collection you propose is genuinely openly licensed |
| `pages/terms.html` | HTML text | You give us permission to use what you send to run and improve Tranquilo, including adding a proposed collection to the catalogue |
| `pages/terms.html` | HTML text | We can't promise to review, respond to, or act on any submission, and we may decline any submission for any reason |
| `pages/terms.html` | HTML text | Donations |
| `pages/terms.html` | HTML text | Tranquilo runs on direct support rather than ads. If you choose to donate, it's voluntary and it doesn't buy anything extra in the product. Everyone gets the same free product. |
| `pages/terms.html` | HTML text | Payments are processed by Stripe under their terms. Donations are generally not refundable, but if something went wrong — a duplicate charge, a mistake — email us at |
| `pages/terms.html` | HTML text | hello@tranquilo.art |
| `pages/terms.html` | HTML text | and we'll sort it out. |
| `pages/terms.html` | HTML text | You can give once or set up a recurring monthly donation. If you set one up, you can cancel it at any time: use the link in your Stripe receipt, or email us at |
| `pages/terms.html` | HTML text | hello@tranquilo.art |
| `pages/terms.html` | HTML text | and we'll cancel it for you. |
| `pages/terms.html` | HTML text | Saved collections |
| `pages/terms.html` | HTML text | Anything you bookmark is saved in your own browser, not on our servers. That means it stays with you — but it also means we can't recover it. If you clear your browser data, switch browsers, or use a different device, your saved pieces won't follow you, and we have no copy to restore. |
| `pages/terms.html` | HTML text | Ending access |
| `pages/terms.html` | HTML text | You can stop using Tranquilo at any time — there's no account to close. |
| `pages/terms.html` | HTML text | We may block access to anyone who breaks these terms or puts the site at risk. |
| `pages/terms.html` | HTML text | No warranties |
| `pages/terms.html` | HTML text | Tranquilo is provided "as is," without warranties of any kind. We don't guarantee that the site will be available, that it will be free of errors, or that the information on it is accurate or complete. |
| `pages/terms.html` | HTML text | Limits on our liability |
| `pages/terms.html` | HTML text | To the fullest extent allowed by law, Tranquilo and the people behind it are not liable for any indirect or consequential loss arising from your use of the site, or for anything that happens because you relied on information you found here. |
| `pages/terms.html` | HTML text | Nothing in these terms limits rights you have under Brazilian consumer law that can't be waived. |
| `pages/terms.html` | HTML text | Governing law |
| `pages/terms.html` | HTML text | These terms are governed by the laws of Brazil. Any dispute will be handled by the courts of Belo Horizonte, Minas Gerais, Brazil, unless the law requires otherwise. |
| `pages/terms.html` | HTML text | Getting in touch |
| `pages/terms.html` | HTML text | Questions about these terms: |
| `pages/terms.html` | HTML text | hello@tranquilo.art |
| `pages/thank-you.html` | document title | Thank you — Tranquilo |
| `pages/thank-you.html` | content | Thank you for supporting Tranquilo. |
| `pages/thank-you.html` | HTML text | Thank you — Tranquilo |
| `pages/thank-you.html` | HTML text | Thank you |
| `pages/thank-you.html` | HTML text | That genuinely helps. Stripe will email you a receipt. |
| `pages/thank-you.html` | HTML text | Paid by Boleto? Those take a few days to clear — nothing more is needed from you. |
| `pages/thank-you.html` | HTML text | Back to the art |
| `pages/pt-BR/about.html` | document title | Sobre — Tranquilo |
| `pages/pt-BR/about.html` | content | Por que Tranquilo existe, como ele funciona e o que ele quer ser. |
| `pages/pt-BR/about.html` | placeholder | voce@exemplo.com |
| `pages/pt-BR/about.html` | HTML text | Sobre — Tranquilo |
| `pages/pt-BR/about.html` | HTML text | Sobre Tranquilo |
| `pages/pt-BR/about.html` | HTML text | Por que Tranquilo existe |
| `pages/pt-BR/about.html` | HTML text | Olá! Sou a Mel, a criadora de Tranquilo.art, um museu digital tranquilo, sem anúncios, e uma plataforma de arte de código aberto, onde você pode explorar arte em domínio público de graça. Ele também respeita a sua privacidade. |
| `pages/pt-BR/about.html` | HTML text | A origem do Tranquilo é pessoal. Há pouco tempo, me afastei do trabalho corporativo com produto e design para cuidar da minha saúde. Enquanto me concentrava em descansar, percebi que navegar nos aplicativos de sempre era mais estressante do que prazeroso. |
| `pages/pt-BR/about.html` | HTML text | Quando comecei a recuperar a minha energia, criei o protótipo do Tranquilo para descansar na cama e ver arte do Met. Ele começou com cerca de 40 obras. Usando o app nos meus momentos de pausa, comecei a descobrir histórias curiosas por trás das obras e a pensar em como levar a alegria de descobrir arte a outras pessoas. Quando me dei conta, sugestões de amigos e de outras pessoas começaram a chegar. Desde então, não parei de melhorar o app. Hoje são milhares de obras de um número crescente de instituições, e fico genuinamente animada com cada novo conjunto de obras que entra no nosso catálogo. |
| `pages/pt-BR/about.html` | HTML text | Alguns pontos em que estou me focando: |
| `pages/pt-BR/about.html` | HTML text | Um produto honesto |
| `pages/pt-BR/about.html` | HTML text | , que não explora seus usuários. Quero que Tranquilo seja sustentável, não focado em crescer a qualquer custo. Vou continuar mantendo um produto público, robusto e gratuito. |
| `pages/pt-BR/about.html` | HTML text | Sem anúncios. Sem cookies. Sem rastreio. |
| `pages/pt-BR/about.html` | HTML text | Você pode |
| `pages/pt-BR/about.html` | HTML text | doar aqui |
| `pages/pt-BR/about.html` | HTML text | para ajudar a manter Tranquilo gratuito e respeitando a sua privacidade. |
| `pages/pt-BR/about.html` | HTML text | Focando em domínio público |
| `pages/pt-BR/about.html` | HTML text | (e equivalentes). Existe muita arte fabulosa de acesso aberto esperando para ser apreciada. Tenho muito carinho por tornar essas obras fáceis de encontrar e de explorar. |
| `pages/pt-BR/about.html` | HTML text | O projeto ainda está em estágio inicial. Espero que você me mande suas impressões e me acompanhe nessa jornada. |
| `pages/pt-BR/about.html` | HTML text | Perguntas frequentes |
| `pages/pt-BR/about.html` | HTML text | Tranquilo é gratuito? |
| `pages/pt-BR/about.html` | HTML text | Sim. Navegar e salvar obras é gratuito, e a sua coleção fica guardada localmente no seu navegador. |
| `pages/pt-BR/about.html` | HTML text | Que tipos de licença são aceitos para submissão de acervos? |
| `pages/pt-BR/about.html` | HTML text | CC0, CC-BY, CC-BY-SA, domínio público ou uma licença aberta equivalente, tanto para as imagens quanto para os metadados. Não aceito material com direitos restritos ou sem licença — veja a declaração completa de critérios na |
| `pages/pt-BR/about.html` | HTML text | página de envio |
| `pages/pt-BR/about.html` | HTML text | (em inglês). |
| `pages/pt-BR/about.html` | HTML text | Acho que encontrei um erro. Como faço para relatar? |
| `pages/pt-BR/about.html` | HTML text | Mesmo testando intensamente, alguns erros podem passar despercebidos. O |
| `pages/pt-BR/about.html` | HTML text | formulário de sugestões |
| `pages/pt-BR/about.html` | HTML text | é a melhor forma de relatar um — ele registra automaticamente de qual página você veio. Inclua o dispositivo que você estava usando (notebook ou celular, e o modelo) e o navegador e a versão. |
| `pages/pt-BR/about.html` | HTML text | Fique por dentro |
| `pages/pt-BR/about.html` | HTML text | Receba um aviso quando houver novidades no app, ou qualquer outra coisa que valha a pena saber. Sem spam; cancele quando quiser. |
| `pages/pt-BR/about.html` | HTML text | E-mail |
| `pages/pt-BR/about.html` | HTML text | Digite um endereço de e-mail válido. |
| `pages/pt-BR/about.html` | HTML text | Notifique-me |
| `pages/pt-BR/about.html` | HTML text | Você está na lista — entraremos em contato. |
| `pages/pt-BR/feedback.html` | document title | Dê sua opinião — Tranquilo |
| `pages/pt-BR/feedback.html` | content | Relate um erro ou sugira algo para o Tranquilo. Não é preciso criar conta, e o e-mail é opcional. |
| `pages/pt-BR/feedback.html` | placeholder | Quanto mais detalhes, melhor: o que você estava fazendo, o que esperava e o que aconteceu. Para um erro, o seu dispositivo e navegador ajudam muito (ex.: iPhone 14, Safari 17). |
| `pages/pt-BR/feedback.html` | placeholder | ex.: o feed, a página de uma obra, este formulário |
| `pages/pt-BR/feedback.html` | placeholder | Só se quiser uma resposta |
| `pages/pt-BR/feedback.html` | HTML text | Dê sua opinião — Tranquilo |
| `pages/pt-BR/feedback.html` | HTML text | Dê sua opinião |
| `pages/pt-BR/feedback.html` | HTML text | Algo não funciona, ou está faltando alguma coisa? |
| `pages/pt-BR/feedback.html` | HTML text | Só a mensagem é obrigatória. O e-mail é opcional: se preferir não se identificar, deixe em branco. Só não vamos conseguir responder. |
| `pages/pt-BR/feedback.html` | HTML text | Do que se trata? |
| `pages/pt-BR/feedback.html` | HTML text | Algo não funciona |
| `pages/pt-BR/feedback.html` | HTML text | Uma ideia de funcionalidade |
| `pages/pt-BR/feedback.html` | HTML text | Algo sobre uma obra específica |
| `pages/pt-BR/feedback.html` | HTML text | Outra coisa |
| `pages/pt-BR/feedback.html` | HTML text | O que aconteceu? * |
| `pages/pt-BR/feedback.html` | HTML text | Conte o que aconteceu. |
| `pages/pt-BR/feedback.html` | HTML text | Onde você estava? |
| `pages/pt-BR/feedback.html` | HTML text | Preenchido automaticamente se você veio do app. Edite ou apague à vontade. |
| `pages/pt-BR/feedback.html` | HTML text | Seu e-mail (opcional) |
| `pages/pt-BR/feedback.html` | HTML text | Usamos apenas para responder a você sobre isso. |
| `pages/pt-BR/feedback.html` | HTML text | Esse e-mail não parece válido. Corrija ou apague o campo para enviar sem se identificar. |
| `pages/pt-BR/feedback.html` | HTML text | Enviar opinião |
| `pages/pt-BR/feedback.html` | HTML text | As opiniões chegam a uma pessoa de verdade, não a uma fila de chamados. Lemos tudo e agimos a partir de padrões, não de casos isolados. Então, se algo importa para você, vale dizer, mesmo que ache que outra pessoa já disse. |
| `pages/pt-BR/feedback.html` | HTML text | Pronto, recebemos |
| `pages/pt-BR/feedback.html` | HTML text | Lemos cada mensagem. Se você deixou um e-mail, responderemos quando houver algo a dizer. |
| `pages/pt-BR/submit.html` | document title | Enviar um acervo — Tranquilo |
| `pages/pt-BR/submit.html` | content | Envie um acervo com licença aberta para avaliação no Tranquilo. |
| `pages/pt-BR/submit.html` | placeholder | ex.: Highsmith Street Photography |
| `pages/pt-BR/submit.html` | placeholder | Nome completo |
| `pages/pt-BR/submit.html` | placeholder | voce@exemplo.com |
| `pages/pt-BR/submit.html` | placeholder | Informe a licença aberta usada |
| `pages/pt-BR/submit.html` | placeholder | Onde essa licença está documentada |
| `pages/pt-BR/submit.html` | placeholder | O que há neste acervo? |
| `pages/pt-BR/submit.html` | placeholder | Opcional |
| `pages/pt-BR/submit.html` | HTML text | Enviar um acervo — Tranquilo |
| `pages/pt-BR/submit.html` | HTML text | Enviar um acervo |
| `pages/pt-BR/submit.html` | HTML text | Envie um acervo aberto para avaliação |
| `pages/pt-BR/submit.html` | HTML text | Só aceitamos acervos com licença aberta: CC0, CC-BY, domínio público ou equivalente. Nada com direitos restritos ou sem licença. |
| `pages/pt-BR/submit.html` | HTML text | Nome do acervo * |
| `pages/pt-BR/submit.html` | HTML text | Informe o nome do acervo. |
| `pages/pt-BR/submit.html` | HTML text | Seu nome * |
| `pages/pt-BR/submit.html` | HTML text | Informe o seu nome. |
| `pages/pt-BR/submit.html` | HTML text | Seu e-mail * |
| `pages/pt-BR/submit.html` | HTML text | Digite um endereço de e-mail válido. |
| `pages/pt-BR/submit.html` | HTML text | Link do acervo * |
| `pages/pt-BR/submit.html` | HTML text | Site, repositório ou API onde o acervo está. |
| `pages/pt-BR/submit.html` | HTML text | Informe um link válido, começando com http:// ou https:// |
| `pages/pt-BR/submit.html` | HTML text | Tipo de licença * |
| `pages/pt-BR/submit.html` | HTML text | Selecione uma licença… |
| `pages/pt-BR/submit.html` | HTML text | CC0 |
| `pages/pt-BR/submit.html` | HTML text | CC-BY |
| `pages/pt-BR/submit.html` | HTML text | CC-BY-SA |
| `pages/pt-BR/submit.html` | HTML text | Domínio público |
| `pages/pt-BR/submit.html` | HTML text | Outra licença aberta |
| `pages/pt-BR/submit.html` | HTML text | Selecione um tipo de licença. |
| `pages/pt-BR/submit.html` | HTML text | Descreva a licença * |
| `pages/pt-BR/submit.html` | HTML text | Descreva a licença. |
| `pages/pt-BR/submit.html` | HTML text | Link de verificação da licença * |
| `pages/pt-BR/submit.html` | HTML text | Informe um link válido, começando com http:// ou https:// |
| `pages/pt-BR/submit.html` | HTML text | Descrição curta * |
| `pages/pt-BR/submit.html` | HTML text | Adicione uma descrição curta. |
| `pages/pt-BR/submit.html` | HTML text | Tamanho estimado (número de obras) |
| `pages/pt-BR/submit.html` | HTML text | Confirmo que este acervo tem licença aberta e que tenho o direito de enviá-lo. |
| `pages/pt-BR/submit.html` | HTML text | Confirme a declaração sobre a licença antes de enviar. |
| `pages/pt-BR/submit.html` | HTML text | Quero receber novidades do Tranquilo de vez em quando: novos acervos, funcionalidades e próximos passos. Sem spam; cancele quando quiser. |
| `pages/pt-BR/submit.html` | HTML text | Enviar para avaliação |
| `pages/pt-BR/submit.html` | HTML text | Avaliamos cada envio e retornaremos com uma decisão. Não podemos prometer um prazo, mas vamos dar notícias. |
| `pages/pt-BR/submit.html` | HTML text | Envio recebido |
| `pages/pt-BR/submit.html` | HTML text | Recebemos e vamos avaliar. Não podemos prometer um prazo, mas vamos dar notícias. |

## 4. Locked wording and UI symbols

| Source location | String / surface | Note |
|---|---|---|
| `src/components/TranquiloDetailModal.ts` and storyline detail rendering | “Drafted with AI help; edited and reviewed by a person.” | Locked approved wording; corresponding `ai.disclosure.*` catalogue entries are reference values and must remain identical. |
| `src/components/TranquiloDetailModal.ts` and storyline detail rendering | “Spotted an error?” | Locked approved wording. |
| `src/components/TranquiloDetailModal.ts` and storyline detail rendering | “How this text was written” | Locked approved accessible label. |
| Detail, storyline, topbar, lightbox and modal templates | ×, ←, → and SVG icons | Icon-only controls rely on accessible names; those labels are catalogued above where localized. |

## 5. Conditional UI source map

These modules own the states where catalogue strings appear.

- Search panel, history, autocomplete, no-results and typo suggestions: `src/components/TranquiloSearchBar.ts`, `src/app/SearchController.ts`
- Top bar, mobile navigation, collection/export actions and share banner: `src/components/TranquiloTopbar.ts`, `src/app.ts`
- Artwork detail, metadata labels, source/citation/report flows, The Twist, Meet the Cast and shelf navigation: `src/components/TranquiloDetailModal.ts`
- Storyline mode and chapter navigation: `src/components/TranquiloStorylineMode.ts`
- Discover shelves and shelf detail: `src/components/TranquiloShelvesMode.ts`, `src/components/TranquiloShelfMode.ts`
- Feed slides, intro, nudity gate, image failure and position labels: `src/feed/slideBuilder.ts`, `src/feed/introSlides.ts`, `src/components/TranquiloFeed.ts`
- Full-resolution lightbox: `src/components/TranquiloLightbox.ts`
- Export confirmation and collection upsell toast: `src/components/TranquiloExportModal.ts`, `src/components/TranquiloUpsellToast.ts`
- Donation/support strip and newsletter dialog: `src/components/TranquiloSupportStrip.ts`, `src/components/TranquiloNewsletterModal.ts`
- Startup/feed error state: `src/errorState.ts`
- Static page chrome, locale-specific nav/footer and community partials: `pages/_base.html`, `vite-plugins/base-template.mts`, `vite-plugins/community-partial.mts`
- Form validation and submit/error states: `src/pages/about.ts`, `src/pages/curator.ts`, `src/pages/feedback.ts`, `src/pages/submit.ts`, `src/pages/support.ts`, `src/pages/thank-you.ts`

## 6. Browser/runtime verification checklist

Run `bun install` and `bun run dev` as described in `CONTRIBUTING.md`. The frontend-only dev server uses offline/local fixtures for the UI; no live catalogue credentials are needed for the visual audit.

- [ ] Initial feed, intro slide, first-scroll hint, loading and image-error/retry states.
- [ ] Search closed/open, empty input, recent searches, autocomplete, result count, no results, typo suggestion and related-concept message.
- [ ] Mobile top bar and desktop controls; collection empty/non-empty, collection count, export confirmation, toast and upsell dismiss.
- [ ] Artwork detail metadata, sources, license, citation copy success/failure, report menu, The Twist, Meet the Cast and missing verified detail.
- [ ] Discover landing, shelf list, selected shelf, share action, storyline intro, chapter navigation and chapter detail.
- [ ] Lightbox loading/full-resolution labels and close control.
- [ ] Startup/feed failure and retry/back actions.
- [ ] Newsletter, support/donation, curator waitlist, feedback and collection-submission forms, including invalid/busy/success/error states.
- [ ] Each static page above, including Portuguese translated pages; inspect document title, visible text, placeholders, `aria-label`, `title` and `alt`.
- [ ] Confirm repeated copy in its visual context, including punctuation/capitalization differences.
- [ ] Check responsive mobile layout and keyboard/screen-reader names, not just source literals.

## 7. Quick duplicate-copy summary

Common repeated dictionary values include “Close”, “Join the waitlist”, “Dismiss”, “Subscribe”, “Get involved”, “Nothing collected yet”, “Email”, and “you@example.com”. Their exact key mapping is in section 2. Context-specific keys are intentionally preserved for now rather than merging the copy or introducing an i18n mechanism as part of this audit.
