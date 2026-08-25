// design-system-roundtrip.test.ts
// @description SP-3 bug repro + guard — editing a token must reach the brand when
//   it is held in Svelte $state (the live lab condition the plain-object unit test
//   missed). Before the fix the editor cloned the $state proxy with structuredClone
//   in a way that broke the write-back, so the edit never landed.
// @created 2026-06-28
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import { describe, it, expect } from 'vitest';
import Harness from './design-system-roundtrip-harness.test.svelte';

describe('SP-3: brand edit round-trip through $state', () => {
  it('editing the primary color updates the live brand state', async () => {
    const { getByLabelText, getByTestId } = render(Harness);
    await tick();
    expect(getByTestId('primary-out').textContent).toBe('#4f46e5'); // default indigo

    const input = getByLabelText('primary') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: '#ff0000' } });
    await tick();

    expect(getByTestId('primary-out').textContent).toBe('#ff0000');
  });
});
