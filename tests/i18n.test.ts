// The string-lookup layer every translated surface depends on. What these
// pin down are the guarantees a visitor (or a reviewer) would notice:
//   - a half-translated language still renders, falling back per key
//   - a browser asking for a language we haven't finished never gets it
//     automatically -- draft locales are opt-in only
//   - <html lang> names the language actually on screen, not the one the
//     browser asked for
//   - plurals and numbers follow the active language's own rules
// The pure functions in src/i18n/core.ts take their inputs as arguments,
// so most of this runs on small fixture dictionaries rather than the real
// ones, which will change as strings are added.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fallbackChain,
  interpolate,
  lookup,
  matchLocale,
  pluralKey,
  resolveLocale,
} from "../src/i18n/core";
import { en } from "../src/i18n/en";
import { DEFAULT_LOCALE, LOCALES, type LocaleInfo } from "../src/i18n/locales";

const FIXTURE_LOCALES: readonly LocaleInfo[] = [
  { code: "en", nativeName: "English", dir: "ltr", status: "shipped" },
  {
    code: "pt-BR",
    nativeName: "Português (Brasil)",
    dir: "ltr",
    status: "shipped",
  },
  {
    code: "es-419",
    nativeName: "Español (Latinoamérica)",
    dir: "ltr",
    status: "draft",
  },
];

describe("matchLocale", () => {
  it("matches an exact code, ignoring case", () => {
    expect(matchLocale(["pt-br"], FIXTURE_LOCALES)).toBe("pt-BR");
  });

  it("matches on base language when the region differs", () => {
    // A pt-PT reader is far better served by pt-BR than by English.
    expect(matchLocale(["pt-PT"], FIXTURE_LOCALES)).toBe("pt-BR");
    expect(matchLocale(["pt"], FIXTURE_LOCALES)).toBe("pt-BR");
    expect(matchLocale(["en-GB"], FIXTURE_LOCALES)).toBe("en");
  });

  it("honours the browser's order of preference", () => {
    expect(matchLocale(["fr-FR", "pt-BR", "en"], FIXTURE_LOCALES)).toBe(
      "pt-BR",
    );
    expect(matchLocale(["en-US", "pt-BR"], FIXTURE_LOCALES)).toBe("en");
  });

  it("prefers an exact match over an earlier base-only match", () => {
    const locales: readonly LocaleInfo[] = [
      { code: "en", nativeName: "English", dir: "ltr", status: "shipped" },
      { code: "pt-PT", nativeName: "Português", dir: "ltr", status: "shipped" },
      {
        code: "pt-BR",
        nativeName: "Português (Brasil)",
        dir: "ltr",
        status: "shipped",
      },
    ];
    expect(matchLocale(["pt-BR"], locales)).toBe("pt-BR");
  });

  it("returns undefined when nothing matches, and ignores junk", () => {
    expect(
      matchLocale(["fr", "", "not a tag"], FIXTURE_LOCALES),
    ).toBeUndefined();
    expect(matchLocale([], FIXTURE_LOCALES)).toBeUndefined();
  });
});

describe("resolveLocale", () => {
  it("uses an explicit stored choice, even for a draft locale", () => {
    // Stored preference only gets set by an explicit choice, which is how
    // a reviewer reaches a draft locale.
    expect(
      resolveLocale({
        stored: "es-419",
        browser: ["pt-BR"],
        locales: FIXTURE_LOCALES,
      }),
    ).toBe("es-419");
  });

  it("never picks a draft locale from the browser automatically", () => {
    expect(
      resolveLocale({
        stored: null,
        browser: ["es-MX"],
        locales: FIXTURE_LOCALES,
      }),
    ).toBe(DEFAULT_LOCALE);
  });

  it("falls back to the browser's languages, then English", () => {
    expect(
      resolveLocale({
        stored: null,
        browser: ["pt-BR"],
        locales: FIXTURE_LOCALES,
      }),
    ).toBe("pt-BR");
    expect(
      resolveLocale({
        stored: null,
        browser: ["de-DE"],
        locales: FIXTURE_LOCALES,
      }),
    ).toBe("en");
  });

  it("ignores a stored value that isn't a registered locale", () => {
    // localStorage is user-editable and outlives deploys; a locale that was
    // removed, or garbage, must not stick the visitor on raw fallbacks.
    expect(
      resolveLocale({
        stored: "xx-YY",
        browser: ["pt-BR"],
        locales: FIXTURE_LOCALES,
      }),
    ).toBe("pt-BR");
  });
});

