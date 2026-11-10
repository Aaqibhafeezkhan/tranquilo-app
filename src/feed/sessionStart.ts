// Snaps a random draw to one of `buckets` offsets.
export function sessionStart(draw: number, buckets: number): number {
  const bucket = Math.min(Math.floor(draw * buckets), buckets - 1);
  return bucket / buckets;
}
