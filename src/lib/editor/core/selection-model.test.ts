// editor/core/selection-model.test.ts
// @description SP-1a unit tests for the L1 pure SelectionModel (no Svelte): the
//   select/hover/toggle/clear transitions, the changed-boolean return contract,
//   isSelected/isHovered, immutable getState snapshots, and subscribe/unsubscribe.
// @created 2026-06-27 (SP-1a — branch spike/editor-domid-overlay)
import { describe, expect, it, vi } from 'vitest';
import { createSelectionModel, SelectionModel } from './selection-model.js';

describe('SelectionModel', () => {
  it('starts empty', () => {
    const m = new SelectionModel();
    expect(m.selectedId).toBeNull();
    expect(m.hoverId).toBeNull();
    expect(m.getState()).toEqual({ selectedId: null, hoverId: null });
  });

  it('honors initial state', () => {
    const m = createSelectionModel({ selectedId: 'n_aaaaaaaa', hoverId: 'n_bbbbbbbb' });
    expect(m.selectedId).toBe('n_aaaaaaaa');
    expect(m.hoverId).toBe('n_bbbbbbbb');
  });

  it('select returns true only when it changes', () => {
    const m = new SelectionModel();
    expect(m.select('n_aaaaaaaa')).toBe(true);
    expect(m.selectedId).toBe('n_aaaaaaaa');
    expect(m.select('n_aaaaaaaa')).toBe(false); // no change
    expect(m.select(null)).toBe(true); // cleared
    expect(m.selectedId).toBeNull();
  });

  it('hover returns true only when it changes', () => {
    const m = new SelectionModel();
    expect(m.hover('n_bbbbbbbb')).toBe(true);
    expect(m.hoverId).toBe('n_bbbbbbbb');
    expect(m.hover('n_bbbbbbbb')).toBe(false);
  });

  it('toggle selects, then clears the same id', () => {
    const m = new SelectionModel();
    expect(m.toggle('n_aaaaaaaa')).toBe(true);
    expect(m.selectedId).toBe('n_aaaaaaaa');
    expect(m.toggle('n_aaaaaaaa')).toBe(true);
    expect(m.selectedId).toBeNull();
    // toggling a different id selects it
    m.toggle('n_aaaaaaaa');
    expect(m.toggle('n_bbbbbbbb')).toBe(true);
    expect(m.selectedId).toBe('n_bbbbbbbb');
  });

  it('clear wipes both and reports whether anything changed', () => {
    const m = new SelectionModel();
    m.select('n_aaaaaaaa');
    m.hover('n_bbbbbbbb');
    expect(m.clear()).toBe(true);
    expect(m.selectedId).toBeNull();
    expect(m.hoverId).toBeNull();
    expect(m.clear()).toBe(false); // already empty
  });

  it('isSelected / isHovered', () => {
    const m = new SelectionModel({ selectedId: 'n_aaaaaaaa', hoverId: 'n_bbbbbbbb' });
    expect(m.isSelected('n_aaaaaaaa')).toBe(true);
    expect(m.isSelected('n_bbbbbbbb')).toBe(false);
    expect(m.isSelected(null)).toBe(false);
    expect(m.isHovered('n_bbbbbbbb')).toBe(true);
    expect(m.isHovered(null)).toBe(false);
  });

  it('getState returns an independent snapshot', () => {
    const m = new SelectionModel();
    m.select('n_aaaaaaaa');
    const snap = m.getState();
    m.select('n_bbbbbbbb');
    expect(snap.selectedId).toBe('n_aaaaaaaa'); // snapshot not mutated
    expect(m.selectedId).toBe('n_bbbbbbbb');
  });

  it('notifies subscribers on change and stops after unsubscribe', () => {
    const m = new SelectionModel();
    const fn = vi.fn();
    const off = m.subscribe(fn);

    m.select('n_aaaaaaaa');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenLastCalledWith({ selectedId: 'n_aaaaaaaa', hoverId: null });

    m.select('n_aaaaaaaa'); // no change → no emit
    expect(fn).toHaveBeenCalledTimes(1);

    m.hover('n_bbbbbbbb');
    expect(fn).toHaveBeenCalledTimes(2);

    off();
    m.clear();
    expect(fn).toHaveBeenCalledTimes(2); // silent after unsubscribe
  });
});
