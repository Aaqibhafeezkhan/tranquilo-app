// The shipped /api/items budget: enforced, yet roomy enough that a person
// scrolling the feed never meets it.
import { describe, expect, it } from "vitest";
import { TRANQUILO_CONFIG } from "../lib/config.generated.ts";

const limits = TRANQUILO_CONFIG.items_visitor_rate_limit;
const pageSize = TRANQUILO_CONFIG.feed.page_size;

describe("shipped items rate limit", () => {
  it("is enforced", () => {
    expect(limits.enforce).toBe(true);
  });

  it("allows at least twenty feed pages in one burst", () => {
    expect(limits.capacity).toBeGreaterThanOrEqual(pageSize * 20);
  });
});
