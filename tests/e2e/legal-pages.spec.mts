// A legal page is the one surface where "the copy says X" and "the product
// does X" must not drift -- the gap is a broken promise, not a typo. These
// tests pin the checkable claims.
import { expect, test } from "@playwright/test";
import { gotoFeed, ITEMS, scrollToSlide, stubBackend } from "./harness.mts";

test.describe("Terms of Service", () => {
  test.beforeEach(async ({ page }) => {
    await stubBackend(page);
    await page.goto("/pages/terms.html");
  });

  test("names the operating entity and the last-updated date", async ({
    page,
  }) => {
    const main = await page.locator("main").innerText();
    expect(main).toContain("Cora Studios ME");
    expect(main).toContain("Belo Horizonte");
    expect(main).toMatch(/Last updated: 15 August 2026/);
  });

  test("carries every clause, in order, for whichever gate state is live", async ({
    page,
  }) => {
    // Asserts the exact heading list, derived from the live gate state, so
    // it keeps checking the real thing in both states instead of being
    // rewritten at each flip. (Numbers are a CSS counter now, not in innerText.)
    const donationsOn = await page.evaluate(() => {
      const el = document.querySelector("[data-donations]");
      return el ? el.checkVisibility() : true;
    });
    const ALL = [
      "Accepting these terms",
      "What Tranquilo is",
      "The artwork and the writing",
      "AI-generated content",
      "How you can use Tranquilo",
      "Things you submit",
      "Donations",
      "Saved collections",
      "Ending access",
      "No warranties",
      "Limits on our liability",
      "Governing law",
      "Getting in touch",
    ];
    const expected = donationsOn ? ALL : ALL.filter((h) => h !== "Donations");
    const headings = await page.locator("main h2:visible").allInnerTexts();
    expect(headings).toEqual(expected);
  });

  test("every contact route it offers actually works", async ({ page }) => {
    // §3, §7, §13 promise an email; §5 promises a way to ask about API access.
    await expect(
      page.locator('main a[href="mailto:hello@tranquilo.art"]').first(),
    ).toBeVisible();
    await expect(page.locator('main a[href="feedback.html"]')).toHaveCount(1);
  });

  test("points at the privacy policy as a separate document", async ({
    page,
  }) => {
    // The footer merges them into one entry; this is the only route to it.
    const link = page.locator('main a[href="privacy.html"]');
    await expect(link).toHaveCount(1);
    await link.click();
    await expect(page).toHaveURL(/privacy\.html/);
  });
});

test.describe("Privacy Policy", () => {
  test.beforeEach(async ({ page }) => {
    await stubBackend(page);
    await page.goto("/pages/privacy.html");
  });

  test("discloses that search terms are stored", async ({ page }) => {
    // Search is the one thing recorded that isn't a count -- captures what a
    // person typed. The draft policy didn't mention it.
    const main = await page.locator("main").innerText();
    expect(main).toMatch(/search terms/i);
    expect(main).toMatch(/typed into the search box/i);
  });

  test("does not claim personal data never leaves Brazil", async ({ page }) => {
    // Email goes to Resend and payments to Stripe, both US companies -- so
    // data does cross a border, which LGPD requires disclosing.
    const main = await page.locator("main").innerText();
    expect(main).not.toMatch(/no personal data crossing any border/i);
    expect(main).toMatch(/processed outside Brazil/i);
    expect(main).toMatch(/United States/);
  });

  test("names every processor it relies on", async ({ page }) => {
    const main = await page.locator("main").innerText();
    for (const p of ["Cloudflare", "Vercel", "Neon", "Resend", "PostHog"]) {
      expect(main, `${p} not disclosed`).toContain(p);
    }
    // Stripe must be disclosed exactly when donations are open -- naming an
    // unused processor overstates data handling; omitting it once donations
    // return is an LGPD gap.
    const donationsOn = await page.evaluate(() => {
      const el = document.querySelector("[data-donations]");
      return el ? el.checkVisibility() : true;
    });
    if (donationsOn) {
      expect(main, "Stripe not disclosed while donations are open").toContain(
        "Stripe",
      );
    } else {
      expect(main, "Stripe named while donations are closed").not.toContain(
        "Stripe",
      );
    }
  });

  test("lists the LGPD rights and a route to exercise them", async ({
    page,
  }) => {
    const main = await page.locator("main").innerText();
    expect(main).toContain("ANPD");
    await expect(
      page.locator('main a[href="mailto:hello@tranquilo.art"]').first(),
    ).toBeVisible();
  });

  test("accounts for everything actually kept in the browser", async ({
    page,
  }) => {
    // The draft named only the collection; five other keys exist (music
    // preference, two nudge flags, analytics opt-out, search history).
    const main = await page.locator("main").innerText();
    expect(main).toMatch(/music is on/i);
    expect(main).toMatch(/recent searches/i);
  });

  test("its no-cookies claim holds on the page itself", async ({
    page,
    context,
  }) => {
    // Asserted rather than trusted: a third-party script could break this
    // headline claim without anyone touching the policy.
    await page.waitForTimeout(500);
    const cookies = await context.cookies();
    expect(
      cookies,
      `cookies were set: ${JSON.stringify(cookies.map((c) => c.name))}`,
    ).toEqual([]);
  });
});

