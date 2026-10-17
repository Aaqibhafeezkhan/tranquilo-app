// The repo is public: internal tracker ids must not appear in any tracked
// file. Commit messages, PR titles and branch names are checked separately
// in CI (test.yml), with the same pattern from scripts/ticket-refs.mts.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findTicketRefs, TICKET_REF } from "../scripts/ticket-refs.mts";

// Built at runtime so this file doesn't contain a literal id.
const id = (prefix: string, n: number) => `${prefix}-${n}`;

function trackedTextFiles(): string[] {
  return execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
    .split("\0")
    .filter((f) => f && existsSync(f));
}

describe("internal ticket ids", () => {
  it("the pattern catches every tracker prefix, in prose and in links", () => {
    for (const prefix of ["TRANQ", "TRA", "CUR"]) {
      expect(TICKET_REF.test(`fixes ${id(prefix, 42)}`)).toBe(true);
      expect(TICKET_REF.test(`(${id(prefix, 7)})`)).toBe(true);
      expect(TICKET_REF.test(`issue/${id(prefix, 301)}/slug`)).toBe(true);
    }
  });

  it("the pattern ignores look-alikes that aren't ids", () => {
    for (const text of [
      "EXTRA-1",
      "extra-12",
      "cur-3 css class",
      "TRANQUILO-2",
      "TRA-",
      "a TRA-band",
    ]) {
      expect(TICKET_REF.test(text), text).toBe(false);
    }
  });

  it("no tracked file contains one", () => {
    const offenders: string[] = [];
    for (const f of trackedTextFiles()) {
      const buf = readFileSync(f);
      if (buf.includes(0)) continue; // binary
      for (const line of findTicketRefs(buf.toString("utf8"))) {
        offenders.push(`${f}: ${line.trim().slice(0, 120)}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
