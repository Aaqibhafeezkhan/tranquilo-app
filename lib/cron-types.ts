// The slice of a Vercel request/response that cron jobs and their
// dispatcher (api/cron/index.ts) depend on.
export interface CronRequest {
  headers?: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
}

export interface CronResponse {
  statusCode: number;
  json(body: unknown): void;
}
