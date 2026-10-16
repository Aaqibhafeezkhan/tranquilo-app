// The i18n layer in a real browser: <html lang> must name the language
// actually rendered, and converted components must show real text, never
// raw keys. pt-BR is a draft locale with no strings yet, which makes it the
// useful case: a browser asking for it must stay in English, and someone
// who explicitly opts in must get English fallbacks, not blanks or keys.
import { expect, test } from "@playwright/test";
import { gotoFeed, stubBackend } from "./harness.mts";

test("an English browser gets lang=en and real toast copy", async ({
  page,
}) => {
  await gotoFeed(page);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  const toast = page.locator("#upsellToast");
  await expect(toast.locator(".upsell-body")).toContainText(
    "Saved temporarily in this browser",
  );
  await expect(toast.locator("#upsellCta")).toHaveText("Join the waitlist");
  await expect(toast.locator("#upsellClose")).toHaveAttribute(
    "aria-label",
    "Dismiss",
  );
});

test.describe("a browser asking for draft pt-BR", () => {
  test.use({ locale: "pt-BR" });

  test("is not switched automatically -- the page says lang=en", async ({
    page,
  }) => {
    await gotoFeed(page);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("an explicit stored opt-in sets lang=pt-BR and its strings", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("tranquilo:locale", "pt-BR");
    });
    await gotoFeed(page);
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    // Per-key fallback to English is pinned by tests/i18n.test.ts with
    // fixture dictionaries; pt-BR itself now covers every key.
    await expect(page.locator("#upsellCta")).toHaveText(
      "Entrar na lista de espera",
    );
  });
});

// ?lang= is the shareable way into a locale, draft ones included, so a
// preview can be shared before the language is public. It must apply to
// the very first screen and stick for the rest of the visit.
test.describe("a ?lang=pt-BR link", () => {
  test("opens the site in pt-BR and is remembered", async ({ page }) => {
    await gotoFeed(page, "?lang=pt-BR");
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    // That the link wins even for text drawn while modules are still
    // evaluating (before start()) is pinned by the unit test "is honoured
    // by the very first lookup" -- chips render inside start(), so this
    // line alone can't tell the two apart.
    await expect(page.locator('button.chip[data-category="All"]')).toHaveText(
      "Todos",
    );

    // A later visit without the parameter keeps the choice.
    await gotoFeed(page);
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  });

  test("the top bar, drawn while modules load, is already in pt-BR", async ({
    page,
  }) => {
    // <tranquilo-topbar> renders its markup in connectedCallback, which
    // runs when its module defines the element -- before app.ts's start().
    // So this fails if the link were only honoured at startup.
    await gotoFeed(page, "?lang=pt-BR");
    await expect(page.locator("#searchToggle")).toHaveAttribute(
      "aria-label",
      "Buscar",
    );
  });

  test("never shows a raw dictionary key anywhere on the page", async ({
    page,
  }) => {
    await gotoFeed(page, "?lang=pt-BR");
    await page.locator("#searchToggle").click();
    // Visible text plus the attributes screen readers and placeholders use.
    const text = await page.evaluate(() => {
      const attrs = Array.from(
        document.querySelectorAll("[aria-label], [placeholder], [title]"),
      ).flatMap((el) => [
        el.getAttribute("aria-label") ?? "",
        el.getAttribute("placeholder") ?? "",
        el.getAttribute("title") ?? "",
      ]);
      return [document.body.innerText, ...attrs].join("\n");
    });
    const keyLike =
      /\b(?:intro|topbar|slide|detail|search|support|shelves|storyline|chips|common|facet|filter|error|lightbox|export|share|collection|upsell|artistCard|setOfWorks)\.[a-zA-Z][\w-]*(?:\.[\w-]+)*/g;
    expect(text.match(keyLike) ?? []).toEqual([]);
  });

  test("?lang=en switches back", async ({ page }) => {
    await gotoFeed(page, "?lang=pt-BR");
    await gotoFeed(page, "?lang=en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator('button.chip[data-category="All"]')).toHaveText(
      "All",
    );
  });
});

