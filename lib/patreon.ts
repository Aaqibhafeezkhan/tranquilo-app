// Patreon members for the About page's patron list. Only a member's name,
// status and tier ids are kept; email and payment details are never read.
// Overrides (display_name, anonymous) are hand-edited and never written here.
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Sql } from "./db.ts";

export const MEMBER_EVENTS = [
  "members:create",
  "members:update",
  "members:delete",
  "members:pledge:create",
  "members:pledge:update",
  "members:pledge:delete",
];

export interface PatreonTier {
  id: string;
  title: string;
  amountCents: number;
}

export interface PatreonMember {
  memberId: string;
  fullName: string;
  patronStatus: string | null;
  tierIds: string[];
  tiers: PatreonTier[];
}

export interface PatronRow {
  full_name: string;
  patron_status: string | null;
  tier_ids: string[];
  display_name: string | null;
  anonymous: boolean;
}

export interface PatronGroup {
  title: string | null;
  names: string[];
}

export function verifyPatreonSignature(
  rawBody: string,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!signature || !/^[0-9a-f]{32}$/i.test(signature)) return false;
  const expected = createHmac("md5", secret).update(rawBody).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}

type Json = Record<string, unknown>;

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const obj = (v: unknown): Json =>
  v && typeof v === "object" ? (v as Json) : {};
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

export function parseTier(raw: unknown): PatreonTier | null {
  const resource = obj(raw);
  if (resource.type !== "tier" || typeof resource.id !== "string") return null;
  const attrs = obj(resource.attributes);
  const title = str(attrs.title).trim();
  if (!title) return null;
  const amount = Number(attrs.amount_cents);
  return {
    id: resource.id,
    title,
    amountCents: Number.isFinite(amount) ? amount : 0,
  };
}

export function parseMember(
  raw: unknown,
  included: unknown[] = [],
): PatreonMember | null {
  const resource = obj(raw);
  if (resource.type !== "member" || typeof resource.id !== "string")
    return null;
  const attrs = obj(resource.attributes);
  const tierRefs = obj(obj(resource.relationships).currently_entitled_tiers);
  const tierIds = list(tierRefs.data).flatMap((t) => {
    const id = obj(t).id;
    return typeof id === "string" ? [id] : [];
  });
  const tiers = included.flatMap((r) => {
    const tier = parseTier(r);
    return tier && tierIds.includes(tier.id) ? [tier] : [];
  });
  return {
    memberId: resource.id,
    fullName: str(attrs.full_name).trim(),
    patronStatus: str(attrs.patron_status) || null,
    tierIds,
    tiers,
  };
}

export function parseMemberPayload(payload: unknown): PatreonMember | null {
  const body = obj(payload);
  return parseMember(body.data, list(body.included));
}

const API = "https://www.patreon.com/api/oauth2/v2";

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export async function fetchCampaignMembers(
  token: string,
  campaignId: string,
  fetchImpl: FetchLike = fetch,
): Promise<{ members: PatreonMember[]; tiers: PatreonTier[] }> {
  const members: PatreonMember[] = [];
  const tiers = new Map<string, PatreonTier>();
  let cursor: string | undefined;
  do {
    const url = new URL(
      `${API}/campaigns/${encodeURIComponent(campaignId)}/members`,
    );
    url.searchParams.set("include", "currently_entitled_tiers");
    url.searchParams.set("fields[member]", "full_name,patron_status");
    url.searchParams.set("fields[tier]", "title,amount_cents");
    url.searchParams.set("page[count]", "500");
    if (cursor) url.searchParams.set("page[cursor]", cursor);
    const res = await fetchImpl(url.href, {
      headers: {
        authorization: `Bearer ${token}`,
        "user-agent": "tranquilo-patreon-sync",
      },
    });
    if (!res.ok)
      throw new Error(`Patreon members request failed: ${res.status}`);
    const body = obj(await res.json());
    for (const r of list(body.included)) {
      const tier = parseTier(r);
      if (tier) tiers.set(tier.id, tier);
    }
    for (const r of list(body.data)) {
      const member = parseMember(r);
      if (member) members.push(member);
    }
    const cursors = obj(obj(obj(body.meta).pagination).cursors);
    cursor = str(cursors.next) || undefined;
  } while (cursor);
  return { members, tiers: [...tiers.values()] };
}

export function defaultDisplayName(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return words[0] ?? "";
  const [initial] = Array.from(words[words.length - 1]);
  return `${words[0]} ${initial.toLocaleUpperCase()}.`;
}

export function groupPatrons(
  rows: PatronRow[],
  tiers: PatreonTier[],
): PatronGroup[] {
  const byId = new Map(tiers.map((t) => [t.id, t]));
  const groups = new Map<string | null, { amount: number; names: string[] }>();
  for (const row of rows) {
    if (row.patron_status !== "active_patron" || row.anonymous) continue;
    const name = row.display_name?.trim() || defaultDisplayName(row.full_name);
    if (!name) continue;
    const top = row.tier_ids
      .map((id) => byId.get(id))
      .filter((t): t is PatreonTier => Boolean(t))
      .sort((a, b) => b.amountCents - a.amountCents)[0];
    const key = top?.title ?? null;
    const group = groups.get(key) ?? {
      amount: top?.amountCents ?? -1,
      names: [],
    };
    group.names.push(name);
    groups.set(key, group);
  }
  return [...groups.entries()]
    .sort(([, a], [, b]) => b.amount - a.amount)
    .map(([title, { names }]) => ({ title, names }));
}

export async function saveTiers(sql: Sql, tiers: PatreonTier[]): Promise<void> {
  for (const t of tiers) {
    await sql`
      INSERT INTO patreon_tiers (id, title, amount_cents)
      VALUES (${t.id}, ${t.title}, ${t.amountCents})
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        amount_cents = EXCLUDED.amount_cents,
        updated_at = now()`;
  }
}

export async function savePatron(
  sql: Sql,
  member: PatreonMember,
): Promise<void> {
  await saveTiers(sql, member.tiers);
  await sql`
    INSERT INTO patrons (member_id, full_name, patron_status, tier_ids)
    VALUES (${member.memberId}, ${member.fullName}, ${member.patronStatus}, ${member.tierIds})
    ON CONFLICT (member_id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      patron_status = EXCLUDED.patron_status,
      tier_ids = EXCLUDED.tier_ids,
      updated_at = now()`;
}

export async function forgetPatron(sql: Sql, memberId: string): Promise<void> {
  await sql`
    UPDATE patrons
    SET full_name = '', patron_status = NULL, tier_ids = '{}', updated_at = now()
    WHERE member_id = ${memberId}`;
}

export async function loadPatronGroups(sql: Sql): Promise<PatronGroup[]> {
  const rows = (await sql`
    SELECT full_name, patron_status, tier_ids, display_name, anonymous
    FROM patrons
    WHERE patron_status = 'active_patron' AND NOT anonymous
    ORDER BY first_seen_at, member_id`) as PatronRow[];
  const tiers = (
    await sql`SELECT id, title, amount_cents FROM patreon_tiers`
  ).map((t) => ({
    id: String(t.id),
    title: String(t.title),
    amountCents: Number(t.amount_cents),
  }));
  return groupPatrons(rows, tiers);
}
