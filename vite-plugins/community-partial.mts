// Fills <!-- COMMUNITY:SHARED --> with contributors and donors at build time.
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import { getSql } from "../lib/db.ts";
import { loadPatronGroups, type PatronGroup } from "../lib/patreon.ts";
import { safeHttpUrl } from "../lib/safe-url.ts";
import { escapeHtml, fallbackChain, interpolate, lookup } from "../src/i18n/core.ts";
import { DICTIONARIES } from "../src/i18n/dictionaries.ts";

export const COMMUNITY_MARKER = "<!-- COMMUNITY:SHARED -->";

const CONTRIBUTORS_URL =
  "https://api.github.com/repos/tranquilo-art/tranquilo-app/contributors?per_page=100";
const FETCH_TIMEOUT_MS = 8000;
const AVATAR_PX = 64;

export interface Contributor {
  login: string;
  profileUrl: string;
  avatarUrl: string;
}

export interface Donor {
  name: string;
  url: string | null;
}

export interface CommunityData {
  /** null when the fetch failed; the grid is then left out. */
  contributors: Contributor[] | null;
  donors: Donor[];
  patrons?: PatronGroup[];
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

function urlOnHost(value: unknown, host: string): string | null {
  const url = safeHttpUrl(value);
  if (!url) return null;
  const parsed = new URL(url);
  return parsed.protocol === "https:" && parsed.hostname === host ? url : null;
}

export function parseContributors(payload: unknown): Contributor[] {
  if (!Array.isArray(payload)) return [];
  return payload.flatMap((entry) => {
    if (!entry || entry.type !== "User" || typeof entry.login !== "string") return [];
    const profileUrl = urlOnHost(entry.html_url, "github.com");
    const avatarUrl = urlOnHost(entry.avatar_url, "avatars.githubusercontent.com");
    if (!profileUrl || !avatarUrl) return [];
    return [{ login: entry.login, profileUrl, avatarUrl }];
  });
}

export async function fetchContributors(
  fetchImpl: FetchLike = fetch,
  token?: string,
): Promise<Contributor[] | null> {
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "user-agent": "tranquilo-build",
  };
  if (token) headers.authorization = `Bearer ${token}`;
  try {
    const res = await fetchImpl(CONTRIBUTORS_URL, {
      headers,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const payload: unknown = await res.json();
    return Array.isArray(payload) ? parseContributors(payload) : null;
  } catch {
    return null;
  }
}

export function parseSupporters(raw: unknown): { donors: Donor[] } {
  const list = (raw as { donors?: unknown } | null)?.donors;
  if (!Array.isArray(list)) return { donors: [] };
  const donors = list.flatMap((entry) => {
    const name = typeof entry?.name === "string" ? entry.name.trim() : "";
    return name ? [{ name, url: safeHttpUrl(entry.url) }] : [];
  });
  return { donors };
}

export function loadSupporters(root: string): { donors: Donor[] } {
  try {
    return parseSupporters(JSON.parse(readFileSync(path.join(root, "data/supporters.json"), "utf8")));
  } catch {
    return { donors: [] };
  }
}

async function fetchPatrons(): Promise<PatronGroup[]> {
  const sql = getSql();
  if (!sql) return [];
  try {
    return await loadPatronGroups(sql);
  } catch (err) {
    console.warn("[community] patrons unavailable; building without them", err);
    return [];
  }
}

function translator(html: string) {
  const locale = /<html lang="([^"]+)"/.exec(html)?.[1] ?? "en";
  const chain = fallbackChain(locale, new Set(Object.keys(DICTIONARIES)));
  return (key: string, params: Record<string, string> = {}) =>
    escapeHtml(interpolate(lookup(key, chain, DICTIONARIES), params));
}

function renderContributors(contributors: Contributor[], t: ReturnType<typeof translator>): string {
  const items = contributors.map((c) => {
    const login = escapeHtml(c.login);
    const avatar = new URL(c.avatarUrl);
    avatar.searchParams.set("s", String(AVATAR_PX * 2));
    return `<li><a href="${escapeHtml(c.profileUrl)}" rel="noopener">
          <img src="${escapeHtml(avatar.href)}" alt="${t("community.avatarAlt", { handle: `@${c.login}` })}" width="${AVATAR_PX}" height="${AVATAR_PX}" loading="lazy" decoding="async">
          <span aria-hidden="true">@${login}</span>
        </a></li>`;
  });
  return `<h3 class="community-h3">${t("community.contributors")}</h3>
      <ul class="community-contributors">
        ${items.join("\n        ")}
      </ul>`;
}

function renderDonors(donors: Donor[], t: ReturnType<typeof translator>): string {
  const items = donors.map(({ name, url }) => {
    const text = escapeHtml(name);
    return url ? `<li><a href="${escapeHtml(url)}" rel="noopener">${text}</a></li>` : `<li>${text}</li>`;
  });
  return `<h3 class="community-h3">${t("community.donors")}</h3>
      <ul class="community-donors">
        ${items.join("\n        ")}
      </ul>`;
}

function renderPatrons(groups: PatronGroup[], t: ReturnType<typeof translator>): string {
  const lists = groups.map(({ title, names }) => {
    const label = title ? `<p class="community-tier">${escapeHtml(title)}</p>\n      ` : "";
    const items = names.map((name) => `<li>${escapeHtml(name)}</li>`);
    return `${label}<ul class="community-donors community-patrons">
        ${items.join("\n        ")}
      </ul>`;
  });
  return `<h3 class="community-h3">${t("community.patrons")}</h3>
      ${lists.join("\n      ")}`;
}

export function expandCommunityPartial(html: string, data: CommunityData): string {
  if (!html.includes(COMMUNITY_MARKER)) return html;
  const t = translator(html);
  const parts: string[] = [];
  if (data.contributors?.length) parts.push(renderContributors(data.contributors, t));
  const patrons = (data.patrons ?? []).filter((g) => g.names.length);
  if (patrons.length) parts.push(renderPatrons(patrons, t));
  if (data.donors.length) parts.push(renderDonors(data.donors, t));
  if (!parts.length) return html.replace(COMMUNITY_MARKER, "");

  const section = `<section class="mkt-section community" aria-labelledby="community-heading">
      <h2 class="mkt-h2" id="community-heading">${t("community.title")}</h2>
      <p class="about-body">${t("community.intro")}</p>
      ${parts.join("\n      ")}
    </section>`;
  return html.replace(COMMUNITY_MARKER, section);
}

export default function communityPartial(root: string): Plugin {
  let data: Promise<CommunityData> | undefined;
  const load = async (): Promise<CommunityData> => {
    const contributors = await fetchContributors(fetch, process.env.GITHUB_TOKEN);
    if (contributors === null) {
      console.warn("[community] GitHub contributors unavailable; building without the grid");
    }
    return { contributors, donors: loadSupporters(root).donors, patrons: await fetchPatrons() };
  };
  return {
    name: "tranquilo-community-partial",
    // Must run after base-template.mts, which sets <html lang>.
    async transformIndexHtml(html) {
      if (!html.includes(COMMUNITY_MARKER)) return html;
      data ??= load();
      return expandCommunityPartial(html, await data);
    },
  };
}
