#!/usr/bin/env node
//   bun scripts/measure_master_dims.mts --source met            # dry run
//   bun scripts/measure_master_dims.mts --source met --commit
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { measureBatch } from "../lib/master-dims.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  runCli();
}

async function runCli() {
  const fs = await import("node:fs");
  const envLocalPath = path.join(ROOT, ".env.local");
  if (fs.existsSync(envLocalPath)) {
    for (const line of fs.readFileSync(envLocalPath, "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]])
        process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
    }
  }
  const { neon } = await import("@neondatabase/serverless");
  const identity = await import("../lib/source-identity.ts");

  const args = process.argv.slice(2);
  const sourceAt = args.indexOf("--source");
  const source = sourceAt === -1 ? null : args[sourceAt + 1];
  if (!source) {
    console.error(
      "usage: measure_master_dims.mts --source <met|cleveland> [--commit]",
    );
    process.exit(2);
  }
  const commit = args.includes("--commit");

  let stopping = false;
  process.on("SIGINT", () => {
    stopping = true;
    console.log("\ninterrupted -- finishing the current image");
  });

  try {
    const result = await measureBatch({
      sql: neon(process.env.DATABASE_URL!),
      source,
      commit,
      headers: identity.imageFetchHeaders(source),
      shouldStop: () => stopping,
      onProgress: (line) => console.log(line),
    });
    console.log(JSON.stringify(result));
    if (!commit)
      console.log("DRY RUN -- nothing fetched. Re-run with --commit.");
    if (result.stoppedBy) {
      console.error(`STOPPED: ${result.stoppedBy}`);
      process.exit(1);
    }
  } catch (e: any) {
    console.error("FATAL", e?.message || e);
    process.exit(1);
  }
}
