// Outbound-link guard for URLs that come from institution data or AI
// enrichment (items.url, twist_source_url, cast/tea-voice source_url).
// Escaping alone doesn't stop a `javascript:` href from running on click,
// so anything that isn't an absolute http(s) URL is dropped. Parsed with
// URL rather than a prefix check so tricks like " javascript:" or
// "java\tscript:" are judged the way a browser would judge them.
function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:" ? value : null;
  } catch (_e) {
    return null;
  }
}

export { safeHttpUrl };
