// src/lib/widgets/display/Icon.test.ts
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import Icon from './Icon.svelte';

describe('Icon', () => {
  it('renders a placeholder span before the icon resolves', () => {
    const { container } = render(Icon, { props: { name: 'check', size: 24 } });
    const span = container.querySelector('span');
    expect(span).not.toBeNull();
    expect(span!.style.width).toBe('24px');
    expect(span!.style.height).toBe('24px');
  });

  it('resolves a known lucide icon and renders its svg', async () => {
    const { container } = render(Icon, { props: { name: 'check', size: 16 } });
    await vi.waitFor(
      () => {
        expect(container.querySelector('svg')).not.toBeNull();
      },
      { timeout: 2000, interval: 25 }
    );
  });

  it('keeps the placeholder when the icon name is unknown', async () => {
    const { container } = render(Icon, { props: { name: '__not_a_real_icon__', size: 12 } });
    // Wait long enough for the dynamic import to fail and the catch handler to run.
    await new Promise((r) => setTimeout(r, 200));
    expect(container.querySelector('svg')).toBeNull();
    expect(container.querySelector('span')).not.toBeNull();
  });
});
