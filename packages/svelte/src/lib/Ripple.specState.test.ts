import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { expect, test, vi } from 'vitest';
import Ripple from '$lib/Ripple.svelte';

// Cloud-driven pocket mutations (state_set / state_appended / etc.) land
// in the frontend as in-place writes to `pocket.rippleSpec.state`. The
// pockets store reseats so Svelte notices the change and re-renders. The
// Ripple component must then push those updates into its live
// stateManager so widgets bound to `{state.<path>}` repaint — without
// this sync the canvas freezes on the original snapshot until full
// remount.

test('spec.state delta after re-render flows into live stateManager', async () => {
  const onStateChange = vi.fn();
  const { rerender } = render(Ripple, {
    props: {
      spec: {
        state: { label: 'hello' },
        ui: { type: 'text', props: { text: '{state.label}' } },
      },
      onStateChange,
    },
  });
  await tick();

  // Cloud mutation: replace the bound value and re-render. The sync
  // effect must observe the delta and call stateManager.set('label',
  // 'world'), which fires onStateChange.
  await rerender({
    spec: {
      state: { label: 'world' },
      ui: { type: 'text', props: { text: '{state.label}' } },
    },
    onStateChange,
  });
  await tick();

  const labelWrites = onStateChange.mock.calls.filter((c) => c[0] === 'label');
  expect(labelWrites.length).toBeGreaterThan(0);
  expect(labelWrites.at(-1)![1]).toBe('world');
});

test('unchanged spec.state across re-renders fires no extra sync writes', async () => {
  // The complement: when the parent re-renders without changing
  // spec.state, the diff tracker keeps the sync effect silent so any
  // local stateManager value (e.g. from a user typing into a bound
  // input) survives.
  const onStateChange = vi.fn();
  const { rerender } = render(Ripple, {
    props: {
      spec: {
        state: { draft: '' },
        ui: { type: 'text', props: { text: '{state.draft}' } },
      },
      onStateChange,
    },
  });
  await tick();

  const baseline = onStateChange.mock.calls.length;

  // Re-render with a fresh top-level spec object but identical
  // spec.state values — mirrors what `pocketsStore.pockets = [...]`
  // looks like to <Ripple> when no state actually changed.
  await rerender({
    spec: {
      state: { draft: '' },
      ui: { type: 'text', props: { text: '{state.draft}' } },
    },
    onStateChange,
  });
  await tick();

  expect(onStateChange.mock.calls.length).toBe(baseline);
});
