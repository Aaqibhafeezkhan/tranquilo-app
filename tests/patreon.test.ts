// Patreon member sync: signature check, payload parsing, the default
// public name, and the SQL that must never overwrite a hand-set override.
import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  defaultDisplayName,
  fetchCampaignMembers,
  forgetPatron,
  groupPatrons,
  loadPatronGroups,
  parseMemberPayload,
  savePatron,
  saveTiers,
  verifyPatreonSignature,
} from "../lib/patreon.ts";
import { makeSql } from "./helpers/pg.ts";

const SECRET = "patreon-webhook-secret";
const sign = (body: string, secret = SECRET) =>
  createHmac("md5", secret).update(body).digest("hex");

function memberPayload(overrides: {
  id?: string;
  full_name?: string;
  patron_status?: string | null;
  tierIds?: string[];
  included?: unknown[];
}) {
  return {
    data: {
      type: "member",
      id: overrides.id ?? "m-1",
      attributes: {
        full_name: overrides.full_name ?? "Ana Souza",
        patron_status: overrides.patron_status ?? "active_patron",
        email: "ana@example.com",
      },
      relationships: {
        currently_entitled_tiers: {
          data: (overrides.tierIds ?? ["t-friend"]).map((id) => ({
            type: "tier",
            id,
          })),
        },
      },
    },
    included: overrides.included ?? [],
  };
}

describe("verifyPatreonSignature", () => {
  const body = JSON.stringify(memberPayload({}));

  it("accepts the HMAC-MD5 hex digest of the raw body", () => {
    expect(verifyPatreonSignature(body, sign(body), SECRET)).toBe(true);
  });

  it("rejects a wrong secret, a tampered body, or a missing header", () => {
    expect(verifyPatreonSignature(body, sign(body, "other"), SECRET)).toBe(
      false,
    );
    expect(verifyPatreonSignature(`${body} `, sign(body), SECRET)).toBe(false);
    expect(verifyPatreonSignature(body, undefined, SECRET)).toBe(false);
    expect(verifyPatreonSignature(body, "not-hex", SECRET)).toBe(false);
  });
});

describe("parseMemberPayload", () => {
  it("keeps the name, status and tier ids, and never the email", () => {
    const member = parseMemberPayload(memberPayload({}));
    expect(member).toEqual({
      memberId: "m-1",
      fullName: "Ana Souza",
      patronStatus: "active_patron",
      tierIds: ["t-friend"],
      tiers: [],
    });
    expect(JSON.stringify(member)).not.toContain("ana@example.com");
  });

  it("picks up tier titles when Patreon includes them", () => {
    const member = parseMemberPayload(
      memberPayload({
        included: [
          { type: "user", id: "u-1", attributes: {} },
          {
            type: "tier",
            id: "t-friend",
            attributes: { title: "Friend", amount_cents: 500 },
          },
        ],
      }),
    );
    expect(member?.tiers).toEqual([
      { id: "t-friend", title: "Friend", amountCents: 500 },
    ]);
  });

  it("rejects anything that isn't a member resource", () => {
    expect(parseMemberPayload(null)).toBeNull();
    expect(parseMemberPayload({ data: { type: "post", id: "p" } })).toBeNull();
    expect(parseMemberPayload({ data: { type: "member" } })).toBeNull();
  });
});

describe("defaultDisplayName", () => {
  it("shows a first name and last initial", () => {
    expect(defaultDisplayName("Ana Souza")).toBe("Ana S.");
    expect(defaultDisplayName("  maria da  Silva ")).toBe("maria S.");
    expect(defaultDisplayName("Élodie Ørsted")).toBe("Élodie Ø.");
  });

  it("shows a single name as given, and nothing for a blank one", () => {
    expect(defaultDisplayName("Cher")).toBe("Cher");
    expect(defaultDisplayName("   ")).toBe("");
  });
});

