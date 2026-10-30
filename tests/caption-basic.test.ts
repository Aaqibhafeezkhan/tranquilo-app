// The templated fallback caption, rendered in a locale from the fields as
// they are served there. English is the pipeline's own template; only its
// two words ("Untitled", "by") are language-specific.
import { describe, expect, it } from "vitest";
import {
  buildCaptionBasic,
  localizeCaptionBasic,
} from "../lib/caption-basic.ts";
import type { TranslatedField } from "../lib/translations.ts";

type Item = Record<string, unknown> & {
  translated?: Record<string, TranslatedField>;
};

const source = {
  title: "Self-portrait",
  artist: "Rembrandt",
  date: "1630",
  medium: "Oil on canvas",
};

describe("buildCaptionBasic", () => {
  const en = { untitled: "Untitled", by: (a: string) => `by ${a}` };

  it("follows the ingestion template", () => {
    expect(buildCaptionBasic(source, en)).toBe(
      "Self-portrait by Rembrandt (1630) -- Oil on canvas",
    );
  });

  it("falls back to Untitled and omits an unknown artist and empty parts", () => {
    expect(
      buildCaptionBasic({ artist: "Unknown", date: "", medium: null }, en),
    ).toBe("Untitled");
    expect(buildCaptionBasic({ title: "Vase", date: "ca. 1650" }, en)).toBe(
      "Vase (ca. 1650)",
    );
  });
});

describe("localizeCaptionBasic", () => {
  const chain = ["pt-BR", "en"];
  const stored = "Self-portrait by Rembrandt (1630) -- Oil on canvas";

  function served(over: Item = {}): Item {
    return { ...source, caption_basic: stored, ...over };
  }

  it("renders the template words and translated fields in the locale", () => {
    const item = served({
      title: "Autorretrato",
      medium: "Óleo sobre tela",
      translated: {
        title: { origin: "human", locale: "pt-BR", original: "Self-portrait" },
        medium: { origin: "human", locale: "pt-BR", original: "Oil on canvas" },
      },
    });
    localizeCaptionBasic(item, chain);
    expect(item.caption_basic).toBe(
      "Autorretrato de Rembrandt (1630) -- Óleo sobre tela",
    );
    expect(item.translated?.caption_basic).toEqual({
      origin: "human",
      locale: "pt-BR",
      original: stored,
    });
  });

  it("still localizes the template words when no field was translated", () => {
    const item = served();
    localizeCaptionBasic(item, chain);
    expect(item.caption_basic).toBe(
      "Self-portrait de Rembrandt (1630) -- Oil on canvas",
    );
  });

  it("uses Sem título for an untitled work", () => {
    const item = served({
      title: null,
      caption_basic: "Untitled by Rembrandt (1630) -- Oil on canvas",
    });
    localizeCaptionBasic(item, chain);
    expect(item.caption_basic).toMatch(/^Sem título de Rembrandt/);
  });

  it("leaves English alone and records nothing", () => {
    const item = served();
    localizeCaptionBasic(item, ["en"]);
    expect(item.caption_basic).toBe(stored);
    expect(item.translated).toBeUndefined();
  });

  it("leaves a caption that is not what the template makes from the source", () => {
    const item = served({ caption_basic: "A hand-written caption." });
    localizeCaptionBasic(item, chain);
    expect(item.caption_basic).toBe("A hand-written caption.");
    expect(item.translated).toBeUndefined();
  });

  it("does not replace a caption already translated for this item", () => {
    const item = served({
      caption_basic: "Legenda do museu.",
      translated: {
        caption_basic: { origin: "human", locale: "pt-BR", original: stored },
      },
    });
    localizeCaptionBasic(item, chain);
    expect(item.caption_basic).toBe("Legenda do museu.");
  });

  it("does nothing for an item without a caption", () => {
    const item = served({ caption_basic: undefined });
    localizeCaptionBasic(item, chain);
    expect(item.caption_basic).toBeUndefined();
  });
});
