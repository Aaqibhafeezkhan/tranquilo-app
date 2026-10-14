// The project no longer uses Linear. Nothing that ships (serverless
// functions, shared server code, the browser bundle) should call its API
// or expect its credentials -- a leftover call would either fail on every
// run once the key is gone, or keep writing to a tracker nobody reads.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SHIPPED = ["api", "lib", "src"];

// existsSync: a deleted-but-uncommitted file is still listed by git.
function shippedFiles(): string[] {
  return execFileSync("git", ["ls-files", "--", ...SHIPPED], {
    encoding: "utf8",
  })
    .split("\n")
    .filter((f) => /\.(ts|mts|js|yaml)$/.test(f) && existsSync(f));
}

describe("no Linear integration ships", () => {
  it("no shipped file calls the Linear API or reads its key", () => {
    const offenders = shippedFiles().filter((f) =>
      /api\.linear\.app|LINEAR_API_KEY/.test(readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
