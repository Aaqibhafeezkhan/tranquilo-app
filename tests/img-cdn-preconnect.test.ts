import { describe, expect, it } from "vitest";
import { addImgCdnPreconnect } from "../vite-plugins/img-cdn-preconnect.mts";

const HTML = `<html><head>
<title>t</title>
</head><body></body></html>`;

describe("addImgCdnPreconnect", () => {
  it("adds a cross-origin preconnect to the image CDN origin", () => {
    const out = addImgCdnPreconnect(HTML, "https://cdn.example.test");
    expect(out).toContain(
      '<link rel="preconnect" href="https://cdn.example.test" crossorigin>',
    );
  });

  it("keeps only the origin when the base URL has a path or trailing slash", () => {
    const out = addImgCdnPreconnect(HTML, "https://cdn.example.test/base/");
    expect(out).toContain('href="https://cdn.example.test"');
    expect(out).not.toContain("/base");
  });

  it("puts the tag inside <head>", () => {
    const out = addImgCdnPreconnect(HTML, "https://cdn.example.test");
    expect(out.indexOf("preconnect")).toBeLessThan(out.indexOf("</head>"));
  });

  it.each([
    undefined,
    "",
    "not a url",
    "ftp://cdn.example.test",
    "javascript:alert(1)",
  ])("leaves the page unchanged for %s", (value) => {
    expect(addImgCdnPreconnect(HTML, value)).toBe(HTML);
  });

  it("does not add the tag twice", () => {
    const once = addImgCdnPreconnect(HTML, "https://cdn.example.test");
    expect(addImgCdnPreconnect(once, "https://cdn.example.test")).toBe(once);
  });

  it("cannot be used to inject markup through the base URL", () => {
    const out = addImgCdnPreconnect(
      HTML,
      'https://cdn.example.test"><script>alert(1)</script>',
    );
    expect(out).not.toContain("<script>");
  });
});
