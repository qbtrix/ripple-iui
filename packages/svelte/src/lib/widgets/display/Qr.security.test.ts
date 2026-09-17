// Qr.security.test.ts — widget-level proof that the Qr widget can't be turned
// into an XSS sink through its spec-controlled color props. qrcode-svg
// concatenates `color`/`background` into a style="fill:…" attribute with no
// escaping, so before the fix a value like `red" /><img onerror=…>` broke out
// and injected an HTML element into the {@html} sink. Qr.svelte now validates
// the colors (safeColor) and passes the output through sanitizeSvg.
import { render } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import { tick } from 'svelte';
import Qr from './Qr.svelte';

// qrcode-svg is dynamically imported inside the component; give the async
// import + render a moment to settle before asserting on the DOM.
async function settle() {
  await tick();
  await new Promise((r) => setTimeout(r, 0));
  await tick();
}

describe('Qr widget — color-prop XSS', () => {
  it('does not inject an HTML element from an attribute-breakout color', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = render(Qr, {
      props: {
        value: 'https://ok.example',
        color: 'red" /><img src=x onerror="alert(document.domain)"><rect fill="'
      }
    });
    await settle();

    // No foreign <img>, no surviving handler — the payload never becomes a node.
    expect(container.querySelector('img')).toBeNull();
    expect(container.innerHTML).not.toContain('onerror');
    expect(container.innerHTML).not.toContain('alert(');
  });

  it('still renders a QR svg for a legitimate hex color', async () => {
    const { container } = render(Qr, {
      props: { value: 'https://ok.example', color: '#112233' }
    });
    await settle();
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
