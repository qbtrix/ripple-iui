// src/lib/widgets/input/ColorPicker.test.ts
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import ColorPicker from './ColorPicker.svelte';

describe('ColorPicker', () => {
  it('renders the current value text on the trigger', () => {
    const { container } = render(ColorPicker, { props: { value: '#ff00aa' } });
    expect(container.textContent).toContain('#ff00aa');
  });

  it('renders the swatch with the current color as background', () => {
    const { container } = render(ColorPicker, { props: { value: '#3b82f6' } });
    const swatch = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(swatch).not.toBeNull();
    // jsdom normalizes hex → rgb in inline styles, so accept either form.
    const bg = swatch.style.background || swatch.style.backgroundColor || '';
    expect(bg.toLowerCase()).toMatch(/#3b82f6|rgb\(\s*59,\s*130,\s*246\s*\)/);
  });

  it('renders a label when provided', () => {
    const { getByText } = render(ColorPicker, { props: { label: 'Brand color' } });
    expect(getByText('Brand color')).not.toBeNull();
  });
});
