// The language a form or signup was sent in, as recorded server-side. Only a
// language in the locale registry is kept: the value lands in a mailing-list
// property and in emails, so free text from the request must never pass
// through. Anything else is dropped rather than rejected -- an unknown code is
// a client bug, and it shouldn't cost someone their signup or report.
import { describe, expect, it } from "vitest";
import { requestLocale } from "../lib/request-locale.ts";
import { LOCALES } from "../src/i18n/locales";

describe("requestLocale", () => {
  it("keeps every registered locale, draft ones included", () => {
    for (const { code } of LOCALES) expect(requestLocale(code)).toBe(code);
  });

  it("matches case-insensitively and returns the registry's spelling", () => {
    expect(requestLocale("PT-br")).toBe("pt-BR");
  });

  it("drops anything that isn't a registered locale", () => {
    for (const raw of [
      undefined,
      null,
      "",
      " ",
      "xx",
      "pt",
      "en-US<script>",
      42,
      {},
    ]) {
      expect(requestLocale(raw), JSON.stringify(raw)).toBe(null);
    }
  });
});
