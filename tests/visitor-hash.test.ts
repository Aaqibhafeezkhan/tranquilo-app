import { describe, expect, it } from "vitest";
import { visitorKey } from "../lib/visitor-hash.ts";

const DAY = new Date("2026-11-03T10:00:00Z");

describe("visitorKey", () => {
  it("is stable for one address within a day", () => {
    const later = new Date("2026-11-03T23:59:00Z");
    expect(visitorKey("203.0.113.7", "s", DAY)).toBe(
      visitorKey("203.0.113.7", "s", later),
    );
  });

  it("cannot be linked across days", () => {
    const next = new Date("2026-11-04T00:01:00Z");
    expect(visitorKey("203.0.113.7", "s", DAY)).not.toBe(
      visitorKey("203.0.113.7", "s", next),
    );
  });

  it("separates addresses and secrets", () => {
    const base = visitorKey("203.0.113.7", "s", DAY);
    expect(visitorKey("203.0.113.8", "s", DAY)).not.toBe(base);
    expect(visitorKey("203.0.113.7", "other", DAY)).not.toBe(base);
  });

  it("does not contain the address", () => {
    expect(visitorKey("203.0.113.7", "s", DAY)).toMatch(/^[0-9a-f]{16}$/);
  });

  it("returns null when there is nothing safe to hash with", () => {
    expect(visitorKey("203.0.113.7", undefined, DAY)).toBeNull();
    expect(visitorKey(null, "s", DAY)).toBeNull();
  });
});
