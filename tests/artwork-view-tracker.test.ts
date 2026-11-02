import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ARTWORK_VIEW_DWELL_MS,
  ArtworkViewTracker,
} from "../src/app/ArtworkViewTracker";

type Rec = { item?: { id: string; source: string } | null };

function makeTracker(opts: { slideIndex: number; records: Rec[] }) {
  const state = { slideIndex: opts.slideIndex, records: opts.records };
  const trackEvent = vi.fn();
  const tracker = new ArtworkViewTracker({
    activeSlideIndex: () => state.slideIndex,
    getSlideRecords: () => state.records,
    trackEvent,
    pageLoadId: "abc12345",
  });
  return { tracker, trackEvent, state };
}

const art = (id: string, source = "met"): Rec => ({ item: { id, source } });

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("dwell", () => {
  it("fires nothing before the dwell time has passed", () => {
    const { tracker, trackEvent } = makeTracker({
      slideIndex: 0,
      records: [art("1")],
    });
    tracker.check();
    vi.advanceTimersByTime(ARTWORK_VIEW_DWELL_MS - 1);
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it("fires one artwork_view once the dwell time has passed", () => {
    const { tracker, trackEvent } = makeTracker({
      slideIndex: 0,
      records: [art("1", "aic")],
    });
    tracker.check();
    vi.advanceTimersByTime(ARTWORK_VIEW_DWELL_MS);
    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith("artwork_view", {
      source: "aic",
      item_id: "1",
      page_load_id: "abc12345",
    });
  });

  it("does not count a slide scrolled past before the dwell time", () => {
    const { tracker, trackEvent, state } = makeTracker({
      slideIndex: 0,
      records: [art("1"), art("2")],
    });
    tracker.check();
    vi.advanceTimersByTime(ARTWORK_VIEW_DWELL_MS - 500);
    state.slideIndex = 1;
    tracker.check();
    vi.advanceTimersByTime(ARTWORK_VIEW_DWELL_MS - 500);
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it("counts the slide the visitor settles on, not the one passed", () => {
    const { tracker, trackEvent, state } = makeTracker({
      slideIndex: 0,
      records: [art("1"), art("2")],
    });
    tracker.check();
    state.slideIndex = 1;
    tracker.check();
    vi.advanceTimersByTime(ARTWORK_VIEW_DWELL_MS);
    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent.mock.calls[0][1]).toMatchObject({ item_id: "2" });
  });

  it("keeps the original timer when check() runs again on the same slide", () => {
    const { tracker, trackEvent } = makeTracker({
      slideIndex: 0,
      records: [art("1")],
    });
    tracker.check();
    vi.advanceTimersByTime(ARTWORK_VIEW_DWELL_MS - 500);
    tracker.check();
    vi.advanceTimersByTime(500);
    expect(trackEvent).toHaveBeenCalledTimes(1);
  });
});

describe("once per item per page load", () => {
  it("does not recount an item when the visitor scrolls back to it", () => {
    const { tracker, trackEvent, state } = makeTracker({
      slideIndex: 0,
      records: [art("1"), art("2")],
    });
    tracker.check();
    vi.advanceTimersByTime(ARTWORK_VIEW_DWELL_MS);
    state.slideIndex = 1;
    tracker.check();
    vi.advanceTimersByTime(ARTWORK_VIEW_DWELL_MS);
    state.slideIndex = 0;
    tracker.check();
    vi.advanceTimersByTime(ARTWORK_VIEW_DWELL_MS);
    expect(trackEvent).toHaveBeenCalledTimes(2);
  });

  it("treats the same native id from two sources as different items", () => {
    const { tracker, trackEvent, state } = makeTracker({
      slideIndex: 0,
      records: [art("7", "met"), art("7", "aic")],
    });
    tracker.check();
    vi.advanceTimersByTime(ARTWORK_VIEW_DWELL_MS);
    state.slideIndex = 1;
    tracker.check();
    vi.advanceTimersByTime(ARTWORK_VIEW_DWELL_MS);
    expect(trackEvent).toHaveBeenCalledTimes(2);
  });
});

describe("non-item slides", () => {
  it("never fires while the active slide carries no item", () => {
    const { tracker, trackEvent } = makeTracker({
      slideIndex: 0,
      records: [{}, art("1")],
    });
    tracker.check();
    vi.advanceTimersByTime(ARTWORK_VIEW_DWELL_MS * 2);
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it("counts the item at the active record regardless of a leading intro slide", () => {
    const { tracker, trackEvent } = makeTracker({
      slideIndex: 1,
      records: [{}, art("9")],
    });
    tracker.check();
    vi.advanceTimersByTime(ARTWORK_VIEW_DWELL_MS);
    expect(trackEvent.mock.calls[0][1]).toMatchObject({ item_id: "9" });
  });

  it("ignores an out-of-range active index", () => {
    const { tracker, trackEvent } = makeTracker({
      slideIndex: -1,
      records: [art("1")],
    });
    tracker.check();
    vi.advanceTimersByTime(ARTWORK_VIEW_DWELL_MS * 2);
    expect(trackEvent).not.toHaveBeenCalled();
  });
});

describe("tab visibility", () => {
  it("does not count time spent in a hidden tab", () => {
    const { tracker, trackEvent } = makeTracker({
      slideIndex: 0,
      records: [art("1")],
    });
    tracker.check();
    vi.advanceTimersByTime(ARTWORK_VIEW_DWELL_MS - 500);
    tracker.setPageVisible(false);
    vi.advanceTimersByTime(ARTWORK_VIEW_DWELL_MS * 5);
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it("restarts the dwell when the tab becomes visible again", () => {
    const { tracker, trackEvent } = makeTracker({
      slideIndex: 0,
      records: [art("1")],
    });
    tracker.check();
    tracker.setPageVisible(false);
    tracker.setPageVisible(true);
    vi.advanceTimersByTime(ARTWORK_VIEW_DWELL_MS - 1);
    expect(trackEvent).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(trackEvent).toHaveBeenCalledTimes(1);
  });

  it("does not start a dwell from check() while the tab is hidden", () => {
    const { tracker, trackEvent } = makeTracker({
      slideIndex: 0,
      records: [art("1")],
    });
    tracker.setPageVisible(false);
    tracker.check();
    vi.advanceTimersByTime(ARTWORK_VIEW_DWELL_MS * 2);
    expect(trackEvent).not.toHaveBeenCalled();
  });
});
