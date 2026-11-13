// Builds one initialised PGlite data directory per run, restored by tests/helpers/pg.ts.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { PGLITE_TEMPLATE_PATH } from "./helpers/pglite-template-path.ts";

export default async function setup() {
  const db = new PGlite();
  await db.waitReady;
  const dump = await db.dumpDataDir("none");
  await db.close();
  mkdirSync(dirname(PGLITE_TEMPLATE_PATH), { recursive: true });
  writeFileSync(PGLITE_TEMPLATE_PATH, Buffer.from(await dump.arrayBuffer()));
}
