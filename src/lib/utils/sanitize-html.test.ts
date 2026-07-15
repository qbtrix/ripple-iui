// sanitize-html.test.ts — proves the {@html} sink sanitizer strips XSS vectors
// from spec-controlled HTML (the P1 finding) while keeping legitimate markup.
import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from './sanitize-html.js';

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

  it('returns empty string for empty input', () => {
    expect(sanitizeHtml('')).toBe('');
  });
});
