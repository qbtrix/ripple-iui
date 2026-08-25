/**
 * @file design-system-editor.test.ts
 * @description SP-3 — the token editor emits an updated BrandPack on edit, and an
 *   edited token resolves to the expected CSS var through the applier (the loop the
 *   lab relies on: editor onChange → brand $state → <Ripple brand> re-skin).
 * @created 2026-06-28
 */
import { render, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import DesignSystemEditor from './DesignSystemEditor.svelte';
import { defaultBrandPack } from './brand-defaults.js';
import { brandToCssVars } from '@ripple-ui/core';

describe('DesignSystemEditor', () => {
  it('emits an updated BrandPack when the primary color text is edited', async () => {
    const brand = defaultBrandPack();
    const onChange = vi.fn();
    const { getByLabelText } = render(DesignSystemEditor, {
      props: { brand, onChange, mode: 'light' }
    });

    const input = getByLabelText('primary') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: '#ff0000' } });

    expect(onChange).toHaveBeenCalled();
    const next = onChange.mock.calls.at(-1)![0];
    expect(next.tokens.color.primary.light).toBe('#ff0000');
  });

  it('an edited token resolves to its CSS var through the applier', () => {
    const brand = defaultBrandPack();
    brand.tokens!.color!.primary = { light: '#123456' };
    const vars = brandToCssVars(brand, { mode: 'light' });
    // primary drives both the shadcn base var and the ripple namespace.
    expect(vars['--primary']).toBe('#123456');
    expect(vars['--ripple-accent']).toBe('#123456');
  });

  it('renders without an onChange handler (uncontrolled view is safe)', () => {
    const { getByText } = render(DesignSystemEditor, {
      props: { brand: defaultBrandPack() }
    });
    expect(getByText('Colors')).toBeTruthy();
  });
});