test.describe("the licence claim in Terms §3 is true of the product", () => {
  test("the detail panel shows the licence, not just the source", async ({
    page,
  }) => {
    // §3: "we show the source and license alongside it" -- the licence was
    // sent by api/items.js but rendered nowhere.
    await gotoFeed(page);
    await scrollToSlide(page, 1);
    await page.locator("#feed .slide").nth(1).locator(".art-title-btn").click();
    await expect(page.locator("#detailModal")).toHaveClass(/open/);

    const rows = await page.locator("#detailModal .meta-row").allInnerTexts();
    // Case-insensitive: the label is uppercased by CSS.
    const licenceRow = rows.find((r) => /^license/i.test(r));
    expect(
      licenceRow,
      `no License row. Rows present: ${JSON.stringify(rows)}`,
    ).toBeTruthy();
    // Must be a human label, not the raw hyphenated-lowercase database slug.
    expect(licenceRow, "the raw database slug is showing").not.toMatch(
      /[a-z]+-[a-z]/,
    );
  });

  test("known licences link to their deed", async ({ page }) => {
    await gotoFeed(page);
    await scrollToSlide(page, 1);
    await page.locator("#feed .slide").nth(1).locator(".art-title-btn").click();
    await expect(page.locator("#detailModal")).toHaveClass(/open/);

    const link = page.locator("#detailModal .meta-license-link").first();
    if (await link.count()) {
      await expect(link).toHaveAttribute("href", /creativecommons\.org/);
      await expect(link).toHaveAttribute("rel", /license/);
    }
  });

  test("every licence value in the fixture has a display label", async ({
    page,
  }) => {
    // An unmapped slug falls through to the raw value rather than
    // disappearing; catches it before a visitor does.
    await gotoFeed(page);
    const unmapped = await page.evaluate(
      (licences) => {
        const known = [
          "cc0",
          "public-domain",
          "public-domain-mark",
          "cc-by",
          "cc-by-3.0",
          "cc-by-4.0",
          "cc-by-sa",
          "cc-by-sa-3.0",
          "cc-by-sa-4.0",
        ];
        return [...new Set(licences)].filter(
          (l) => l && !known.includes(String(l).toLowerCase()),
        );
      },
      ITEMS.map((i: any) => i.license),
    );
    expect(
      unmapped,
      `licence slugs with no display label: ${JSON.stringify(unmapped)}`,
    ).toEqual([]);
  });
});

// The pt-BR translations of Terms and Privacy. The English text is the
// binding version, and each translation must say so; beyond that, the same
// checkable claims as the English pages have to hold in Portuguese too.
test.describe("pt-BR Terms and Privacy", () => {
  test.beforeEach(async ({ page }) => {
    await stubBackend(page);
  });

  const donationsOn = (page: import("@playwright/test").Page) =>
    page.evaluate(() => {
      const el = document.querySelector("[data-donations]");
      return el ? el.checkVisibility() : true;
    });

  for (const file of ["terms.html", "privacy.html"]) {
    test(`${file} says the English version prevails, and links to it`, async ({
      page,
    }) => {
      await page.goto(`/pages/pt-BR/${file}`);
      await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
      const meta = page.locator("main .legal-meta");
      await expect(meta).toContainText("prevalece a versão em inglês");
      await expect(meta.locator("a")).toHaveAttribute("href", `/pages/${file}`);
    });

    test(`${file} has the same sections as the English page`, async ({
      page,
    }) => {
      await page.goto(`/pages/${file}`);
      const english = await page.locator("main h2:visible").count();
      await page.goto(`/pages/pt-BR/${file}`);
      await expect(page.locator("main h2:visible")).toHaveCount(english);
    });
  }

  test("Terms names the operating entity and the last-updated date", async ({
    page,
  }) => {
    await page.goto("/pages/pt-BR/terms.html");
    const main = await page.locator("main").innerText();
    expect(main).toContain("Cora Studios ME");
    expect(main).toContain("Belo Horizonte");
    expect(main).toContain("15 de agosto de 2026");
    await expect(page.locator('main a[href="feedback.html"]')).toHaveCount(1);
    await expect(page.locator('main a[href="privacy.html"]')).toHaveCount(1);
  });

  test("Privacy names every processor, the ANPD, and the US transfer", async ({
    page,
  }) => {
    await page.goto("/pages/pt-BR/privacy.html");
    const main = await page.locator("main").innerText();
    for (const p of ["Cloudflare", "Vercel", "Neon", "Resend", "PostHog"]) {
      expect(main, `${p} not disclosed`).toContain(p);
    }
    expect(main).toContain("ANPD");
    expect(main).toContain("13 de setembro de 2026");
    expect(main).toMatch(/processadas fora do Brasil/);
    expect(main).toMatch(/Estados Unidos/);
    expect(main).toMatch(/termos de busca/i);
    if (await donationsOn(page)) {
      expect(main).toContain("Stripe");
    } else {
      expect(main, "Stripe named while donations are closed").not.toContain(
        "Stripe",
      );
    }
  });
});

// A translated legal page points at its English original from the
// "last updated" line, which sits outside the body copy. Its link must
// still look like every other link in the prose, not the browser default.
for (const file of ["terms.html", "privacy.html"]) {
  test(`pt-BR ${file}: the link to the English original is styled like body links`, async ({
    page,
  }) => {
    await stubBackend(page);
    await page.goto(`/pages/pt-BR/${file}`);
    const styleOf = (selector: string) =>
      page
        .locator(selector)
        .first()
        .evaluate((a) => {
          const s = getComputedStyle(a);
          return { color: s.color, decoration: s.textDecorationColor };
        });
    expect(await styleOf(".legal-meta a")).toEqual(
      await styleOf(".about-body a"),
    );
  });
}
