import { createHmac, timingSafeEqual } from "node:crypto";

// Signs a paging cursor so a caller cannot edit one or build one by hand.
// With no secret configured the payload passes through unsigned, so a
// deploy that precedes the env var keeps working.
export function signCursor(
  payload: string,
  secret: string | undefined,
): string {
  if (!secret) return payload;
  return `${payload}.${mac(payload, secret)}`;
}

// The payload when the signature holds, otherwise null.
export function verifyCursor(
  token: string,
  secret: string | undefined,
): string | null {
  if (!secret) return token;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const payload = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(mac(payload, secret));
  return given.length === expected.length && timingSafeEqual(given, expected)
    ? payload
    : null;
}

function mac(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}
