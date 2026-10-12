#!/usr/bin/env node
// Prints the S3 prefix for a (source, native_id) pair -- the shard-bearing
// directory an item's objects (display/lightbox, across content-hash
// versions) all live under. Derivable from identity alone, no DB lookup
// needed; img_cache_entries.object_key stays the authoritative exact key
// per object (see lib/img-object-key.ts).
//
// Usage:
//   node scripts/s3_prefix_for.mts <source> <native_id>
//   aws s3 ls "s3://$S3_BUCKET/$(node scripts/s3_prefix_for.mts met 436535)"
import { prefixFor } from "../lib/img-object-key.ts";

const [source, id] = process.argv.slice(2);
if (!source || !id) {
  console.error("usage: s3_prefix_for.mts <source> <native_id>");
  process.exit(1);
}

console.log(prefixFor(source, id));