// Category values are data keys (filters, shelves, music buckets), so only
// their on-screen label is translated. These pin that split: the chip reads
// in Portuguese, but selecting it still filters by the stored English value.
test.describe("category labels with pt-BR opted in", () => {
  test.use({ locale: "pt-BR" });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("tranquilo:locale", "pt-BR");
    });
  });

  test("chips show translated labels and still filter by value", async ({
    page,
  }) => {
    await gotoFeed(page);
    const allChip = page.locator('button.chip[data-category="All"]');
    await expect(allChip).toHaveText("Todos");

    const paintings = page.locator(
      'button.chip[data-category="Paintings & Portraits"]',
    );
    await expect(paintings).toHaveText("Pinturas e retratos");
    await paintings.click();

    // The row is rebuilt on select; the stored value still identifies it.
    await expect(
      page.locator('button.chip[data-category="Paintings & Portraits"]'),
    ).toHaveClass(/active/);
    // Every slide now on screen belongs to the filtered category and
    // labels it in Portuguese.
    const labels = page.locator("#feed .slide .cat-label");
    await expect(labels.first()).toHaveText("Pinturas e retratos");
    for (const text of await labels.allTextContents()) {
      expect(text).toBe("Pinturas e retratos");
    }
  });

  test("search's Browse-by chips show labels but search by stored value", async ({
    page,
  }) => {
    await gotoFeed(page);
    await page.locator("#searchToggle").click();
    const hints = page.locator(".search-hint-chip");
    await expect(hints.first()).toBeVisible();
    // Two of the six hints are always categories, all of which have pt-BR
    // labels, so none may show its English stored value.
    const english = new Set([
      "Paintings & Portraits",
      "Sculpture & Objects",
      "Works on Paper",
      "Arms & Armor",
      "Photography",
    ]);
    const texts = await hints.allTextContents();
    expect(texts.filter((t) => english.has(t.trim()))).toEqual([]);
    expect(
      texts.some((t) => /Pinturas|Esculturas|Obras|Armas|Fotografia/.test(t)),
    ).toBe(true);
  });

  test("the reset chip stays in the row when the overflow menu collapses chips", async ({
    page,
  }) => {
    // Worst case: chips so wide that every movable one overflows into the
    // More menu. "All" must never be parked, whatever its label -- which
    // only holds if the reflow identifies it by value, not by its text.
    await page.setViewportSize({ width: 720, height: 800 });
    await page.addInitScript(() => {
      document.addEventListener("DOMContentLoaded", () => {
        const style = document.createElement("style");
        style.textContent = "#chips .chip { min-width: 400px; }";
        document.head.appendChild(style);
      });
    });
    await gotoFeed(page);
    // While "All" is the active filter it's pinned for that reason alone,
    // so select another category first: that's when "All" becomes movable.
    await page.locator("#chipsMore").click();
    await page
      .locator('#chipsMoreMenu button.chip[data-category="Photography"]')
      .click();
    await expect(
      page.locator('button.chip[data-category="Photography"]'),
    ).toHaveClass(/active/);
    // Sanity: the overflow really happened, so the assertion below means
    // something.
    await expect(
      page.locator("#chipsMoreMenu button.chip").first(),
    ).toBeAttached();
    await expect(
      page.locator('#chips button.chip[data-category="All"]'),
    ).toHaveText("Todos");
    await expect(
      page.locator('#chipsMoreMenu button.chip[data-category="All"]'),
    ).toHaveCount(0);
  });
});

// Translated static pages (pages/pt-BR/*.html). The page itself is
// Portuguese; landing on it is choosing Portuguese, so the rest of the
// site follows -- and links lead to translated pages where they exist.
test.describe("pt-BR static pages", () => {
  test.beforeEach(async ({ page }) => {
    await stubBackend(page);
  });

  test("the About page is Portuguese, chrome included", async ({ page }) => {
    await page.goto("/pages/pt-BR/about.html");
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    await expect(page.locator("h1")).toHaveText("Por que o Tranquilo existe");
    await expect(page.locator(".mkt-nav-links a.current")).toHaveText("Sobre");
    await expect(
      page.locator('.mkt-footer a[href="/pages/about.html?lang=en"]'),
    ).toHaveText("English");
  });

  test("the Support page's donation strip follows the page's language", async ({
    page,
  }) => {
    await page.goto("/pages/pt-BR/support.html");
    await expect(page.locator(".support-donate-btn")).toContainText("Doar");
  });

  test("landing on a pt-BR page carries Portuguese into the feed", async ({
    page,
  }) => {
    await page.goto("/pages/pt-BR/get-involved.html");
    await gotoFeed(page);
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    // The intro's cards lead to the translated pages.
    await expect(
      page.locator(
        '.slide.intro a.action-card-btn[href="/pages/pt-BR/get-involved.html"]',
      ),
    ).toHaveText("Participe");
  });

  test("English pages don't point at the draft translation", async ({
    page,
  }) => {
    await page.goto("/pages/about.html");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator('a[href*="/pages/pt-BR/"]')).toHaveCount(0);
  });
});
