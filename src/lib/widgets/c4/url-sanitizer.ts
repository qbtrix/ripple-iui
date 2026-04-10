// url-sanitizer.ts — Sanitize externally-supplied URLs to prevent XSS via javascript:/data:/file: schemes.
// Created: 2026-04-10 — Added to fix XSS vector in kb_article href rendering (PR #14 blocker).

/**
 * Return a safe URL string for use in href attributes, or null if the URL
 * uses a disallowed scheme. Only relative paths, http:, and https: are permitted.
 *
 * Pocket specs are externally supplied, so any raw URL could contain
 * `javascript:alert(1)` or other dangerous schemes.
 */
export function safeKbUrl(raw: string | undefined): string | null {
  if (!raw) return null;

  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;

  // Allow relative paths
  if (trimmed.startsWith('/')) return trimmed;

  // Allow http and https only
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;

  // Everything else (javascript:, data:, file:, vbscript:, etc.) is blocked
  return null;
}
