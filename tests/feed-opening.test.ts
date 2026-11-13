// The opening heroes and the first feed page are requested together.
import { describe, expect, it } from "vitest";
import { loadOpening } from "../src/feed/opening";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe("loadOpening", () => {
  it("starts the page request before the heroes have resolved", () => {
    const heroes = deferred<string[]>();
    const page = deferred<string[]>();
    const started: string[] = [];
    loadOpening(
      () => {
        started.push("heroes");
        return heroes.promise;
      },
      () => {
        started.push("page");
        return page.promise;
      },
    );
    expect(started).toEqual(["heroes", "page"]);
  });

  it("resolves heroes ahead of the page whichever arrives first", async () => {
    const heroes = deferred<string[]>();
    const page = deferred<string[]>();
    const result = loadOpening(
      () => heroes.promise,
      () => page.promise,
    );
    page.resolve(["p1"]);
    heroes.resolve(["h1"]);
    expect(await result).toEqual({ heroes: ["h1"], page: ["p1"] });
  });

  it("skips the hero lookup when there are no heroes to fetch", async () => {
    const result = await loadOpening(null, () => Promise.resolve(["p1"]));
    expect(result).toEqual({ heroes: [], page: ["p1"] });
  });
});
