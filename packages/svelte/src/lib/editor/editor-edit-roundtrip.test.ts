// editor/editor-edit-roundtrip.test.ts
// @description SP-1b integration test — proves the full edit loop through the
//   SP-1b EditorOps seam (the same path inline edit + the inspector use): apply
//   exactly ONE node_prop_set via createEditorOps().setNodeProp and (a) the
//   rendered DOM reflects the new text while (b) unrelated live instance state (a
//   value the user typed into a bound input) survives — a surgical edit, not a
//   remount. Extends SP-0's one-op round-trip, but driving the editor seam (not
//   applyOp directly) and asserting onApplied fired with the op (the SP-1c
//   persistence interception point).
// @created 2026-06-27 (SP-1b — branch spike/editor-domid-overlay)
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import Harness from './editor-edit-harness.test.svelte';

const initial = {
  state: { draft: '' },
  ui: {
    type: 'container',
    id: 'n_root0001',
    children: [
      { type: 'heading', id: 'n_target01', props: { text: 'before', level: 2 } },
      { type: 'input', id: 'n_keepinp1', bind: '{state.draft}', props: { placeholder: 'Name' } }
    ]
  }
};

// One edit, expressed the way the inline editor / inspector express it.
const edit = { node_id: 'n_target01', prop: 'text', value: 'after' };

describe('SP-1b: edit flow round-trip (EditorOps -> reactive DOM)', () => {
  it('node_prop_set via the editor seam updates the DOM and preserves unrelated live state', async () => {
    const onapplied = vi.fn();
    const { container, rerender } = render(Harness, {
      props: { initial, edit, applyNonce: 0, onapplied }
    });
    await tick();

    // Pre-state: target heading shows "before".
    const target0 = container.querySelector('[id="n_target01"]') as HTMLElement;
    expect(target0).not.toBeNull();
    expect(target0.textContent).toContain('before');

    // Unrelated LIVE instance state: the user types into the bound input.
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input).not.toBeNull();
    await fireEvent.input(input, { target: { value: 'user-typed' } });
    await tick();
    expect(input.value).toBe('user-typed');

    // Apply exactly ONE edit through the SP-1b seam (createEditorOps.setNodeProp).
    await rerender({ initial, edit, applyNonce: 1, onapplied });
    await tick();

    // (a) DOM reflects the edit.
    const target1 = container.querySelector('[id="n_target01"]') as HTMLElement;
    expect(target1.textContent).toContain('after');
    expect(target1.textContent).not.toContain('before');

    // (b) Unrelated instance state preserved — the typed value survives the edit.
    expect((container.querySelector('input') as HTMLInputElement).value).toBe('user-typed');

    // (c) The seam fired once with the wire-shaped op — SP-1c persistence hooks here.
    expect(onapplied).toHaveBeenCalledTimes(1);
    expect(onapplied).toHaveBeenCalledWith({
      action: 'node_prop_set',
      node_id: 'n_target01',
      prop: 'text',
      value: 'after'
    });
  });
});
