import { expect, test } from "@playwright/test";
import { gotoArtwork, gotoFeed, ITEMS } from "./harness.mts";

test("the artwork you land on loads at high priority and its neighbours at low", async ({
  page,
}) => {
  const target = ITEMS[0];
  await gotoArtwork(page, target.source, target.id);
  await page.waitForFunction(
    () => document.querySelectorAll("#feed .slide img[src]").length > 1,
  );
  const images = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll<HTMLImageElement>("#feed .slide img[src]"),
    ).map((img) => {
      const rect = img.closest(".slide")!.getBoundingClientRect();
      return {
        onScreen: rect.top < window.innerHeight && rect.bottom > 0,
        priority: img.fetchPriority,
      };
    }),
  );
  const onScreen = images.filter((i) => i.onScreen);
  const offScreen = images.filter((i) => !i.onScreen);
  expect(onScreen.length).toBeGreaterThan(0);
  expect(offScreen.length).toBeGreaterThan(0);
  expect(onScreen.map((i) => i.priority)).toEqual(onScreen.map(() => "high"));
  expect(offScreen.map((i) => i.priority)).toEqual(offScreen.map(() => "low"));
});

test("the intro logo, the first thing on the home feed, is fetched at high priority", async ({
  page,
}) => {
  await gotoFeed(page);
  const priority = await page.evaluate(
    () =>
      document
        .querySelector("#feed .slide.intro img.intro-lockup")
        ?.getAttribute("fetchpriority") ?? null,
  );
  expect(priority).toBe("high");
});
