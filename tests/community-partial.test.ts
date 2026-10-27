// A failed fetch or empty donors list never breaks the page.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  COMMUNITY_MARKER,
  expandCommunityPartial,
  fetchContributors,
  parseContributors,
  parseSupporters,
} from "../vite-plugins/community-partial.mts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const human = {
  login: "octocat",
  type: "User",
  html_url: "https://github.com/octocat",
  avatar_url: "https://avatars.githubusercontent.com/u/583231?v=4",
};
const bot = {
  login: "dependabot[bot]",
  type: "Bot",
  html_url: "https://github.com/apps/dependabot",
  avatar_url: "https://avatars.githubusercontent.com/in/29110?v=4",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const page = `<html lang="en"><body><main>${COMMUNITY_MARKER}</main></body></html>`;
const ptPage = `<html lang="pt-BR" data-locale="pt-BR"><body>${COMMUNITY_MARKER}</body></html>`;

describe("parseContributors", () => {
  it("keeps people and drops bots", () => {
    const list = parseContributors([human, bot]);
    expect(list.map((c) => c.login)).toEqual(["octocat"]);
  });

  it("drops entries whose links are not GitHub https URLs", () => {
    const list = parseContributors([
      { ...human, html_url: "javascript:alert(1)" },
      { ...human, login: "x", avatar_url: "http://evil.example/a.png" },
    ]);
    expect(list).toEqual([]);
  });

  it("treats a non-array payload as no contributors", () => {
    expect(parseContributors({ message: "API rate limit exceeded" })).toEqual(
      [],
    );
    expect(parseContributors(null)).toEqual([]);
  });
});

describe("fetchContributors", () => {
  it("returns the parsed list on success", async () => {
    const list = await fetchContributors(async () =>
      jsonResponse([human, bot]),
    );
    expect(list?.map((c) => c.login)).toEqual(["octocat"]);
  });

  it("returns null on a rate limit, a network error, or a bad payload", async () => {
    expect(
      await fetchContributors(async () =>
        jsonResponse({ message: "rate limit" }, 403),
      ),
    ).toBeNull();
    expect(
      await fetchContributors(async () => {
        throw new TypeError("fetch failed");
      }),
    ).toBeNull();
    expect(
      await fetchContributors(
        async () => new Response("<html>", { status: 200 }),
      ),
    ).toBeNull();
  });

  it("sends a token only when one is given", async () => {
    const seen: Array<string | null> = [];
    const capture = async (
      _url: string | URL | Request,
      init?: RequestInit,
    ) => {
      seen.push(new Headers(init?.headers).get("authorization"));
      return jsonResponse([]);
    };
    await fetchContributors(capture);
    await fetchContributors(capture, "abc");
    expect(seen).toEqual([null, "Bearer abc"]);
  });
});

describe("parseSupporters", () => {
  it("keeps named donors and drops unsafe links", () => {
    const { donors } = parseSupporters({
      donors: [
        { name: "Ada", date: "2026-10", url: "https://example.org/ada" },
        { name: "Bea", url: "javascript:alert(1)" },
        { url: "https://example.org/nameless" },
      ],
      patrons: [],
    });
    expect(donors).toEqual([
      { name: "Ada", url: "https://example.org/ada" },
      { name: "Bea", url: null },
    ]);
  });

  it("treats a malformed file as no donors", () => {
    expect(parseSupporters(null).donors).toEqual([]);
    expect(parseSupporters({ donors: "Ada" }).donors).toEqual([]);
  });

  it("accepts the committed data/supporters.json", () => {
    const raw = JSON.parse(
      readFileSync(path.join(ROOT, "data/supporters.json"), "utf8"),
    );
    expect(Array.isArray(raw.donors)).toBe(true);
    expect(parseSupporters(raw).donors).toHaveLength(raw.donors.length);
  });
});

describe("expandCommunityPartial", () => {
  const ada = { name: "Ada", url: "https://example.org/ada" };

  it("renders each contributor as an avatar linked to their profile", () => {
    const html = expandCommunityPartial(page, {
      contributors: parseContributors([human]),
      donors: [],
    });
    expect(html).not.toContain(COMMUNITY_MARKER);
    expect(html).toContain('href="https://github.com/octocat"');
    expect(html).toContain('alt="@octocat on GitHub"');
    expect(html).toContain("@octocat");
    expect(html).toMatch(/<img[^>]+loading="lazy"/);
    expect(html).toMatch(/<img[^>]+width="\d+"[^>]+height="\d+"/);
  });

  it("renders donors, linking only those with a url", () => {
    const html = expandCommunityPartial(page, {
      contributors: null,
      donors: [ada, { name: "Bea", url: null }],
    });
    expect(html).toContain('<a href="https://example.org/ada"');
    expect(html).toContain(">Bea<");
    expect(html).not.toContain("community-contributors");
  });

  it("leaves out the contributors grid when the fetch failed or found nobody", () => {
    for (const contributors of [null, []]) {
      const html = expandCommunityPartial(page, {
        contributors,
        donors: [ada],
      });
      expect(html).not.toContain("community-contributors");
      expect(html).toContain("Ada");
    }
  });

  it("shows no donors heading or empty list while there are no donors", () => {
    const html = expandCommunityPartial(page, {
      contributors: parseContributors([human]),
      donors: [],
    });
    expect(html).toContain("community-contributors");
    expect(html).not.toContain("community-donors");
    expect(html).not.toMatch(/<ul[^>]*>\s*<\/ul>/);
  });

  it("removes the whole section when there is nothing to show", () => {
    const html = expandCommunityPartial(page, {
      contributors: null,
      donors: [],
    });
    expect(html).not.toContain(COMMUNITY_MARKER);
    expect(html).not.toContain("<section");
  });

  it("escapes names and handles", () => {
    const html = expandCommunityPartial(page, {
      contributors: null,
      donors: [{ name: '<img src=x onerror="alert(1)">', url: null }],
    });
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img");
  });

  it("uses the page's language for headings", () => {
    const data = { contributors: parseContributors([human]), donors: [ada] };
    const en = expandCommunityPartial(page, data);
    const pt = expandCommunityPartial(ptPage, data);
    const heading = (html: string) => /<h2[^>]*>([^<]+)<\/h2>/.exec(html)?.[1];
    expect(heading(en)).toBeTruthy();
    expect(heading(pt)).toBeTruthy();
    expect(heading(pt)).not.toBe(heading(en));
  });

  it("renders patrons grouped by tier, untitled group without a label", () => {
    const html = expandCommunityPartial(page, {
      contributors: null,
      donors: [],
      patrons: [
        { title: "Steward", names: ["Bia L."] },
        { title: null, names: ["Ana S."] },
      ],
    });
    expect(html).toContain("community-patrons");
    expect(html.indexOf("Steward")).toBeLessThan(html.indexOf("Bia L."));
    expect(html.indexOf("Bia L.")).toBeLessThan(html.indexOf("Ana S."));
    expect(html.match(/class="community-tier"/g)).toHaveLength(1);
  });

  it("shows no patrons heading while there are no patrons", () => {
    const html = expandCommunityPartial(page, {
      contributors: parseContributors([human]),
      donors: [],
      patrons: [{ title: "Friend", names: [] }],
    });
    expect(html).not.toContain("community-patrons");
    expect(html).not.toContain("Friend");
  });

  it("escapes patron names and tier titles", () => {
    const html = expandCommunityPartial(page, {
      contributors: null,
      donors: [],
      patrons: [{ title: "<b>Tier</b>", names: ["<script>x</script>"] }],
    });
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<b>");
  });

  it("leaves pages without the marker untouched", () => {
    const plain = "<html><body>hi</body></html>";
    expect(
      expandCommunityPartial(plain, { contributors: null, donors: [ada] }),
    ).toBe(plain);
  });
});

describe("the About pages", () => {
  it("carry the community marker in both languages", () => {
    for (const file of ["pages/about.html", "pages/pt-BR/about.html"]) {
      expect(readFileSync(path.join(ROOT, file), "utf8"), file).toContain(
        COMMUNITY_MARKER,
      );
    }
  });
});
