// url-sanitizer.ts — kb_article href sanitizer.
// Created: 2026-04-10 — Added to fix XSS in kb_article href rendering (PR #14).
// 2026-09-06 — the implementation moved to src/lib/utils/url-sanitizer.ts so
//   the table link column shares it; safeKbUrl is kept as a thin re-export so
//   the C4 node call sites are unchanged.
export { safeHref as safeKbUrl } from '../../utils/url-sanitizer.js';