describe("fallbackChain", () => {
  it("goes region -> base language -> English, skipping what doesn't exist", () => {
    const available = new Set(["en", "pt", "pt-BR"]);
    expect(fallbackChain("pt-BR", available)).toEqual(["pt-BR", "pt", "en"]);
    expect(fallbackChain("pt-BR", new Set(["en", "pt-BR"]))).toEqual([
      "pt-BR",
      "en",
    ]);
  });

  it("is just English for English", () => {
    expect(fallbackChain("en", new Set(["en", "pt-BR"]))).toEqual(["en"]);
  });
});

describe("lookup", () => {
  const dictionaries = {
    en: { "a.one": "One", "a.two": "Two", "a.three": "Three" },
    pt: { "a.two": "Dois (pt)", "a.three": "Três (pt)" },
    "pt-BR": { "a.three": "Três" },
  };

  it("falls back per key, not per language", () => {
    const chain = ["pt-BR", "pt", "en"];
    expect(lookup("a.three", chain, dictionaries)).toBe("Três");
    expect(lookup("a.two", chain, dictionaries)).toBe("Dois (pt)");
    expect(lookup("a.one", chain, dictionaries)).toBe("One");
  });

  it("treats an empty translation as missing", () => {
    // An empty string is what a half-filled translation file tends to
    // contain; rendering it would show a blank button.
    expect(
      lookup("a.one", ["pt-BR", "en"], {
        ...dictionaries,
        "pt-BR": { "a.one": "" },
      }),
    ).toBe("One");
  });

  it("returns the key itself when no dictionary has it, so the gap is visible", () => {
    expect(lookup("a.missing", ["pt-BR", "en"], dictionaries)).toBe(
      "a.missing",
    );
  });
});

describe("interpolate", () => {
  it("fills {name} placeholders", () => {
    expect(interpolate("Hello, {name}!", { name: "Ana" })).toBe("Hello, Ana!");
    expect(interpolate("{a} and {a}", { a: "x" })).toBe("x and x");
  });

  it("leaves unknown placeholders intact rather than printing 'undefined'", () => {
    expect(interpolate("Hi {name}", {})).toBe("Hi {name}");
  });

  it("inserts values literally -- no pattern syntax leaks through", () => {
    expect(interpolate("Price: {p}", { p: "$& $1" })).toBe("Price: $& $1");
  });
});

describe("pluralKey", () => {
  it("follows each language's own plural rules", () => {
    // English: 0 is plural ("0 works"). Portuguese: 0 is singular ("0 obra").
    expect(pluralKey("works.count", 0, "en")).toBe("works.count.other");
    expect(pluralKey("works.count", 1, "en")).toBe("works.count.one");
    expect(pluralKey("works.count", 0, "pt-BR")).toBe("works.count.one");
    expect(pluralKey("works.count", 2, "pt-BR")).toBe("works.count.other");
  });
});

