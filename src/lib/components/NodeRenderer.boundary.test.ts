// src/lib/components/NodeRenderer.boundary.test.ts
// @file components/NodeRenderer.boundary.test.ts
// @description Per-node error-boundary tests (RCR-4). A widget that throws during
//   render is caught by its node's <svelte:boundary> and shown as an inline
//   ErrorState, while sibling nodes keep rendering — one bad widget can't take
//   down the whole message. Uses a throwing fixture widget registered under a
//   custom type.
// @created 2026-07-08 — RCR-4 (ripple consumer-readiness arc).
import { render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Ripple from '$lib/Ripple.svelte';
import { registerWidget, unregisterWidget } from '$lib/widgets/index.js';
import ThrowingWidget from './__fixtures__/ThrowingWidget.svelte';

describe('NodeRenderer per-node error boundary', () => {
  afterEach(() => {
    unregisterWidget('poison');
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
});
