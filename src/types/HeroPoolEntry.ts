// One entry of GET /api/items?shape=heroes; resolved to a full Item via ?ids=
// only when a hero is rendered.
export interface HeroPoolEntry {
  source: string;
  native_id: string;
  media_type: string | null;
}
