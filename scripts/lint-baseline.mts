// Biome warnings don't fail `bun run lint`, so without a gate the backlog
// only grows. lint-baseline.json records the warning count per top-level
// area; CI fails when any area goes up, and also when one goes down without
// the file being updated, so every cleanup locks in its new floor.
//
// Areas are compared separately: fixing warnings in lib/ must not buy room
// for new ones in api/.
//
// CLI:
//   bun scripts/lint-baseline.mts            check against the baseline
//   bun scripts/lint-baseline.mts --update   rewrite the baseline

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const AREAS = ["api", "lib", "src", "scripts", "tests"];
const BASELINE_PATH = "lint-baseline.json";

export type AreaCounts = Record<string, number>;

interface Diagnostic {
  severity: string;
  location: { path: string };
}

interface AreaChange {
  area: string;
  baseline: number;
  current: number;
}

export function countWarningsByArea(diagnostics: Diagnostic[]): AreaCounts {
  const counts: AreaCounts = {};
  for (const d of diagnostics) {
    if (d.severity !== "warning") continue;
    const top = d.location.path.split("/")[0];
    const area = AREAS.includes(top) ? top : "other";
    counts[area] = (counts[area] || 0) + 1;
  }
  return counts;
}

export function compareToBaseline(
  current: AreaCounts,
  baseline: AreaCounts,
): { increased: AreaChange[]; decreased: AreaChange[] } {
  const increased: AreaChange[] = [];
  const decreased: AreaChange[] = [];
  const areas = [
    ...new Set([...Object.keys(current), ...Object.keys(baseline)]),
  ].sort();
  for (const area of areas) {
    const change = {
      area,
      baseline: baseline[area] || 0,
      current: current[area] || 0,
    };
    if (change.current > change.baseline) increased.push(change);
    else if (change.current < change.baseline) decreased.push(change);
  }
  return { increased, decreased };
}

function runBiome(): Diagnostic[] {
  const result = spawnSync(
    "bunx",
    ["biome", "lint", "--reporter=json", "--max-diagnostics=none", "."],
    { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 },
  );
  try {
    return JSON.parse(result.stdout).diagnostics;
  } catch {
    console.error(result.stderr);
    throw new Error("biome did not produce a JSON report");
  }
}

function sortedCounts(counts: AreaCounts): AreaCounts {
  return Object.fromEntries(
    Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)),
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  const current = countWarningsByArea(runBiome());

  if (process.argv.includes("--update")) {
    writeFileSync(
      BASELINE_PATH,
      `${JSON.stringify(sortedCounts(current), null, 2)}\n`,
    );
    console.log(`Wrote ${BASELINE_PATH}:`, sortedCounts(current));
    process.exit(0);
  }

  const baseline: AreaCounts = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
  const { increased, decreased } = compareToBaseline(current, baseline);

  for (const c of increased) {
    console.error(
      `::error::${c.area}/ has ${c.current} Biome warnings, up from ${c.baseline}. Fix the new ones (bunx biome lint ${c.area}).`,
    );
  }
  for (const c of decreased) {
    console.error(
      `::error::${c.area}/ dropped from ${c.baseline} to ${c.current} Biome warnings. Run \`bun run lint:baseline\` and commit ${BASELINE_PATH} to lock it in.`,
    );
  }
  if (increased.length || decreased.length) process.exit(1);
  console.log("Biome warnings match the baseline:", sortedCounts(current));
}
