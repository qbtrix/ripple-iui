// src/lib/components/NodeRenderer.boundary.test.ts
// @file components/NodeRenderer.boundary.test.ts
// @description Per-node error-boundary tests (RCR-4). A widget that throws during
//   render is caught by its node's <svelte:boundary> and shown as an inline
//   ErrorState, while sibling nodes keep rendering — one bad widget can't take
//   down the whole message. Uses a throwing fixture widget registered under a
//   custom type.
// @created 2026-07-08 — RCR-4 (ripple consumer-readiness arc).
import { fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Ripple from '$lib/Ripple.svelte';
import { registerWidget, unregisterWidget } from '$lib/widgets/index.js';
import ThrowingWidget from './__fixtures__/ThrowingWidget.svelte';
import ThrowOnceWidget, { state as throwOnceState } from './__fixtures__/ThrowOnceWidget.svelte';

describe('NodeRenderer per-node error boundary', () => {
  afterEach(() => {
    unregisterWidget('poison');
    unregisterWidget('flaky');
    throwOnceState.armed = true;
    vi.restoreAllMocks();
  });

  it('a widget that throws renders an inline ErrorState while siblings survive', () => {
    // Svelte reports caught boundary errors via console.error/warn; silence the
    // expected noise so the intentional throw doesn't look like a test failure.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    registerWidget('poison', ThrowingWidget);

    const { container, getByText } = render(Ripple, {
      props: {
        spec: {
          ui: {
            type: 'container',
            children: [
              { type: 'text', props: { text: 'sibling before' } },
              { type: 'poison', id: 'bad-node' },
              { type: 'text', props: { text: 'sibling after' } },
            ],
          },
        },
      },
    });

    // The poisoned node was caught by its own boundary and swapped for the
    // error fallback (keyed to the node id), not left to crash the render.
    const errorEl = container.querySelector('[data-ripple-node-error="bad-node"]');
    expect(errorEl).not.toBeNull();
    expect(errorEl!.getAttribute('role')).toBe('alert');
    // The fallback surfaces the underlying error message.
    expect(container.textContent).toContain('poisoned widget');

    // Both siblings still render — the failure is isolated to the one node.
    expect(getByText('sibling before')).toBeTruthy();
    expect(getByText('sibling after')).toBeTruthy();
  });

  it('a throwing grandchild is caught at its own node, not at the ancestor', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    registerWidget('poison', ThrowingWidget);

    const { container, getByText } = render(Ripple, {
      props: {
        spec: {
          ui: {
            type: 'container',
            children: [
              { type: 'text', props: { text: 'outside the card' } },
              {
                type: 'card',
                id: 'ancestor-card',
                children: [
                  { type: 'text', props: { text: 'inside the card' } },
                  { type: 'poison', id: 'bad-grandchild' },
                ],
              },
            ],
          },
        },
      },
    });

    // The fallback is keyed to the grandchild, so the boundary that caught the
    // throw is the grandchild's own — a refactor that hoists the boundary up
    // the tree flips this to the ancestor's id and fails here.
    expect(container.querySelector('[data-ripple-node-error="bad-grandchild"]')).not.toBeNull();
    expect(container.querySelector('[data-ripple-node-error="ancestor-card"]')).toBeNull();

    // The ancestor card and its other child survive.
    expect(getByText('inside the card')).toBeTruthy();
    expect(getByText('outside the card')).toBeTruthy();
  });

  it('"Try again" resets the boundary and re-renders the fixed widget', async () => {
    // Regression test for the dead-button bug: the fallback rendered a
    // "Try again" button with no onaction, so a transiently-failing node
    // stayed wedged on ErrorState forever. A refactor that drops
    // `onaction={reset}` (or renames ErrorState's prop) turns the button
    // back into a no-op — this test is what catches it.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    registerWidget('flaky', ThrowOnceWidget);

    const { container, getByText } = render(Ripple, {
      props: { spec: { ui: { type: 'flaky', id: 'transient-node' } } }
    });

    // First render throws → boundary shows the fallback.
    expect(container.querySelector('[data-ripple-node-error="transient-node"]')).not.toBeNull();

    // The fixture has disarmed itself; clicking retry re-renders the subtree.
    await fireEvent.click(getByText('Try again'));

    expect(container.querySelector('[data-ripple-node-error="transient-node"]')).toBeNull();
    expect(getByText('recovered')).toBeTruthy();
  });
});
