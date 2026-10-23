// What a visitor's browser receives for a Tea caption's grounding: only
// grounded claims with a safe link, and a book only when it has a safe link
// to where a reader can get it.
import { describe, expect, it } from "vitest";
import * as items from "../api/items.ts";

const BOOK = {
  title: "Te Ata o Tū",
  author: "Rebecca Rice",
  publisher: "Te Papa Press",
  year: 2024,
  pages: "282-285",
  acquisition_url: "https://www.tepapa.govt.nz/about/te-papa-press/te-ata-o-tu",
};
const PAGE = "https://collections.tepapa.govt.nz/object/38893";
const first = (claims: any[]) => (items.teaVoiceSources(claims) as any[])[0];

describe("teaVoiceSources", () => {
  it("sends a plain grounded claim as text and url only", () => {
    const src = first([
      { text: "a", status: "grounded", source_url: PAGE },
    ]);
    expect(src).toEqual({ text: "a", url: PAGE });
  });

  it("sends a claim's book with its citation fields and link", () => {
    const src = first([
      { text: "a", status: "grounded", source_url: PAGE, publication: BOOK },
    ]);
    expect(src.publication).toEqual({
      title: "Te Ata o Tū",
      author: "Rebecca Rice",
      publisher: "Te Papa Press",
      year: 2024,
      pages: "282-285",
      url: BOOK.acquisition_url,
    });
  });

  it("drops a book whose link is not http(s), keeping the claim", () => {
    const src = first([
      {
        text: "a",
        status: "grounded",
        source_url: PAGE,
        publication: { ...BOOK, acquisition_url: "javascript:alert(1)" },
      },
    ]);
    expect(src).toEqual({ text: "a", url: PAGE });
  });

  it("never sends an ungrounded claim", () => {
    expect(
      items.teaVoiceSources([{ text: "a", status: "ungrounded", source_url: PAGE }]),
    ).toBeNull();
  });
});
