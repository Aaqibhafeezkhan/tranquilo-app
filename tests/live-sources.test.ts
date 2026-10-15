// Every per-source list in the app must cover every live source. See
// tests/helpers/live-sources.ts for why this exists; when a new source
// goes live, add it there and work through whatever fails here.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as proxy from "../api/img/[source]/[id]/[tier].ts";
import { SOURCES as HEALTH_CHECK_SOURCES } from "../lib/cron/health-check.ts";
import { INSTITUTION_HOSTS } from "../lib/tea-voice-check.ts";
import { COLLECTION_SOURCES } from "../src/app/CollectionStore.ts";
import { EXPORT_SOURCE_NAMES } from "../src/app/ExportService.ts";
import { sourceLinkLabel } from "../src/app/sourceLinks.ts";
import { LIVE_SOURCE_IDS, LIVE_SOURCES } from "./helpers/live-sources.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const read = (p: string) => readFileSync(path.join(__dirname, "..", p), "utf8");

describe.each(LIVE_SOURCE_IDS)("live source %s", (src) => {
  const { image, page } = LIVE_SOURCES[src];

  it("is allowed through the image proxy", () => {
    expect(proxy.isAllowedOrigin(src, "display", image)).toBe(true);
  });

  it("is probed by the daily health check", () => {
    expect(HEALTH_CHECK_SOURCES).toContain(src);
  });

  it("is recognised as a saved-collection key prefix", () => {
    expect(COLLECTION_SOURCES).toContain(src);
  });

  it("has a source-link label, not the raw id", () => {
    expect(sourceLinkLabel({ source: src })).not.toBe(src);
  });

  it("has a CSV export name", () => {
    expect(EXPORT_SOURCE_NAMES[src]).toBeTruthy();
  });

  it("has a share-page institution name", () => {
    // Static read: the handler opens a database connection at import.
    expect(read("api/v/[slug].ts")).toMatch(
      new RegExp(`INSTITUTION_NAMES = \\{[^}]*\\b${src}:`, "s"),
    );
  });

  it("has its object pages recognised by the Tea Voice link check", () => {
    const host = new URL(page).hostname;
    expect(
      INSTITUTION_HOSTS.some((h) => host === h || host.endsWith(`.${h}`)),
    ).toBe(true);
  });

  it("is listed in every source enum in the API docs", () => {
    const enums = read("api/openapi.yaml").match(/enum: \[met,[^\]]*\]/g);
    expect(enums?.length).toBeGreaterThan(0);
    for (const e of enums ?? []) expect(e).toMatch(new RegExp(`\\b${src}\\b`));
  });
});
