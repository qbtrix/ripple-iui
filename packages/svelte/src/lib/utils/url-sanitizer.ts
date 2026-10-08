// url-sanitizer.ts — `safeHref`, the null-returning form of `safeUrl` from
// @ripple-ui/core for sinks that branch on "is there a link" (the table link
// column, C4 kb links). It delegates to the one URL allowlist, so both reject
// javascript:/vbscript:/data:/file: the same way.
import { safeUrl } from '@ripple-ui/core';

/** A safe href for `raw`, or null when it is empty or uses a disallowed scheme. */
export function safeHref(raw: string | undefined | null): string | null {
  return safeUrl(raw) ?? null;
}
