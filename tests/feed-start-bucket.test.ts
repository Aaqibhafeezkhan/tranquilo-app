// Session start offsets are valid cursor values drawn from fixed buckets.
import { describe, expect, it } from "vitest";
import { sessionStart } from "../src/feed/sessionStart";

describe("sessionStart", () => {
  it("returns an offset inside [0, 1) for any random draw", () => {
    for (const draw of [0, 0.25, 0.5, 0.999999999, 1 - Number.EPSILON]) {
      const start = sessionStart(draw, 256);
      expect(start).toBeGreaterThanOrEqual(0);
      expect(start).toBeLessThan(1);
    }
  });

  it("lands on a bucket boundary", () => {
    for (let i = 0; i < 200; i++) {
      const start = sessionStart(Math.random(), 256);
      expect(Number.isInteger(start * 256)).toBe(true);
    }
  });

  it("reaches every bucket and produces exactly that many distinct starts", () => {
    const buckets = 64;
    const seen = new Set<number>();
    for (let i = 0; i < buckets; i++) {
      seen.add(sessionStart((i + 0.5) / buckets, buckets));
    }
    expect(seen.size).toBe(buckets);
  });

  it("formats as a short, stable query value", () => {
    expect(String(sessionStart(5.5 / 256, 256))).toBe("0.01953125");
  });
});
