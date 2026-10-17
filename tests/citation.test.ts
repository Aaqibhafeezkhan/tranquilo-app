// "Cite this work": MLA 9 and APA 7 citations for an artwork, built only
// from fields the item actually has. The guarantees that matter to a
// reader pasting this into a paper: the right institution is credited,
// missing fields are dropped rather than printed as blanks, and nothing
// is invented (no "Unknown" artist, no guessed date).
import { describe, expect, it } from "vitest";
import { formatCitation } from "../src/app/citation.ts";

const ACCESSED = new Date(2026, 9, 17); // 17 Oct 2026, local time

const full = {
  source: "met",
  title: "Wheat Field with Cypresses",
  artist: "Vincent van Gogh",
  date: "1889",
  medium: "Oil on canvas",
  url: "https://www.metmuseum.org/art/collection/search/436535",
};

describe("MLA", () => {
  it("cites artist, title, date, medium, institution, URL and access date", () => {
    expect(formatCitation(full, "mla", ACCESSED)).toBe(
      "Vincent van Gogh. Wheat Field with Cypresses. 1889, Oil on canvas. " +
        "The Metropolitan Museum of Art, www.metmuseum.org/art/collection/search/436535. " +
        "Accessed 17 Oct. 2026.",
    );
  });

  it("starts with the title when there is no real artist", () => {
    const c = formatCitation({ ...full, artist: "Unknown" }, "mla", ACCESSED);
    expect(c.startsWith("Wheat Field with Cypresses. 1889")).toBe(true);
    expect(c).not.toContain("Unknown");
  });

  it("uses MLA's month abbreviations, which aren't all three letters", () => {
    expect(formatCitation(full, "mla", new Date(2026, 5, 3))).toContain(
      "Accessed 3 June 2026.",
    );
    expect(formatCitation(full, "mla", new Date(2026, 8, 30))).toContain(
      "Accessed 30 Sept. 2026.",
    );
  });
});

describe("APA", () => {
  it("cites artist, (date), title [medium], institution and URL", () => {
    expect(formatCitation(full, "apa", ACCESSED)).toBe(
      "Vincent van Gogh. (1889). Wheat Field with Cypresses [Oil on canvas]. " +
        "The Metropolitan Museum of Art. " +
        "https://www.metmuseum.org/art/collection/search/436535",
    );
  });

  it("writes (n.d.) for a missing date and moves the title up for no artist", () => {
    expect(
      formatCitation({ ...full, artist: null, date: null }, "apa", ACCESSED),
    ).toBe(
      "Wheat Field with Cypresses [Oil on canvas]. (n.d.). " +
        "The Metropolitan Museum of Art. " +
        "https://www.metmuseum.org/art/collection/search/436535",
    );
  });
});

describe("both styles", () => {
  it("drop missing fields instead of leaving empty punctuation", () => {
    for (const style of ["mla", "apa"] as const) {
      const c = formatCitation(
        { source: "met", title: "Fan", url: full.url },
        style,
        ACCESSED,
      );
      expect(c, style).not.toMatch(/\.\s*\.|,\s*\.|\[\]|\(\)|null|undefined/);
    }
  });

  it("credit the museum that holds the work, not the umbrella source", () => {
    const item = {
      source: "smithsonian",
      title: "Bowl",
      url: "https://asia.si.edu/object/F1909.1/",
    };
    for (const style of ["mla", "apa"] as const) {
      expect(formatCitation(item, style, ACCESSED)).toContain(
        "National Museum of Asian Art",
      );
    }
  });

  it("don't double a full stop the title already ends with", () => {
    const c = formatCitation(
      { ...full, title: "Who Goes There?" },
      "mla",
      ACCESSED,
    );
    expect(c).toContain("Who Goes There? 1889");
  });
});
