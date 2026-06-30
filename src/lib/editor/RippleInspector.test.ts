// editor/RippleInspector.test.ts
// @description EP-1 component test for the inspector AFTER its migration onto the
//   LaneAdapter port (jsdom). Proves the panel behaves exactly as the pre-port one
//   while touching ONLY the port: it renders one manifest-driven control per
//   adapter field (header shows type/uid); editing a control calls
//   adapter.applyEdit with the RAW control value in a {kind:'setProp'} EditOp (so
//   coercion lives in the adapter, not the panel); a real RippleLaneAdapter
//   round-trips the edit into the root and `onedit` reports the COERCED stored
//   value; and a null target renders the empty state.
// @created 2026-06-30 (EP-1 — LaneAdapter port + Ripple adapter)
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import type { UINode } from '../schema/ui-spec.js';
import { findById } from '../core/spec-mutator.js';
import Inspector from './RippleInspector.svelte';
import { RippleLaneAdapter } from './core/ripple-lane-adapter.js';
import type { EditableNode, InspectorField, LaneAdapter, TargetRef } from './core/index.js';

const ref = (uid: string): TargetRef => ({ uid, lane: 'ripple' });

// A spy adapter — proves WHAT the panel sends through the port without any real
// substrate. applyEdit returns true so the onedit branch runs.
function spyAdapter(
  node: EditableNode | null,
  fields: InspectorField[]
): LaneAdapter & { applyEdit: ReturnType<typeof vi.fn> } {
  return {
    id: 'ripple',
    resolveElement: () => null,
    readNode: () => node,
    listChildren: () => [],
    getFields: () => fields,
    applyEdit: vi.fn(() => true)
  };
}

describe('RippleInspector — empty state', () => {
  it('renders the prompt when target is null', () => {
    const adapter = spyAdapter(null, []);
    const { getByText } = render(Inspector, { props: { adapter, target: null } });
    expect(getByText('Select an element to edit its properties.')).toBeTruthy();
  });

  it('renders the no-props message when the node has no editable fields', () => {
    const node: EditableNode = { uid: 'n1', type: 'spacer', props: {}, childUids: [] };
    const adapter = spyAdapter(node, []);
    const { getByText } = render(Inspector, { props: { adapter, target: ref('n1') } });
    expect(getByText('No editable properties for this widget.')).toBeTruthy();
  });
});

describe('RippleInspector — renders adapter fields & sends RAW values through the port', () => {
  const node: EditableNode = { uid: 'n_head0001', type: 'heading', props: { text: 'Hi', level: 2 }, childUids: [] };
  const fields: InspectorField[] = [
    { prop: 'text', label: 'text', kind: 'text', value: 'Hi' },
    { prop: 'level', label: 'level', kind: 'select', value: 2, options: ['1', '2', '3'], numeric: true }
  ];

  it('shows the header (type + uid) and one control per field', () => {
    const adapter = spyAdapter(node, fields);
    const { container, getByText } = render(Inspector, { props: { adapter, target: ref('n_head0001') } });
    expect(getByText('heading')).toBeTruthy();
    expect(getByText('n_head0001')).toBeTruthy();
    expect(container.querySelector('input[type="text"]')).not.toBeNull();
    expect(container.querySelector('select')).not.toBeNull();
  });

  it('calls applyEdit with a {kind:setProp} EditOp carrying the RAW value', async () => {
    const adapter = spyAdapter(node, fields);
    const { container } = render(Inspector, { props: { adapter, target: ref('n_head0001') } });

    const text = container.querySelector('input[type="text"]') as HTMLInputElement;
    await fireEvent.input(text, { target: { value: 'Renamed' } });

    expect(adapter.applyEdit).toHaveBeenCalledWith(ref('n_head0001'), {
      kind: 'setProp',
      name: 'text',
      value: 'Renamed' // RAW — the panel does not coerce
    });

    const select = container.querySelector('select') as HTMLSelectElement;
    await fireEvent.change(select, { target: { value: '3' } });

    expect(adapter.applyEdit).toHaveBeenCalledWith(ref('n_head0001'), {
      kind: 'setProp',
      name: 'level',
      value: '3' // RAW string — coercion happens behind the port
    });
  });
});

describe('RippleInspector — round-trip through a real RippleLaneAdapter', () => {
  const makeRoot = (): UINode => ({
    type: 'container',
    id: 'n_root0001',
    children: [{ type: 'heading', id: 'n_head0001', props: { text: 'Title', level: 2 } }]
  });

  it('edits the text prop and reports the stored value via onedit', async () => {
    const root = makeRoot();
    const adapter = new RippleLaneAdapter({ getRoot: () => root });
    const onedit = vi.fn();
    const { container } = render(Inspector, { props: { adapter, target: ref('n_head0001'), onedit } });
    await tick();

    const text = container.querySelector('input[type="text"]') as HTMLInputElement;
    await fireEvent.input(text, { target: { value: 'Renamed' } });

    expect(findById(root, 'n_head0001')?.props?.text).toBe('Renamed');
    expect(onedit).toHaveBeenCalledWith('n_head0001', 'text', 'Renamed');
  });

  it('COERCES a numeric select through the adapter — onedit reports a number', async () => {
    const root = makeRoot();
    const adapter = new RippleLaneAdapter({ getRoot: () => root });
    const onedit = vi.fn();
    const { container } = render(Inspector, { props: { adapter, target: ref('n_head0001'), onedit } });
    await tick();

    const select = container.querySelector('select') as HTMLSelectElement;
    await fireEvent.change(select, { target: { value: '5' } });

    const stored = findById(root, 'n_head0001')?.props?.level;
    expect(stored).toBe(5);
    expect(typeof stored).toBe('number');
    expect(onedit).toHaveBeenCalledWith('n_head0001', 'level', 5); // coerced, not "5"
  });
});
