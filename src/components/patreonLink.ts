import { escapeHtml } from "../i18n/core";

const PATREON_HOSTS = ["patreon.com", "www.patreon.com"];

export function patreonUrl(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && PATREON_HOSTS.includes(url.hostname)
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function patreonLinkHtml(
  url: string | null,
  text: { body: string; join: string; soon: string },
): string {
  const action = url
    ? `<a class="btn btn-primary support-patreon-btn" href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(text.join)}</a>`
    : `<p class="support-strip-soon">${escapeHtml(text.soon)}</p>`;
  return `<p class="support-patreon-body">${escapeHtml(text.body)}</p>
${action}`;
}
