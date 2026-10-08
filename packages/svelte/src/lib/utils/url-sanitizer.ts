// url-sanitizer.ts — `safeHref` for sinks that render NO link when the URL is
// unsafe (the table link column, C4 kb links), rather than safeUrl's '#'.
// It delegates to `safeUrl` from @ripple-ui/core, the one URL allowlist, so
// both reject javascript:/vbscript:/data:/file: the same way.
import { safeUrl } from '@ripple-ui/core';

/** A safe href for `raw`, or null when it is empty or uses a disallowed scheme. */
export function safeHref(raw: string | undefined | null): string | null {
  const url = safeUrl(raw);
  return url && url !== '#' ? url : null;
}
