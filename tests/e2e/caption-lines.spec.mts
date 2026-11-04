// Feed captions overlay the artwork, so a long title or medium must never
// grow the caption past a couple of lines per field on a phone.
import { expect, test } from "@playwright/test";
import { gotoFeed, scrollToSlide } from "./harness.mts";

const SLIDES_TO_WALK = 24;
const FIELDS: [selector: string, maxLines: number][] = [
  [".art-title-btn", 2],
  [".art-meta .artist-text", 2],
  [".art-meta .date-text", 1],
  [".art-medium", 2],
  [".twist-hook span", 2],
];

for (const width of [360, 390]) {
  test(`caption text stays within its line limit at ${width}px wide`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await gotoFeed(page);

    let measured = 0;
    const offenders: string[] = [];
    for (let index = 0; index < SLIDES_TO_WALK; index++) {
      await scrollToSlide(page, index);
      const result = await page.evaluate(
        ({ index, fields }) => {
          const slide =
            document.querySelectorAll<HTMLElement>("#feed .slide")[index];
          const caption = slide?.querySelector(".caption");
          if (!caption) return null;
          const renderedLines = (el: Element): number => {
            const cs = getComputedStyle(el);
            const fontSize = parseFloat(cs.fontSize);
            const lineHeight =
              cs.lineHeight === "normal"
                ? fontSize * 1.2
                : parseFloat(cs.lineHeight);
            const chrome =
              parseFloat(cs.paddingTop) +
              parseFloat(cs.paddingBottom) +
              parseFloat(cs.borderTopWidth) +
              parseFloat(cs.borderBottomWidth);
            return Math.round(
              (el.getBoundingClientRect().height - chrome) / lineHeight,
            );
          };
          const over: string[] = [];
          for (const [field, maxLines] of fields) {
            const el = caption.querySelector(field);
            if (!el) continue;
            const lines = renderedLines(el);
            if (lines > maxLines)
              over.push(`${slide.dataset.slug} ${field}: ${lines} lines`);
          }
          return over;
        },
        { index, fields: FIELDS },
      );
      if (result === null) continue;
      measured++;
      offenders.push(...result);
    }

    expect(measured, "too few captions were measured").toBeGreaterThan(10);
    expect(offenders).toEqual([]);
  });
}
