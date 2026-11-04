// Patreon member webhook: mirrors each member's name, status and tiers into
// the patrons table, which the About page reads at build time.
//
// The signature is an HMAC-MD5 of the RAW body, so the request stream is
// read directly rather than through Vercel's re-serializing req.body.
//
// Required env vars: PATREON_WEBHOOK_SECRET, DATABASE_URL.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSql, type Sql } from "../../lib/db.ts";
import {
  forgetPatron,
  MEMBER_EVENTS,
  parseMemberPayload,
  savePatron,
  verifyPatreonSignature,
} from "../../lib/patreon.ts";
import { reportError } from "../../lib/sentry.ts";

function readRawBody(req: VercelRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function header(req: VercelRequest, name: string): string | undefined {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
  opts?: { sql?: Sql | null },
) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.json({ error: "Method not allowed" });
    return;
  }

  const secret = process.env.PATREON_WEBHOOK_SECRET;
  if (!secret) {
    console.error("patreon webhook: missing PATREON_WEBHOOK_SECRET env var");
    res.statusCode = 500;
    res.json({ error: "Webhook isn't configured" });
    return;
  }

  let rawBody: string;
  try {
    rawBody = await readRawBody(req);
  } catch (_err) {
    res.statusCode = 400;
    res.json({ error: "Failed to read request body" });
    return;
  }

  if (
    !verifyPatreonSignature(rawBody, header(req, "x-patreon-signature"), secret)
  ) {
    res.statusCode = 401;
    res.json({ error: "Signature verification failed" });
    return;
  }

  const event = header(req, "x-patreon-event") ?? "";
  if (!MEMBER_EVENTS.includes(event)) {
    res.statusCode = 200;
    res.json({ ok: true, handled: false });
    return;
  }

  let member: ReturnType<typeof parseMemberPayload>;
  try {
    member = parseMemberPayload(JSON.parse(rawBody));
  } catch (_err) {
    member = null;
  }
  if (!member) {
    res.statusCode = 400;
    res.json({ error: "Body is not a member resource" });
    return;
  }

  const sql = opts && "sql" in opts ? opts.sql : getSql();
  try {
    if (!sql) throw new Error("DATABASE_URL is not set");
    if (event === "members:delete") await forgetPatron(sql, member.memberId);
    else await savePatron(sql, member);
    res.statusCode = 200;
    res.json({ ok: true, handled: true });
  } catch (err) {
    console.error("patreon webhook: failed to store member", err);
    await reportError(err);
    res.statusCode = 500;
    res.json({ error: "Failed to store member" });
  }
}
