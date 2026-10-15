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
    // No pt-BR strings exist yet: English fallback, never "upsell.cta".
    await expect(page.locator("#upsellCta")).toHaveText("Join the waitlist");
  });
});
