// utils/sanitize-html.ts — sanitize an HTML string before it reaches {@html}.
//
// Ripple widgets (Markdown, RichTextDisplay) render SPEC-CONTROLLED strings via
// {@html}. Specs can be LLM-generated and prompt-injected (untrusted) — e.g. an
// agent that read a malicious page emits `{type:"markdown", content:"<img src=x
// onerror=…>"}`. Rendered raw, that is XSS in the host origin. This runs the HTML
// through DOMPurify's HTML profile: benign structural markup (headings, lists,
// links, images, tables, code) survives; <script>, on* handlers, and javascript:
// URIs are stripped.
//
// Client-guarded: DOMPurify needs a DOM. Ripple's untrusted surface — the chat —
// is client-only (SSR disabled), so sanitization runs in the browser where the
// threat lives. During SSR (paw-sites, trusted site-owner authorship) it returns
// the input unchanged; {@html} re-derives on client hydration, where benign
// content is a no-op (no hydration mismatch).
import DOMPurify from 'dompurify';

export function sanitizeHtml(html: string): string {
  if (!html) return '';
  if (typeof window === 'undefined') return html; // SSR: no DOM to purify against
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}
