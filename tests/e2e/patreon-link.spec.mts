// The Patreon call to action renders on the Support and Thank-you pages in
// the page's language, and links only once config.toml has a Patreon URL.

import { expect, test } from "@playwright/test";
import { TRANQUILO_CONFIG } from "../../src/data/config.generated.ts";
import { stubBackend } from "./harness.mts";

const configured = Boolean(TRANQUILO_CONFIG.patreon.url);

for (const path of [
  "/pages/support.html",
  "/pages/thank-you.html",
  "/pages/pt-BR/support.html",
  "/pages/pt-BR/thank-you.html",
]) {
  test(`${path} shows the Patreon call to action`, async ({ page }) => {
    await stubBackend(page);
    await page.goto(path);
    const cta = page.locator("tranquilo-patreon-link");
    await expect(cta.locator(".support-patreon-body")).not.toBeEmpty();
    const link = cta.locator('a[href^="https://"]');
    if (configured) {
      await expect(link).toHaveAttribute("href", /patreon\.com\//);
    } else {
      await expect(link).toHaveCount(0);
      await expect(cta.locator(".support-strip-soon")).toHaveText(
        path.includes("pt-BR") ? /em breve/ : /opens soon/,
      );
    }
  });
}
