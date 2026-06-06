// @file widgets/composite/ChecklistLayout.test.ts
// @description Reactivity coverage for ChecklistLayout. Reproduces the bug where
//   toggling a checklist item did nothing because the widget was callback-only
//   and never emitted a new items array. Asserts the value/onchange bind surface
//   (mirroring TodoList), the blocked-item gate, and bind-contract registration.
// @created 2026-06-06 — checklist reactivity fix.
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ChecklistLayout from './ChecklistLayout.svelte';
import { getWidget, hasWidget } from '../index.js';
import {
  getBindContract,
  DEFAULT_BIND_CONTRACT,
  warnUnregisteredBindContract,
  _resetBindContractWarnings,
} from '$lib/core/widget-bind-contract.js';

type ItemState = 'pending' | 'in-progress' | 'done' | 'blocked' | 'skipped';
interface TestItem {
  id: string;
  label: string;
  state: ItemState;
  blockedBy?: string[];
}

const item = (over: Partial<TestItem> = {}): TestItem => ({
  id: 'a',
  label: 'Configure SSO',
  state: 'pending',
  ...over,
});

describe('ChecklistLayout — registry wiring', () => {
  it('resolves both the canonical type and the alias', () => {
    expect(hasWidget('checklist-layout')).toBe(true);
    expect(hasWidget('checklist')).toBe(true);
    expect(getWidget('checklist')).toBe(getWidget('checklist-layout'));
  });
});

describe('ChecklistLayout — bind contract', () => {
  it('uses the default value/onchange surface and does not warn as unregistered', () => {
    expect(getBindContract('checklist-layout')).toEqual(DEFAULT_BIND_CONTRACT);
    // warnUnregisteredBindContract should stay silent — i.e. checklist-layout
    // is a known default-bind widget, not an accidental no-op.
    _resetBindContractWarnings();
    let warned = false;
    const orig = console.warn;
    console.warn = () => {
      warned = true;
    };
    try {
      warnUnregisteredBindContract('checklist-layout');
      warnUnregisteredBindContract('checklist');
    } finally {
      console.warn = orig;
    }
    expect(warned).toBe(false);
  });
});

describe('ChecklistLayout — reactivity', () => {
  it('renders bound items via the value prop', () => {
    const { getByText } = render(ChecklistLayout, {
      props: { value: [item({ label: 'Buy milk' })] },
    });
    expect(getByText('Buy milk')).toBeTruthy();
  });

  it('emits a NEW array with the flipped item state when toggled (the reactivity fix)', async () => {
    let received: Array<{ id: string; state?: string }> = [];
    const value = [item(), item({ id: 'b', label: 'Import data' })];
    const { container } = render(ChecklistLayout, {
      props: { value, onchange: (items) => (received = items as typeof received) },
    });
    const toggle = container.querySelector('.rcheck-toggle') as HTMLButtonElement;
    await fireEvent.click(toggle);

    expect(Array.isArray(received)).toBe(true);
    expect(received).toHaveLength(2);
    // A brand-new array, not the same reference (so $state/StateManager re-renders).
    expect(received).not.toBe(value);
    expect(received[0].state).toBe('done');
    // Other items are untouched.
    expect(received[1].state).toBe('pending');
  });

  it('toggles a done item back to pending', async () => {
    let received: Array<{ state?: string }> = [];
    const { container } = render(ChecklistLayout, {
      props: {
        value: [item({ state: 'done' })],
        onchange: (items) => (received = items as typeof received),
      },
    });
    await fireEvent.click(container.querySelector('.rcheck-toggle') as HTMLButtonElement);
    expect(received[0].state).toBe('pending');
  });

  it('gates a blocked item — does not mark it done', async () => {
    let received: Array<{ state?: string }> | null = null;
    const { container } = render(ChecklistLayout, {
      props: {
        value: [item({ state: 'blocked', blockedBy: ['x'] })],
        onchange: (items) => (received = items as typeof received),
      },
    });
    await fireEvent.click(container.querySelector('.rcheck-toggle') as HTMLButtonElement);
    // No optimistic flip to done for a blocked item.
    if (received) expect((received as Array<{ state?: string }>)[0].state).not.toBe('done');
  });
});
