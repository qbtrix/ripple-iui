// editor-one-op-roundtrip.test.ts
// @description SP-0 editor spike — proves the core editor loop: apply exactly
//   ONE spec-mutator op (node_prop_set) and (a) the rendered DOM reflects the
//   change, while (b) unrelated live instance state (a value the user typed into
//   a different, bound widget) is preserved — i.e. the edit is surgical, not a
//   remount. Uses the $state harness fixture so in-place ops are reactive, the
//   same data flow the real visual editor uses.
// @created 2026-06-27
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import { describe, expect, it } from 'vitest';
import Harness from './editor-roundtrip-harness.test.svelte';

const initial = {
  state: { draft: '' },
  ui: {
    type: 'container',
    id: 'n_root0001',
    children: [
      { type: 'text', id: 'n_target01', props: { text: 'before' } },
      { type: 'input', id: 'n_keepinp1', bind: '{state.draft}', props: { placeholder: 'Name' } },
    ],
  },
};

// One op, wire-shaped exactly like the cloud/local mutation protocol.
const op = { action: 'node_prop_set', node_id: 'n_target01', prop: 'text', value: 'after' };

describe('SP-0: one-op round-trip (spec-mutator -> reactive DOM)', () => {
  it('node_prop_set is reflected in the DOM and unrelated instance state survives', async () => {
    const { container, rerender } = render(Harness, { props: { initial, op, applyNonce: 0 } });
    await tick();

    // Pre-state: target shows "before".
    const target0 = container.querySelector('[id="n_target01"]') as HTMLElement;
    expect(target0).not.toBeNull();
    expect(target0.textContent).toContain('before');

    // Unrelated LIVE instance state: the user types into the bound input.
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input).not.toBeNull();
    await fireEvent.input(input, { target: { value: 'user-typed' } });
    await tick();
    expect(input.value).toBe('user-typed');

    // Apply exactly ONE mutator op (through the $state proxy).
    await rerender({ initial, op, applyNonce: 1 });
    await tick();

    // (a) DOM reflects the edit.
    const target1 = container.querySelector('[id="n_target01"]') as HTMLElement;
    expect(target1.textContent).toContain('after');
    expect(target1.textContent).not.toContain('before');

    // (b) Unrelated instance state preserved — the typed value survives the edit.
    const inputAfter = container.querySelector('input') as HTMLInputElement;
    expect(inputAfter.value).toBe('user-typed');
  });
});