describe("groupPatrons", () => {
  const tiers = [
    { id: "t-friend", title: "Friend", amountCents: 500 },
    { id: "t-steward", title: "Steward", amountCents: 2500 },
  ];
  const row = (o: Partial<Parameters<typeof groupPatrons>[0][number]>) => ({
    full_name: "Ana Souza",
    patron_status: "active_patron",
    tier_ids: ["t-friend"],
    display_name: null,
    anonymous: false,
    ...o,
  });

  it("lists active patrons under their highest tier, highest tier first", () => {
    const groups = groupPatrons(
      [
        row({ full_name: "Ana Souza" }),
        row({ full_name: "Bia Lima", tier_ids: ["t-friend", "t-steward"] }),
      ],
      tiers,
    );
    expect(groups).toEqual([
      { title: "Steward", names: ["Bia L."] },
      { title: "Friend", names: ["Ana S."] },
    ]);
  });

  it("honours a display-name override and anonymity", () => {
    const groups = groupPatrons(
      [
        row({ full_name: "Ana Souza", display_name: "Ana from BH" }),
        row({ full_name: "Bia Lima", anonymous: true }),
        row({ full_name: "Caio Reis", display_name: "Caio", anonymous: true }),
      ],
      tiers,
    );
    expect(groups).toEqual([{ title: "Friend", names: ["Ana from BH"] }]);
  });

  it("leaves out former, declined and deleted members", () => {
    const groups = groupPatrons(
      [
        row({ patron_status: "former_patron" }),
        row({ patron_status: "declined_patron" }),
        row({ patron_status: null }),
        row({ full_name: "" }),
      ],
      tiers,
    );
    expect(groups).toEqual([]);
  });

  it("puts a patron with no known tier in an untitled group, last", () => {
    const groups = groupPatrons(
      [row({ tier_ids: ["t-unknown"] }), row({ full_name: "Bia Lima" })],
      tiers,
    );
    expect(groups).toEqual([
      { title: "Friend", names: ["Bia L."] },
      { title: null, names: ["Ana S."] },
    ]);
  });
});

describe("patron storage", () => {
  const ana = {
    memberId: "m-1",
    fullName: "Ana Souza",
    patronStatus: "active_patron",
    tierIds: ["t-friend"],
    tiers: [],
  };

  it("keeps a hand-set override through later webhook updates", async () => {
    const sql = await makeSql(["053_patrons.sql"]);
    await savePatron(sql, ana);
    await sql`UPDATE patrons SET display_name = 'A. S.', anonymous = true WHERE member_id = 'm-1'`;
    await savePatron(sql, { ...ana, fullName: "Ana Souza Lima" });
    const [stored] = await sql`SELECT * FROM patrons WHERE member_id = 'm-1'`;
    expect(stored.full_name).toBe("Ana Souza Lima");
    expect(stored.display_name).toBe("A. S.");
    expect(stored.anonymous).toBe(true);
  });

  it("forgets a deleted member's name but keeps their override", async () => {
    const sql = await makeSql(["053_patrons.sql"]);
    await savePatron(sql, ana);
    await sql`UPDATE patrons SET anonymous = true WHERE member_id = 'm-1'`;
    await forgetPatron(sql, "m-1");
    const [stored] = await sql`SELECT * FROM patrons WHERE member_id = 'm-1'`;
    expect(stored.full_name).toBe("");
    expect(stored.patron_status).toBeNull();
    expect(stored.tier_ids).toEqual([]);
    expect(stored.anonymous).toBe(true);
  });

  it("loads grouped names from what was stored", async () => {
    const sql = await makeSql(["053_patrons.sql"]);
    await saveTiers(sql, [
      { id: "t-friend", title: "Friend", amountCents: 500 },
    ]);
    await savePatron(sql, ana);
    await savePatron(sql, { ...ana, memberId: "m-2", fullName: "Bia Lima" });
    expect(await loadPatronGroups(sql)).toEqual([
      { title: "Friend", names: ["Ana S.", "Bia L."] },
    ]);
  });
});

describe("fetchCampaignMembers", () => {
  const page = (ids: string[], next?: string) =>
    new Response(
      JSON.stringify({
        data: ids.map((id) => ({
          type: "member",
          id,
          attributes: {
            full_name: `Name ${id}`,
            patron_status: "active_patron",
          },
          relationships: {
            currently_entitled_tiers: { data: [{ type: "tier", id: "t-1" }] },
          },
        })),
        included: [
          {
            type: "tier",
            id: "t-1",
            attributes: { title: "Friend", amount_cents: 500 },
          },
        ],
        meta: { pagination: next ? { cursors: { next } } : {} },
      }),
      { status: 200 },
    );

  it("follows cursors until the last page and collects tiers once", async () => {
    const urls: string[] = [];
    const result = await fetchCampaignMembers(
      "tok",
      "c-9",
      async (url, init) => {
        urls.push(url);
        expect(new Headers(init?.headers).get("authorization")).toBe(
          "Bearer tok",
        );
        return url.includes("cursor") ? page(["m-2"]) : page(["m-1"], "abc");
      },
    );
    expect(result.members.map((m) => m.memberId)).toEqual(["m-1", "m-2"]);
    expect(result.tiers).toEqual([
      { id: "t-1", title: "Friend", amountCents: 500 },
    ]);
    expect(urls[0]).toContain("/campaigns/c-9/members");
    expect(urls[0]).toContain("include=currently_entitled_tiers");
    expect(urls[1]).toContain("page%5Bcursor%5D=abc");
  });

  it("throws on an error response rather than returning a partial list", async () => {
    await expect(
      fetchCampaignMembers(
        "tok",
        "c-9",
        async () => new Response("no", { status: 401 }),
      ),
    ).rejects.toThrow(/401/);
  });
});
