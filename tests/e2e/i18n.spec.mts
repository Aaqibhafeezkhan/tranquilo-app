// The i18n layer in a real browser: <html lang> must name the language
// actually rendered, and converted components must show real text, never
// raw keys. pt-BR is a draft locale with no strings yet, which makes it the
// useful case: a browser asking for it must stay in English, and someone
// who explicitly opts in must get English fallbacks, not blanks or keys.
import { expect, test } from "@playwright/test";
import { gotoFeed } from "./harness.mts";

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

  test("an explicit opt-in sets lang=pt-BR and falls back per key", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("tranquilo:locale", "pt-BR");
    });
    await gotoFeed(page);
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    // The toast has no pt-BR strings yet: English fallback, never
    // "upsell.cta".
    await expect(page.locator("#upsellCta")).toHaveText("Join the waitlist");
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
