// @file widgets/media/Embed.test.ts
// @description Security-critical tests for the sandboxed `embed` widget.
//   Proves the iframe sandbox is renderer-controlled and immune to spec
//   input, that only https URLs survive, that srcdoc is attribute-encoded
//   and cannot break out, and that the `allow` enum drops everything
//   outside the closed list.
// @created 2026-05-22 — Increment 5 (escape-hatch widgets).
import { describe, it, expect } from 'vitest';
import type { ComponentProps } from 'svelte';
import { render } from '@testing-library/svelte';
import Embed, {
  EMBED_SANDBOX,
  EMBED_ALLOW_ENUM,
  isSafeEmbedUrl,
  sanitizeEmbedAllow
} from './Embed.svelte';

type EmbedProps = ComponentProps<typeof Embed>;

describe('Embed — sandbox is renderer-controlled', () => {
  it('hard-codes the exact sandbox token set', () => {
    expect(EMBED_SANDBOX).toBe(
      'allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms'
    );
  });

  it('never includes allow-same-origin or allow-top-navigation', () => {
    expect(EMBED_SANDBOX).not.toContain('allow-same-origin');
    expect(EMBED_SANDBOX).not.toContain('allow-top-navigation');
  });

  it('renders the fixed sandbox on a url-mode iframe', () => {
    const { container } = render(Embed, {
      props: { mode: 'url', url: 'https://example.com', title: 'Example' }
    });
    const iframe = container.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe!.getAttribute('sandbox')).toBe(EMBED_SANDBOX);
  });

  it('renders the fixed sandbox on a srcdoc-mode iframe', () => {
    const { container } = render(Embed, {
      props: { mode: 'srcdoc', srcdoc: '<p>hi</p>', title: 'Inline' }
    });
    const iframe = container.querySelector('iframe');
    expect(iframe!.getAttribute('sandbox')).toBe(EMBED_SANDBOX);
  });

  it('ignores a spec-supplied `sandbox` prop — the value is never honored', () => {
    // A malicious spec tries to widen the sandbox. `sandbox` is not a
    // declared prop, so the cast simulates what NodeRenderer would spread.
    const maliciousProps = {
      mode: 'url' as const,
      url: 'https://example.com',
      title: 'Attack',
      sandbox: 'allow-same-origin allow-top-navigation'
    };
    const { container } = render(Embed, {
      props: maliciousProps as unknown as EmbedProps
    });
    const iframe = container.querySelector('iframe');
    // The hard-coded value wins regardless of what the spec passed.
    expect(iframe!.getAttribute('sandbox')).toBe(EMBED_SANDBOX);
    expect(iframe!.getAttribute('sandbox')).not.toContain('allow-same-origin');
  });

  it('always pins referrerpolicy=no-referrer and loading=lazy', () => {
    const { container } = render(Embed, {
      props: { mode: 'url', url: 'https://example.com', title: 'Example' }
    });
    const iframe = container.querySelector('iframe');
    expect(iframe!.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(iframe!.getAttribute('loading')).toBe('lazy');
  });
});

describe('Embed — URL scheme gate (mode=url)', () => {
  it('accepts absolute https URLs', () => {
    expect(isSafeEmbedUrl('https://example.com/page')).toBe(true);
  });

  it.each([
    ['javascript:', 'javascript:alert(1)'],
    ['data:', 'data:text/html,<script>alert(1)</script>'],
    ['blob:', 'blob:https://example.com/uuid'],
    ['file://', 'file:///etc/passwd'],
    ['http://', 'http://example.com'],
    ['protocol-relative', '//evil.com/page'],
    ['empty', ''],
    ['whitespace', '   ']
  ])('rejects %s URLs', (_label, value) => {
    expect(isSafeEmbedUrl(value)).toBe(false);
  });

  it('rejects non-string input', () => {
    expect(isSafeEmbedUrl(undefined)).toBe(false);
    expect(isSafeEmbedUrl(null)).toBe(false);
    expect(isSafeEmbedUrl(42)).toBe(false);
  });

  it('renders an error block instead of an iframe for a javascript: URL', () => {
    const { container } = render(Embed, {
      props: { mode: 'url', url: 'javascript:alert(1)', title: 'Bad' }
    });
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.querySelector('.ripple-embed-error')).not.toBeNull();
  });

  it('renders an error block for an http:// URL', () => {
    const { container } = render(Embed, {
      props: { mode: 'url', url: 'http://example.com', title: 'Bad' }
    });
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.querySelector('.ripple-embed-error')).not.toBeNull();
  });
});

