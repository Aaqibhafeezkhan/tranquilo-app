// Regression coverage for the artist profile card's lookup: the three
// "never render" cases (missing, ambiguous, stored miss) matter more here
// than any one artist's actual bio text, which can change on a re-fetch.
import { describe, expect, it } from "vitest";
import {
  findArtistProfileForQuery,
  getArtistProfile,
} from "../src/data/artist-profiles";

describe("getArtistProfile", () => {
  it("returns null for empty/placeholder names", () => {
    expect(getArtistProfile(null)).toBeNull();
    expect(getArtistProfile(undefined)).toBeNull();
    expect(getArtistProfile("")).toBeNull();
    expect(getArtistProfile("Unknown")).toBeNull();
    expect(getArtistProfile("Unknown artist")).toBeNull();
  });

  it("returns null for a name never looked up", () => {
    expect(getArtistProfile("Someone Not In The Store")).toBeNull();
  });

  it("returns null for a recorded miss, not just an absent key", () => {
    // Stored as {found: false} by a real fetch run -- must never render,
    // same as a name that was never asked at all.
    expect(getArtistProfile("Pierre Jean David d'Angers")).toBeNull();
  });

  it("returns null for an ambiguous record even though found is true", () => {
    // Two distinct Wikidata people share this name -- a wrong birth year
    // or bio is invisible once shown, so ambiguous records must never
    // render, same as the acceptance criteria in the card's own ticket.
    expect(getArtistProfile("Victor Petit")).toBeNull();
  });

  it("returns a normalized profile for a resolved artist", () => {
    const profile = getArtistProfile("Albrecht Dürer");
    expect(profile).not.toBeNull();
    expect(profile?.name).toBe("Albrecht Dürer");
    expect(typeof profile?.description).toBe("string");
    expect(Array.isArray(profile?.nationality)).toBe(true);
    expect(Array.isArray(profile?.movement)).toBe(true);
  });

  it("carries a photo URL when Wikidata holds one", () => {
    // Backfilled onto every already-resolved name; Dürer is a known hit.
    const profile = getArtistProfile("Albrecht Dürer");
    expect(profile?.image).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
  });
});

describe("findArtistProfileForQuery", () => {
  it("returns null for an empty query", () => {
    expect(findArtistProfileForQuery(null)).toBeNull();
    expect(findArtistProfileForQuery("")).toBeNull();
    expect(findArtistProfileForQuery("   ")).toBeNull();
  });

  it("matches a full name exactly, case/diacritic-insensitive", () => {
    expect(findArtistProfileForQuery("paul gauguin")?.name).toBe(
      "Paul Gauguin",
    );
    expect(findArtistProfileForQuery("durer")?.name).toBe("Albrecht Dürer");
  });

  it("matches a surname alone when it's unique among held profiles", () => {
    expect(findArtistProfileForQuery("gauguin")?.name).toBe("Paul Gauguin");
  });

  it("refuses to guess when a surname is shared by more than one held artist", () => {
    // Both Giovanni Battista Tiepolo and Giovanni Domenico Tiepolo are
    // resolved profiles -- picking either would be exactly the wrong-card-
    // is-worse-than-no-card mistake the ticket warns about.
    expect(findArtistProfileForQuery("tiepolo")).toBeNull();
  });

  it("returns null for a query that matches nothing held", () => {
    expect(findArtistProfileForQuery("some random search term")).toBeNull();
  });
});
