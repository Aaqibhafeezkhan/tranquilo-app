// Internal tracker ids (prefix + number) must never ship to this public
// repo -- not in files, commit messages, PR titles, or branch names. Link
// work to its ticket from the PR description or the tracker instead.
//
// One definition, used by tests/no-ticket-refs.test.ts (tracked files)
// and by CI's pull_request check (commit messages, PR title, branch).
// The pattern is assembled from parts so this file never matches itself.
//
// CLI: reads text on stdin, prints each offending line, exits 1 on any
// match. `--label <name>` prefixes the output so CI logs say what failed.
//   git log --format=%B base..head | bun scripts/ticket-refs.mts --label commits

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const PREFIXES = ["TRANQ", "TRA", "CUR"];

// Case-sensitive on purpose: tracker ids are upper-case, and lower-case
// words like "extra-1" or a "cur-" CSS prefix are not ids.
export const TICKET_REF = new RegExp(`\\b(?:${PREFIXES.join("|")})-[0-9]+\\b`);

export function findTicketRefs(text: string): string[] {
  return text.split("\n").filter((line) => TICKET_REF.test(line));
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  const label = process.argv.includes("--label")
    ? process.argv[process.argv.indexOf("--label") + 1]
    : "input";
  const hits = findTicketRefs(readFileSync(0, "utf8"));
  for (const line of hits) console.error(`${label}: ${line.trim()}`);
  if (hits.length) {
    console.error(
      `::error::${label} contains an internal ticket id. Reference the ticket in the PR description or the tracker instead.`,
    );
    process.exit(1);
  }
}
