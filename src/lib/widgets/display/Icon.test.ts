// src/lib/widgets/display/Icon.test.ts
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import Icon from './Icon.svelte';
import { tick } from 'svelte';

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
    // Allow the dynamic import to resolve.
    await new Promise((r) => setTimeout(r, 50));
    await tick();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('keeps the placeholder when the icon name is unknown', async () => {
    const { container } = render(Icon, { props: { name: '__not_a_real_icon__', size: 12 } });
    await new Promise((r) => setTimeout(r, 50));
    await tick();
    expect(container.querySelector('svg')).toBeNull();
    expect(container.querySelector('span')).not.toBeNull();
  });
});
