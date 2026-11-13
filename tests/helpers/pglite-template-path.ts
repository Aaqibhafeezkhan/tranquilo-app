import { join } from "node:path";

export const PGLITE_TEMPLATE_PATH = join(
  import.meta.dirname,
  "..",
  "..",
  "node_modules",
  ".cache",
  "pglite-template.tar",
);
