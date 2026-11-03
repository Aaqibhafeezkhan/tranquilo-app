// Signed paging cursors: a caller cannot forge or edit a cursor to jump to a
// chosen position in the feed order.
import { afterEach, describe, expect, it } from "vitest";
import * as items from "../api/items.ts";
import { signCursor, verifyCursor } from "../lib/cursor-signature.ts";

const SECRET = "test-secret-one";

afterEach(() => {
  delete process.env.ITEMS_CURSOR_SECRET;
});

describe("signCursor / verifyCursor", () => {
  it("round-trips a payload", () => {
    const token = signCursor("abc_def", SECRET);
    expect(verifyCursor(token, SECRET)).toBe("abc_def");
  });

  it("rejects an edited payload", () => {
    const token = signCursor("abc_def", SECRET);
    const [, signature] = token.split(".");
    expect(verifyCursor(`xyz_def.${signature}`, SECRET)).toBeNull();
  });

  it("rejects a signature made with another secret", () => {
    expect(
      verifyCursor(signCursor("abc", "another-secret"), SECRET),
    ).toBeNull();
  });

  it("rejects an unsigned token when a secret is set", () => {
    expect(verifyCursor("abc_def", SECRET)).toBeNull();
  });

  it("passes the payload through unchanged when no secret is set", () => {
    expect(signCursor("abc_def", undefined)).toBe("abc_def");
    expect(verifyCursor("abc_def", undefined)).toBe("abc_def");
  });
});

describe("shuffle cursor", () => {
  it("round-trips when signing is on", () => {
    process.env.ITEMS_CURSOR_SECRET = SECRET;
    const cursor = items.encodeShuffleCursor(0.42, "abc", 0.25, false);
    expect(items.decodeShuffleCursor(cursor)).toEqual({
      shuffleKey: 0.42,
      nativeId: "abc",
      start: 0.25,
      wrapped: false,
    });
  });

  it("refuses a hand-built cursor when signing is on", () => {
    const forged = items.encodeShuffleCursor(0.9, "zzz", 0.1, false);
    process.env.ITEMS_CURSOR_SECRET = SECRET;
    expect(() => items.decodeShuffleCursor(forged)).toThrow(
      expect.objectContaining({ status: 400 }),
    );
  });

  it("refuses a cursor signed under a different secret", () => {
    process.env.ITEMS_CURSOR_SECRET = "old-secret";
    const cursor = items.encodeShuffleCursor(0.42, "abc", 0.25, false);
    process.env.ITEMS_CURSOR_SECRET = SECRET;
    expect(() => items.decodeShuffleCursor(cursor)).toThrow(
      expect.objectContaining({ status: 400 }),
    );
  });
});
