// Regression coverage for the artist profile card's lookup: the three
// "never render" cases (missing, ambiguous, stored miss) matter more here
// than any one artist's actual bio text, which can change on a re-fetch.
import { describe, expect, it } from "vitest";
import { getArtistProfile } from "../src/data/artist-profiles";

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
});
