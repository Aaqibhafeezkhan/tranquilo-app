// One representative color per palette_bucket value (the same 9
// classify_palette_buckets() names artscroll-poc's ingestion pipeline
// uses), for the Palette dropdown's custom swatch menu -- a bucket spans
// a real hue range, not one exact color, so this is a legible stand-in
// picked from roughly the middle of each bucket's own hue range, not a
// value read back from any one item's actual pixels.
export const PALETTE_BUCKET_SWATCH: Record<string, string> = {
  Red: "#d1453b",
  Orange: "#d9822b",
  "Gold/Yellow": "#d4b53f",
  Green: "#5a9e52",
  Teal: "#3aa69a",
  Blue: "#4a80c4",
  Purple: "#9163c4",
  Pink: "#d073a8",
  Neutral: "#9a958d",
};
