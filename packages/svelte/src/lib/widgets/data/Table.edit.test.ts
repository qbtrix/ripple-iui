// src/lib/widgets/data/Table.edit.test.ts
// Created 2026-06-24 — behavior tests for Table in-place cell editing
// (feat/widget-direct-manipulation). Failing-first, then green. Two layers:
//   (1) widget-level — props + onchange spy: click→edit, Enter commits, Escape
//       cancels, unbound/non-editable stays read-only.
//   (2) integration through Ripple — bind + onStateChange spy: a bound editable
//       table commits the edit to state and surfaces it via onStateChange,
//       proving the full manipulation→persist chain end-to-end.
import { afterEach, describe, expect, it, test, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Table from './Table.svelte';
import Ripple from '$lib/Ripple.svelte';

const columns = [
  { header: 'Name', accessorKey: 'name' },
  { header: 'Role', accessorKey: 'role' }
];

const rows = [
  { id: 1, name: 'Ada', role: 'Engineer' },
  { id: 2, name: 'Bob', role: 'Designer' }
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Table in-place cell editing (widget level)', () => {
  it('renders no editable affordance when editable is not set (backward compat)', () => {
    const { container } = render(Table, { props: { columns, data: rows } });
    expect(container.querySelector('[data-editable="true"]')).toBeNull();
    expect(container.querySelector('input')).toBeNull();
  });

  it('marks cells editable and exposes them as keyboard-operable when editable=true', () => {
    const onchange = vi.fn();
    const { container } = render(Table, {
      props: { columns, data: rows, editable: true, onchange }
    });
    const editable = container.querySelectorAll('[data-editable="true"]');
    // 2 rows × 2 columns = 4 editable cells.
    expect(editable.length).toBe(4);
    for (const cell of editable) {
      expect(cell.getAttribute('role')).toBe('button');
      expect(cell.getAttribute('tabindex')).toBe('0');
    }
  });

  it('clicking an editable cell swaps to an input seeded with the cell value', async () => {
    const onchange = vi.fn();
    const { container } = render(Table, {
      props: { columns, data: rows, editable: true, onchange }
    });
    const cell = container.querySelector('[data-editable="true"]') as HTMLElement;
    await fireEvent.click(cell);
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.value).toBe('Ada');
  });

  it('Enter commits the edit and emits the full mutated rows array via onchange', async () => {
    const onchange = vi.fn();
    const { container } = render(Table, {
      props: { columns, data: rows, editable: true, onchange }
    });
    const cell = container.querySelector('[data-editable="true"]') as HTMLElement;
    await fireEvent.click(cell);
    const input = container.querySelector('input') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'Ada Lovelace' } });
    await fireEvent.keyDown(input, { key: 'Enter' });

    expect(onchange).toHaveBeenCalledTimes(1);
    const next = onchange.mock.calls[0][0];
    expect(next).toEqual([
      { id: 1, name: 'Ada Lovelace', role: 'Engineer' },
      { id: 2, name: 'Bob', role: 'Designer' }
    ]);
    // Original arrays are not mutated in place.
    expect(rows[0].name).toBe('Ada');
  });

  it('Escape cancels the edit — no onchange, value restored', async () => {
    const onchange = vi.fn();
    const { container } = render(Table, {
      props: { columns, data: rows, editable: true, onchange }
    });
    const cell = container.querySelector('[data-editable="true"]') as HTMLElement;
    await fireEvent.click(cell);
    const input = container.querySelector('input') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'Discarded' } });
    await fireEvent.keyDown(input, { key: 'Escape' });

    expect(onchange).not.toHaveBeenCalled();
    // Editor closed, original value still shown.
    expect(container.querySelector('input')).toBeNull();
    expect(container.textContent).toContain('Ada');
    expect(container.textContent).not.toContain('Discarded');
  });

  it('a per-column editable:false flag keeps that column read-only', () => {
    const onchange = vi.fn();
    const cols = [
      { header: 'Name', accessorKey: 'name' },
      { header: 'Role', accessorKey: 'role', editable: false }
    ];
    const { container } = render(Table, {
      props: { columns: cols, data: rows, editable: true, onchange }
    });
    const editable = container.querySelectorAll('[data-editable="true"]');
    // Only the Name column is editable → 2 cells, not 4.
    expect(editable.length).toBe(2);
  });

  it('Enter on a focused editable cell opens the editor (keyboard a11y)', async () => {
    const onchange = vi.fn();
    const { container } = render(Table, {
      props: { columns, data: rows, editable: true, onchange }
    });
    const cell = container.querySelector('[data-editable="true"]') as HTMLElement;
    await fireEvent.keyDown(cell, { key: 'Enter' });
    expect(container.querySelector('input')).not.toBeNull();
  });
});

describe('Table edit → state persistence (integration through Ripple)', () => {
  test('a bound editable table commits the edit to state and fires onStateChange', async () => {
    const onStateChange = vi.fn();
    const { container } = render(Ripple, {
      props: {
        spec: {
          state: {
            people: [
              { id: 1, name: 'Ada', role: 'Engineer' },
              { id: 2, name: 'Bob', role: 'Designer' }
            ]
          },
          ui: {
            type: 'table',
            bind: '{state.people}',
            props: {
              editable: true,
              columns: [
                { header: 'Name', accessorKey: 'name' },
                { header: 'Role', accessorKey: 'role' }
              ]
            }
          }
        },
        onStateChange
      }
    });

    const cell = container.querySelector('[data-editable="true"]') as HTMLElement;
    await fireEvent.click(cell);
    const input = container.querySelector('input') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'Ada L' } });
    await fireEvent.keyDown(input, { key: 'Enter' });

    expect(onStateChange).toHaveBeenCalled();
    const lastCall = onStateChange.mock.calls.at(-1)!;
    expect(lastCall[0]).toBe('people');
    expect(lastCall[1]).toEqual([
      { id: 1, name: 'Ada L', role: 'Engineer' },
      { id: 2, name: 'Bob', role: 'Designer' }
    ]);
  });

  test('an unbound table in a spec stays read-only (no inputs, no onStateChange writes)', async () => {
    const onStateChange = vi.fn();
    const { container } = render(Ripple, {
      props: {
        spec: {
          ui: {
            type: 'table',
            props: {
              data: [{ id: 1, name: 'Ada', role: 'Engineer' }],
              columns: [
                { header: 'Name', accessorKey: 'name' },
                { header: 'Role', accessorKey: 'role' }
              ]
            }
          }
        },
        onStateChange
      }
    });

    // No editable prop → no editable cells, no inputs.
    expect(container.querySelector('[data-editable="true"]')).toBeNull();
    // Clicking a cell does nothing.
    const cell = screen.getByText('Ada');
    await fireEvent.click(cell);
    expect(container.querySelector('input')).toBeNull();
    expect(onStateChange).not.toHaveBeenCalled();
  });
});
