// sanitize-html.test.ts — proves the {@html} sink sanitizer strips XSS vectors
// from spec-controlled HTML (the P1 finding) while keeping legitimate markup.
import { describe, it, expect } from 'vitest';
import { sanitizeHtml, sanitizeSvg } from './sanitize-html.js';

describe('sanitizeHtml', () => {
  it('strips the onerror image XSS vector but keeps the <img>', () => {
    const out = sanitizeHtml('<img src=x onerror="alert(document.domain)">');
    expect(out).not.toContain('onerror');
    expect(out).not.toContain('alert');
    expect(out.toLowerCase()).toContain('<img');
  });

  it('removes <script> tags', () => {
    const out = sanitizeHtml('<p>hi</p><script>steal(document.cookie)</script>');
    expect(out.toLowerCase()).not.toContain('<script');
    expect(out).not.toContain('steal(');
    expect(out).toContain('<p>hi</p>');
  });

  it('drops javascript: URIs on links', () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
    expect(out).not.toContain('javascript:');
    expect(out).toContain('click');
  });

  it('strips inline event handlers on any element', () => {
    const out = sanitizeHtml('<div onclick="pwn()">x</div>');
    expect(out).not.toContain('onclick');
    expect(out).not.toContain('pwn()');
  });

  it('keeps benign structural markdown/richtext markup intact', () => {
    const html =
      '<h1>Title</h1><p>Body with <strong>bold</strong> and <a href="https://ok.example">a link</a>.</p>' +
      '<ul><li>one</li></ul><table><tr><td>cell</td></tr></table><code>x</code>';
    const out = sanitizeHtml(html);
    for (const frag of ['<h1>', '<strong>', 'https://ok.example', '<li>one</li>', '<td>cell</td>', '<code>x</code>']) {
      expect(out).toContain(frag);
    }
  });

  it('blocks SVG-based vectors (HTML profile only)', () => {
    const out = sanitizeHtml('<svg><script>alert(1)</script></svg>');
    expect(out.toLowerCase()).not.toContain('<script');
    expect(out).not.toContain('alert(1)');
  });

  it('forbids style attributes (exfil / UI-redress channel)', () => {
    const beacon = sanitizeHtml('<div style="background:url(https://evil.example/x.png)">x</div>');
    expect(beacon).not.toContain('style');
    expect(beacon).not.toContain('evil.example');

    const overlay = sanitizeHtml('<div style="position:fixed;top:0;width:100vw;height:100vh">x</div>');
    expect(overlay).not.toContain('position:fixed');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeHtml('')).toBe('');
  });
});

describe('sanitizeSvg', () => {
  it('keeps a legitimate <svg> tree (the HTML profile would delete it)', () => {
    const out = sanitizeSvg('<svg viewBox="0 0 2 2"><rect width="2" height="2" style="fill:#000"/></svg>');
    expect(out.toLowerCase()).toContain('<svg');
    expect(out.toLowerCase()).toContain('<rect');
  });

  it('strips a script/onload injected into the SVG', () => {
    const out = sanitizeSvg('<svg onload="alert(1)"><script>steal()</script><rect/></svg>');
    expect(out).not.toContain('onload');
    expect(out.toLowerCase()).not.toContain('<script');
    expect(out).not.toContain('steal(');
  });

  it('drops an HTML <img onerror> smuggled through an attribute breakout', () => {
    // The qrcode-svg attack shape: attacker text terminates a style attribute
    // and appends a foreign HTML element. sanitizeSvg is defense in depth
    // behind Qr.svelte's safeColor validation.
    const out = sanitizeSvg('<svg><rect style="fill:red" /><img src=x onerror="alert(1)"><rect fill=""/></svg>');
    expect(out).not.toContain('onerror');
    expect(out).not.toContain('alert(1)');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeSvg('')).toBe('');
  });
});
