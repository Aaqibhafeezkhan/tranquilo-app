// Backfilling the raw artist string must never record a value ingestion may
// have produced itself: an unknown original is NULL, not a guess.
import { describe, expect, it } from "vitest";
import { rawArtistFor } from "../lib/artist-raw.ts";

const CUTOFF = new Date("2026-08-24T16:10:48Z");
const canonicals = new Set(["Rembrandt van Rijn"]);
const before = new Date("2026-08-01T00:00:00Z");
const after = new Date("2026-09-15T00:00:00Z");

describe("rawArtistFor", () => {
  it("prefers the earliest audited value over the current one", () => {
    expect(
      rawArtistFor(
        { artist: "Rembrandt van Rijn", created_at: before },
        "Rijn, Rembrandt van",
        canonicals,
        CUTOFF,
      ),
    ).toBe("Rijn, Rembrandt van");
  });

  it("trusts any value on a row ingested before canonicalisation began", () => {
    expect(
      rawArtistFor(
        { artist: "Rembrandt van Rijn", created_at: before },
        undefined,
        canonicals,
        CUTOFF,
      ),
    ).toBe("Rembrandt van Rijn");
  });

  it("trusts a later value no map ever produced", () => {
    expect(
      rawArtistFor(
        { artist: "Rembrandt (Rembrandt van Rijn)", created_at: after },
        undefined,
        canonicals,
        CUTOFF,
      ),
    ).toBe("Rembrandt (Rembrandt van Rijn)");
  });

  it("leaves a later value that a map could have produced unknown", () => {
    expect(
      rawArtistFor(
        { artist: "Rembrandt van Rijn", created_at: after },
        undefined,
        canonicals,
        CUTOFF,
      ),
    ).toBeNull();
  });

  it("leaves a row with no artist unknown", () => {
    expect(
      rawArtistFor(
        { artist: null, created_at: before },
        undefined,
        canonicals,
        CUTOFF,
      ),
    ).toBeNull();
  });
});
