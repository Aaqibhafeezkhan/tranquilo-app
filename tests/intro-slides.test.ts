// buildIntroSlide()/buildEmptyCollectionSlide() build the feed's two
// static, catalogue-independent slides. No DOM environment is configured
// for this suite, so `document.createElement` is stubbed with a minimal element.
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildEmptyCollectionSlide,
  buildIntroSlide,
} from "../src/feed/introSlides";

beforeEach(() => {
  vi.stubGlobal("document", {
    createElement: (tag: string) => {
      const el: any = { tagName: tag };
      Object.defineProperty(el, "className", {
        get() {
          return this._className;
        },
        set(v) {
          this._className = v;
        },
      });
      Object.defineProperty(el, "innerHTML", {
        get() {
          return this._innerHTML;
        },
        set(v) {
          this._innerHTML = v;
        },
      });
      return el;
    },
  });
});

describe("buildIntroSlide", () => {
  const src = (value: string) => ({ value, count: 10 });

  it("renders the museum and rounded work count from facets", () => {
    const el = buildIntroSlide({
      sources: [src("met"), src("cleveland")],
      total: 4321,
    });
    expect(el.className).toBe("slide intro");
    expect(el.innerHTML).toContain("2 museums and more");
    expect(el.innerHTML).toContain("4k+ public-domain works");
  });

  it("counts only museums, not aggregators", () => {
    const el = buildIntroSlide({
      sources: [src("met"), src("europeana"), src("commons"), src("tainacan")],
      total: 100,
    });
    expect(el.innerHTML).toContain("1 museum and more");
  });

  it("uses singular 'museum' for exactly one", () => {
    const el = buildIntroSlide({ sources: [src("met")], total: 100 });
    expect(el.innerHTML).toContain("1 museum and more");
    expect(el.innerHTML).not.toContain("1 museums");
  });

  it("defaults to zero when facets carries no sources or total", () => {
    const el = buildIntroSlide({});
    expect(el.innerHTML).toContain("0 museums and more");
  });
});

describe("buildEmptyCollectionSlide", () => {
  it("renders the empty-collection placeholder", () => {
    const el = buildEmptyCollectionSlide();
    expect(el.className).toBe("slide intro");
    expect(el.innerHTML).toContain("Nothing collected");
  });
});
