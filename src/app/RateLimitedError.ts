export class RateLimitedError extends Error {
  constructor(
    what: string,
    readonly retryAfterSeconds: number | null,
  ) {
    super(`api/items ${what} responded with 429`);
    this.name = "RateLimitedError";
  }
}

// Throws for any non-ok response: RateLimitedError for 429, a labeled Error otherwise.
export function assertOk(res: Response, what: string): void {
  if (res.ok) return;
  if (res.status === 429) {
    const seconds = Number.parseInt(res.headers.get("retry-after") ?? "", 10);
    throw new RateLimitedError(what, Number.isFinite(seconds) ? seconds : null);
  }
  throw new Error(`api/items ${what} responded with ${res.status}`);
}
