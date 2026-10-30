// Rebuilds per-locale search text (sql/057_item_search_locale.sql) for every
// locale that has reviewed terms. A failure is reported and swallowed: it
// must not fail the job it runs inside.

import { reportError } from "./sentry.ts";

interface SqlClient {
  query(text: string, params?: unknown[]): Promise<unknown[]>;
}

export async function refreshLocaleSearch(
  client: SqlClient,
): Promise<Record<string, number>> {
  const refreshed: Record<string, number> = {};
  try {
    const locales = (await client.query(
      "SELECT DISTINCT locale FROM term_translations",
    )) as { locale: string }[];
    for (const { locale } of locales) {
      const [row] = (await client.query(
        "SELECT refresh_item_search_locale($1) AS n",
        [locale],
      )) as { n: number }[];
      refreshed[locale] = row.n;
    }
  } catch (err) {
    console.error("search-locale: refresh failed", err);
    await reportError(err);
  }
  return refreshed;
}
