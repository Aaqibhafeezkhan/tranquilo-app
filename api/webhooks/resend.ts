// Resend delivery-failure webhook -- event-driven rather than cron-tied
// like health-check.ts, so a vanished signup doesn't wait for the next
// scheduled check.
//
// On email.bounced/delivery_delayed/complained, emails the ops inbox.
// Other event types are acknowledged and ignored. A failed alert email
// returns a 500, so Resend retries the webhook instead of the alert
// being lost.
//
// Signature verification (Svix under the hood) needs the RAW request
// body, so req.body (Vercel's auto-parsed helper, which re-serializes
// JSON and breaks the signature) can't be touched first -- the request
// stream is read manually instead.
//
// Required env vars: RESEND_WEBHOOK_SECRET, RESEND_API_KEY,
// SUBMIT_NOTIFY_EMAIL (or OPS_ALERT_EMAIL).

import type { VercelRequest, VercelResponse } from "@vercel/node";

import { Webhook } from "svix";
import { reportError } from "../../lib/sentry.ts";

const ALERT_WORTHY_TYPES = [
  "email.bounced",
  "email.delivery_delayed",
  "email.complained",
];

function readRawBody(req: VercelRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function describeEvent(event: any): string {
  const data = event.data || {};
  const to = Array.isArray(data.to) ? data.to.join(", ") : data.to;
  let detail = "";
  if (data.bounce?.message) {
    detail = ` -- ${data.bounce.type}/${data.bounce.subType}: ${data.bounce.message}`;
  }
  return `${event.type} for ${to} (subject: "${data.subject}")${detail}`;
}

async function sendAlertEmail(summary: {
  type: string;
  description: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const notifyEmail =
    process.env.OPS_ALERT_EMAIL || process.env.SUBMIT_NOTIFY_EMAIL;
  const fromEmail =
    process.env.RESEND_FROM_EMAIL || "Tranquilo <onboarding@resend.dev>";
  if (!apiKey || !notifyEmail) return;

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [notifyEmail],
      subject: `Tranquilo email delivery issue: ${summary.type}`,
      text: summary.description,
    }),
  });
  if (!resp.ok) throw new Error(`Resend responded ${resp.status}`);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.json({ error: "Method not allowed" });
    return;
  }

  if (!process.env.RESEND_WEBHOOK_SECRET) {
    console.error("resend webhook: missing RESEND_WEBHOOK_SECRET env var");
    res.statusCode = 500;
    res.json({ error: "Webhook isn't configured" });
    return;
  }

  let rawBody: any;
  try {
    rawBody = await readRawBody(req);
  } catch (_err) {
    res.statusCode = 400;
    res.json({ error: "Failed to read request body" });
    return;
  }

  let event: any, wh: any;
  try {
    wh = new Webhook(process.env.RESEND_WEBHOOK_SECRET);
    event = wh.verify(rawBody, req.headers as Record<string, string>);
  } catch (_err) {
    res.statusCode = 401;
    res.json({ error: "Signature verification failed" });
    return;
  }

  if (ALERT_WORTHY_TYPES.indexOf(event.type) === -1) {
    res.statusCode = 200;
    res.json({ ok: true, handled: false });
    return;
  }

  const summary = { type: event.type, description: describeEvent(event) };

  try {
    await sendAlertEmail(summary);
    res.statusCode = 200;
    res.json({ ok: true, handled: true });
  } catch (err) {
    console.error("resend webhook: failed to process alert-worthy event", err);
    await reportError(err);
    res.statusCode = 500;
    res.json({ error: "Failed to process event" });
  }
}
