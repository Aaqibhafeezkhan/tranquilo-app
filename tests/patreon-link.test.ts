// The Patreon call to action shows "opens soon" until config.toml carries a
// real Patreon URL, and never links anywhere else.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseToml } from "../lib/toml.ts";
import { patreonLinkHtml, patreonUrl } from "../src/components/patreonLink.ts";

const ROOT = join(import.meta.dirname, "..");
const text = { body: "Body", join: "Join", soon: "Opens soon" };

describe("patreonUrl", () => {
  it("accepts an https patreon.com page", () => {
    expect(patreonUrl("https://www.patreon.com/tranquilo")).toBe(
      "https://www.patreon.com/tranquilo",
    );
    expect(patreonUrl("https://patreon.com/c/tranquilo")).toBe(
      "https://patreon.com/c/tranquilo",
    );
  });

  it("treats blank, non-https and look-alike hosts as not configured", () => {
    for (const raw of [
      "",
      "http://www.patreon.com/x",
      "https://patreon.com.evil.example/x",
      "javascript:alert(1)",
      undefined,
    ]) {
      expect(patreonUrl(raw), String(raw)).toBeNull();
    }
  });
});

describe("patreonLinkHtml", () => {
  it("says it opens soon, with no link, while unconfigured", () => {
    const html = patreonLinkHtml(null, text);
    expect(html).toContain("Opens soon");
    expect(html).not.toContain("<a");
  });

  it("links out in a new tab once configured", () => {
    const html = patreonLinkHtml("https://www.patreon.com/tranquilo", text);
    expect(html).toMatch(
      /<a [^>]*href="https:\/\/www\.patreon\.com\/tranquilo"[^>]*target="_blank"[^>]*rel="noopener"/,
    );
    expect(html).not.toContain("Opens soon");
  });
});

describe("where the call to action appears", () => {
  const pages = [
    "pages/support.html",
    "pages/pt-BR/support.html",
    "pages/thank-you.html",
    "pages/pt-BR/thank-you.html",
  ];

  it("is on the support and thank-you pages, gated with donations", () => {
    for (const file of pages) {
      const html = readFileSync(join(ROOT, file), "utf8");
      expect(html, file).toMatch(
        /<tranquilo-patreon-link\b[^>]*\bdata-donations\b/,
      );
    }
  });

  it("has a config entry, so launch is a one-line change", () => {
    const config = parseToml(
      readFileSync(join(ROOT, "config.toml"), "utf8"),
    ) as { patreon?: { url?: unknown } };
    expect(typeof config.patreon?.url).toBe("string");
  });
});
