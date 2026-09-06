// url-sanitizer.ts — Sanitize externally-supplied URLs before they reach an
// href, to prevent XSS via javascript:/data:/file:/vbscript: schemes.
// Created: 2026-09-06 — hoisted from widgets/c4/url-sanitizer.ts so the table
//   link column (and any other widget rendering a spec-supplied URL) shares one
//   guard. Spec URLs are externally supplied — a /browser result table carries
//   URLs scraped from an untrusted page — so a raw href could be `javascript:`.

/**
 * Return a safe URL string for use in an href attribute, or null if the URL
 * uses a disallowed scheme. Only relative paths, http:, and https: are allowed.
 */
export function safeHref(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.startsWith('/')) return trimmed;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  // javascript:, data:, file:, vbscript:, etc. are blocked.
  return null;
}