describe("the real registry and dictionaries", () => {
  it("ships English, and only valid, unique BCP-47 codes", () => {
    const codes = LOCALES.map((l) => l.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(LOCALES.find((l) => l.code === DEFAULT_LOCALE)?.status).toBe(
      "shipped",
    );
    for (const code of codes) {
      expect(Intl.getCanonicalLocales(code)).toEqual([code]);
    }
  });

  it("has no empty English strings", () => {
    for (const [key, value] of Object.entries(en)) {
      expect(value.trim(), key).not.toBe("");
    }
  });
});

describe("runtime (src/i18n/index.ts)", () => {
  // index.ts caches the resolved locale at module level, so each test gets a
  // fresh module with its own fake storage and browser languages.
  let store: Record<string, string>;

  async function loadWith(opts: { stored?: string; languages?: string[] }) {
    store = opts.stored ? { "tranquilo:locale": opts.stored } : {};
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
    });
    vi.stubGlobal("navigator", {
      languages: opts.languages ?? ["en-US"],
      language: "en-US",
    });
    vi.resetModules();
    return import("../src/i18n/index");
  }

  beforeEach(() => {
    vi.unstubAllGlobals();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("t() is synchronous and returns English by default", async () => {
    const i18n = await loadWith({});
    const out = i18n.t("upsell.cta");
    expect(typeof out).toBe("string");
    expect(out).toBe(en["upsell.cta"]);
  });

  it("a browser asking for draft pt-BR still gets English", async () => {
    const i18n = await loadWith({ languages: ["pt-BR", "pt"] });
    expect(i18n.currentLocale()).toBe("en");
  });

  it("setLocale() persists an explicit choice and switches lookups", async () => {
    const i18n = await loadWith({});
    i18n.setLocale("pt-BR");
    expect(store["tranquilo:locale"]).toBe("pt-BR");
    expect(i18n.currentLocale()).toBe("pt-BR");
    // Missing pt-BR keys still render in English rather than as raw keys.
    expect(i18n.t("upsell.cta")).not.toBe("upsell.cta");
  });

  it("setLocale() rejects codes that aren't registered", async () => {
    const i18n = await loadWith({});
    expect(() => i18n.setLocale("xx-YY")).toThrow();
    expect(i18n.currentLocale()).toBe("en");
  });

  it("survives storage that throws (private mode, blocked storage)", async () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("SecurityError");
      },
    });
    vi.stubGlobal("navigator", { languages: ["en-US"], language: "en-US" });
    vi.resetModules();
    const i18n = await import("../src/i18n/index");
    expect(i18n.currentLocale()).toBe("en");
    expect(() => i18n.setLocale("pt-BR")).not.toThrow();
    expect(i18n.currentLocale()).toBe("pt-BR");
  });

  it("applyDocumentLocale() sets lang and dir to the resolved locale", async () => {
    const i18n = await loadWith({ languages: ["pt-BR"] });
    const el = { lang: "", dir: "" };
    i18n.applyDocumentLocale(el);
    // pt-BR is draft, so the page is English and must say so.
    expect(el).toEqual({ lang: "en", dir: "ltr" });

    i18n.setLocale("pt-BR");
    i18n.applyDocumentLocale(el);
    expect(el).toEqual({ lang: "pt-BR", dir: "ltr" });
  });

  it("formatNumber() uses the active locale's separators", async () => {
    const i18n = await loadWith({});
    expect(i18n.formatNumber(1234)).toBe("1,234");
    i18n.setLocale("pt-BR");
    expect(i18n.formatNumber(1234)).toBe("1.234");
  });

  it("shippedLocales() lists only shipped locales, for the switcher", async () => {
    const i18n = await loadWith({});
    const codes = i18n.shippedLocales().map((l) => l.code);
    expect(codes).toContain("en");
    for (const l of i18n.shippedLocales()) expect(l.status).toBe("shipped");
  });

  // For sentences that wrap markup around a value ("<strong>3</strong>
  // results for …"): the translated template is escaped -- translations are
  // contributed text -- but params are caller-built HTML, inserted as given.
  // Escaping user input in a param stays the caller's job.
  describe("tHtml / tnHtml", () => {
    it("escapes the translated template", async () => {
      const i18n = await loadWith({});
      expect(i18n.tHtml("detail.report.image")).toBe(
        "There&#39;s an issue with image",
      );
    });

    it("inserts params as given, so callers can wrap markup", async () => {
      const i18n = await loadWith({});
      expect(i18n.tHtml("detail.cast.possibly", { name: "<b>Ana</b>" })).toBe(
        "Possibly <b>Ana</b>",
      );
    });

    it("picks the plural form by count, and lets {count} carry markup", async () => {
      const i18n = await loadWith({});
      expect(
        i18n.tnHtml("topbar.collection.count", 3, {
          count: "<strong>3</strong>",
        }),
      ).toBe("My Collection, <strong>3</strong> items");
      expect(i18n.tnHtml("topbar.collection.count", 1)).toBe(
        "My Collection, 1 item",
      );
    });
  });

  // A translated static page carries data-locale on <html> (set at build
  // time). Landing on one is choosing that language: it's adopted and
  // remembered, so going on to the feed stays in it.
  describe("static pages and page links", () => {
    it("adopts a translated page's own locale and remembers it", async () => {
      vi.stubGlobal("document", {
        documentElement: { dataset: { locale: "pt-BR" } },
      });
      const i18n = await loadWith({});
      expect(i18n.currentLocale()).toBe("pt-BR");
      expect(store["tranquilo:locale"]).toBe("pt-BR");
    });

    it("lets an explicit ?lang= win over the page's locale", async () => {
      vi.stubGlobal("document", {
        documentElement: { dataset: { locale: "pt-BR" } },
      });
      vi.stubGlobal("location", { search: "?lang=en" });
      const i18n = await loadWith({});
      expect(i18n.currentLocale()).toBe("en");
    });

    it("pagePath() links the translated page when there is one", async () => {
      const i18n = await loadWith({});
      expect(i18n.pagePath("about.html")).toBe("/pages/about.html");
      i18n.setLocale("pt-BR");
      expect(i18n.pagePath("about.html")).toBe("/pages/pt-BR/about.html");
      // Not translated: the English page, never a dead link.
      expect(i18n.pagePath("terms.html")).toBe("/pages/terms.html");
    });
  });

  // ?lang= is the shareable way into a locale -- including a draft one, so
  // a preview link can be shared (e.g. with a reviewer) before the language
  // is public. It's an explicit choice, so it's
  // remembered like any other.
  describe("applyLocaleParam (?lang=)", () => {
    it("opts into a draft locale and remembers it", async () => {
      const i18n = await loadWith({});
      expect(i18n.applyLocaleParam("?lang=pt-BR")).toBe(true);
      expect(i18n.currentLocale()).toBe("pt-BR");
      expect(store["tranquilo:locale"]).toBe("pt-BR");
    });

    it("accepts the code case-insensitively", async () => {
      const i18n = await loadWith({});
      expect(i18n.applyLocaleParam("?lang=pt-br")).toBe(true);
      expect(i18n.currentLocale()).toBe("pt-BR");
    });

    it("switches back to English with ?lang=en", async () => {
      const i18n = await loadWith({ stored: "pt-BR" });
      expect(i18n.applyLocaleParam("?lang=en")).toBe(true);
      expect(i18n.currentLocale()).toBe("en");
    });

    it("ignores an unknown code instead of throwing -- links get mangled", async () => {
      const i18n = await loadWith({ stored: "pt-BR" });
      expect(i18n.applyLocaleParam("?lang=xx")).toBe(false);
      expect(i18n.currentLocale()).toBe("pt-BR");
    });

    it("is honoured by the very first lookup, before any startup code runs", async () => {
      // Components render while modules are still evaluating -- before
      // app.ts's start() -- so the link must win on first resolution, not
      // only when something remembers to call applyLocaleParam().
      vi.stubGlobal("location", { search: "?lang=pt-BR" });
      const i18n = await loadWith({});
      expect(i18n.currentLocale()).toBe("pt-BR");
      expect(store["tranquilo:locale"]).toBe("pt-BR");
    });

    it("does nothing without the parameter", async () => {
      const i18n = await loadWith({});
      expect(i18n.applyLocaleParam("?resetUpsell=1")).toBe(false);
      expect(i18n.applyLocaleParam("")).toBe(false);
      expect(i18n.currentLocale()).toBe("en");
    });
  });
});
