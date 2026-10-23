import { describe, expect, it } from "vitest";
import { safeHttpUrl } from "../lib/safe-url.ts";

describe("safeHttpUrl", () => {
  it("passes absolute http(s) URLs through unchanged", () => {
    const met = "https://www.metmuseum.org/art/collection/search/436528";
    expect(safeHttpUrl(met)).toBe(met);
    expect(safeHttpUrl("http://example.org/a?b=1#c")).toBe(
      "http://example.org/a?b=1#c",
    );
  });

  it("rejects script and other non-web schemes", () => {
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("JavaScript:alert(1)")).toBeNull();
    expect(safeHttpUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(safeHttpUrl("vbscript:msgbox(1)")).toBeNull();
    expect(safeHttpUrl("mailto:a@b.co")).toBeNull();
  });

  // A browser strips leading whitespace and embedded tabs/newlines before
  // reading the scheme, so a prefix check alone would miss these.
  it("rejects schemes disguised with whitespace or control characters", () => {
    expect(safeHttpUrl(" javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("java\tscript:alert(1)")).toBeNull();
    expect(safeHttpUrl("java\nscript:alert(1)")).toBeNull();
  });

  it("rejects relative or malformed values rather than throwing", () => {
    expect(safeHttpUrl("")).toBeNull();
    expect(safeHttpUrl("/art/123")).toBeNull();
    expect(safeHttpUrl("not a url")).toBeNull();
    expect(safeHttpUrl(null)).toBeNull();
    expect(safeHttpUrl(undefined)).toBeNull();
    expect(safeHttpUrl(42)).toBeNull();
  });
});