describe('Embed — srcdoc cannot break out of the attribute', () => {
  it('binds srcdoc through an attribute that stays a single attribute', () => {
    // A payload that, if naively concatenated into HTML, would close the
    // srcdoc attribute and inject an attacker-controlled attribute / element.
    const breakout = `"></iframe><script>parent.document.title='pwned'</script>`;
    const { container } = render(Embed, {
      props: { mode: 'srcdoc', srcdoc: breakout, title: 'Inline' }
    });
    const frames = container.querySelectorAll('iframe');
    // Exactly one iframe — the payload did NOT spawn a second element.
    expect(frames.length).toBe(1);
    // The whole payload lives intact inside the srcdoc attribute value.
    expect(frames[0].getAttribute('srcdoc')).toBe(breakout);
    // No injected script escaped into the parent DOM.
    expect(container.querySelector('script')).toBeNull();
    expect(document.title).not.toBe('pwned');
  });

  it('caps srcdoc length at 64KB', () => {
    const huge = 'a'.repeat(64 * 1024 + 500);
    const { container } = render(Embed, {
      props: { mode: 'srcdoc', srcdoc: huge, title: 'Inline' }
    });
    const iframe = container.querySelector('iframe');
    expect(iframe!.getAttribute('srcdoc')!.length).toBe(64 * 1024);
  });
});

describe('Embed — allow enum is closed', () => {
  it('keeps only the four permitted permissions-policy tokens', () => {
    expect(EMBED_ALLOW_ENUM).toEqual([
      'fullscreen',
      'autoplay',
      'encrypted-media',
      'picture-in-picture'
    ]);
  });

  it('drops disallowed tokens (camera, microphone, geolocation, usb, payment)', () => {
    const result = sanitizeEmbedAllow([
      'fullscreen',
      'camera',
      'microphone',
      'geolocation',
      'usb',
      'payment',
      'display-capture',
      'autoplay'
    ]);
    expect(result).toContain('fullscreen');
    expect(result).toContain('autoplay');
    expect(result).not.toContain('camera');
    expect(result).not.toContain('microphone');
    expect(result).not.toContain('geolocation');
    expect(result).not.toContain('usb');
    expect(result).not.toContain('payment');
    expect(result).not.toContain('display-capture');
  });

  it('returns an empty string for non-array / empty input', () => {
    expect(sanitizeEmbedAllow(undefined)).toBe('');
    expect(sanitizeEmbedAllow('fullscreen')).toBe('');
    expect(sanitizeEmbedAllow([])).toBe('');
  });

  it('renders only allowlisted tokens in the iframe allow= attribute', () => {
    const { container } = render(Embed, {
      props: {
        mode: 'url',
        url: 'https://example.com',
        title: 'Example',
        allow: ['fullscreen', 'camera', 'geolocation']
      }
    });
    const iframe = container.querySelector('iframe');
    const allowAttr = iframe!.getAttribute('allow') ?? '';
    expect(allowAttr).toContain('fullscreen');
    expect(allowAttr).not.toContain('camera');
    expect(allowAttr).not.toContain('geolocation');
  });
});

describe('Embed — required props', () => {
  it('renders an error block when mode=url has no valid url', () => {
    const { container } = render(Embed, {
      props: { mode: 'url', title: 'Missing' }
    });
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.querySelector('.ripple-embed-error')).not.toBeNull();
  });

  it('renders an error block when mode=srcdoc has no srcdoc', () => {
    const { container } = render(Embed, {
      props: { mode: 'srcdoc', title: 'Missing' }
    });
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.querySelector('.ripple-embed-error')).not.toBeNull();
  });
});
