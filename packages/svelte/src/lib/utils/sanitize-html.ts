// utils/sanitize-html.ts — sanitize HTML/SVG strings before they reach {@html}.
//
// Ripple widgets (Markdown, RichTextDisplay) render SPEC-CONTROLLED strings via
// {@html}. Specs can be LLM-generated and prompt-injected (untrusted) — e.g. an
// agent that read a malicious page emits `{type:"markdown", content:"<img src=x
// onerror=…>"}`. Rendered raw, that is XSS in the host origin. This runs the HTML
// through DOMPurify's HTML profile: benign structural markup (headings, lists,
// links, images, tables, code) survives; <script>, on* handlers, and javascript:
// URIs are stripped. `style` is forbidden on top of the profile — spec content
// never needs inline CSS, and `style` is an exfil / UI-redress channel:
// url(https://evil/...) beacons on render, and position:fixed can overlay the
// host app with a fake credential prompt. Structural markup is unaffected.
//
// sanitizeSvg is the SVG-profile sibling for widgets that {@html} generated SVG
// (Qr): the HTML profile would delete the <svg> element outright.
//
// Client-guarded: DOMPurify needs a DOM. This FAILS OPEN under SSR — the input
// is returned unchanged. That is safe only because ripple's untrusted surface
// (chat) is client-rendered; Svelte 5 does NOT re-sanitize on hydration (it
// adopts server markup as-is and deliberately does not repair mismatches — see
// svelte internal/client/dom/blocks/html.js). If untrusted content ever renders
// through SSR, this guard must become a server-side sanitizer
// (isomorphic-dompurify / jsdom) instead.
import DOMPurify from 'dompurify';

export function sanitizeHtml(html: string): string {
  if (!html) return '';
  if (typeof window === 'undefined') return html; // SSR fail-open — see header
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_ATTR: ['style']
  });
}

/**
 * Sanitize a generated-SVG string (e.g. qrcode-svg output) for {@html}.
 * Defense in depth behind input validation — the generator's inputs must still
 * be constrained (see Qr.svelte's safeColor), because a sanitizer pass can't
 * fix a generator that interpolates attacker text into markup.
 */
export function sanitizeSvg(svg: string): string {
  if (!svg) return '';
  if (typeof window === 'undefined') return svg; // SSR fail-open — see header
  return DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } });
}
