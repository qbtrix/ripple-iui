// @file widgets/ai/SelectionActions.test.ts
// @description NEW (beautiful-ui re-skin arc, skin-selection lane, 2026-09-17).
//   Behaviour coverage for SelectionActions against real Selection and Range
//   objects: the toolbar appears for a selection inside the passage and clears
//   without one, a selection that spills outside the component opens nothing,
//   actions carry the captured text (still true after focus moves into the
//   instruction input and the document selection goes with it), a typed
//   instruction sends as "edit", Escape dismisses without the same selection
//   reopening it, Alt+F10 reaches the toolbar, tabbing out closes it, the `›`
//   group leaves the tab order until opened, `disabled` keeps it shut, and a
//   second instance on the page leaves the open one's highlight alone (the
//   registry is page-wide; that bug was found rendering the lab, not in jsdom).
//
//   jsdom has no layout: Range#getBoundingClientRect is stubbed (floating-ui
//   calls it through the anchor) and `selectionchange` is dispatched by hand
//   after each selection edit. The toolbar is portalled to <body>, and
//   floating-ui's hide middleware marks it hidden in a layout-less DOM, so it is
//   found by selector and its contents by text or label — never by role, which
//   skips hidden subtrees.
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, fireEvent, cleanup, within } from '@testing-library/svelte';
import { tick } from 'svelte';
import Harness from './SelectionActions.harness.test.svelte';

beforeAll(() => {
  if (!Range.prototype.getBoundingClientRect) {
    Range.prototype.getBoundingClientRect = () => new DOMRect(10, 10, 80, 16);
  }
});

afterEach(() => {
  document.getSelection()?.removeAllRanges();
  cleanup();
});

const toolbar = () => document.body.querySelector<HTMLElement>('[role="toolbar"]');

/** Select [start, end) of a text node (or from one node to another) and tell the page. */
async function select(start: Node, from: number, end: Node, to: number) {
  const range = document.createRange();
  range.setStart(start, from);
  range.setEnd(end, to);
  const sel = document.getSelection()!;
  sel.removeAllRanges();
  sel.addRange(range);
  document.dispatchEvent(new Event('selectionchange'));
  await tick();
  await tick();
}

async function clearSelection() {
  document.getSelection()!.removeAllRanges();
  document.dispatchEvent(new Event('selectionchange'));
  await tick();
  await tick();
}

const text = (testid: string) => document.querySelector(`[data-testid="${testid}"]`)!.firstChild!;

/** "the batch" inside the passage. */
async function selectBatch() {
  const node = text('passage');
  const i = node.textContent!.indexOf('the batch');
  await select(node, i, node, i + 'the batch'.length);
}

describe('SelectionActions — appearing and clearing', () => {
  it('shows no toolbar without a selection', () => {
    render(Harness);
    expect(toolbar()).toBeNull();
  });

  it('shows the toolbar for a selection inside the passage, and clears it when the selection goes', async () => {
    render(Harness);
    await selectBatch();
    expect(toolbar()).not.toBeNull();
    expect(toolbar()!.getAttribute('aria-label')).toBe('Selection actions');
    await clearSelection();
    expect(toolbar()).toBeNull();
  });

  it('opens nothing for a selection that spills outside the component', async () => {
    render(Harness);
    const outside = text('outside');
    const passage = text('passage');
    await select(outside, 3, passage, 5);
    expect(toolbar()).toBeNull();
  });

  it('opens nothing while disabled', async () => {
    render(Harness, { props: { disabled: true } });
    await selectBatch();
    expect(toolbar()).toBeNull();
  });
});

describe('SelectionActions — actions carry the selected text', () => {
  it('raises onaction with the action id and the selection', async () => {
    const onaction = vi.fn();
    render(Harness, { props: { onaction } });
    await selectBatch();
    await fireEvent.click(within(toolbar()!).getByText('Improve'));
    expect(onaction).toHaveBeenCalledWith({ action: 'improve', text: 'the batch' });
    await tick();
    expect(toolbar()).toBeNull();
  });

  it('sends a typed instruction as an edit, with the text captured before focus moved', async () => {
    const onaction = vi.fn();
    render(Harness, { props: { onaction } });
    await selectBatch();
    const input = within(toolbar()!).getByLabelText('Describe edits') as HTMLInputElement;
    input.focus();
    // Focusing the input takes the document selection with it.
    await clearSelection();
    expect(toolbar()).not.toBeNull();
    await fireEvent.input(input, { target: { value: 'make it punchier' } });
    await fireEvent.submit(input.closest('form')!);
    expect(onaction).toHaveBeenCalledWith({
      action: 'edit',
      text: 'the batch',
      instruction: 'make it punchier',
    });
  });

  it('reveals the extra actions behind › and keeps them out of reach until then', async () => {
    const onaction = vi.fn();
    render(Harness, { props: { onaction } });
    await selectBatch();
    const shorten = within(toolbar()!).getByText('Shorten');
    // Svelte sets `inert` as a property; jsdom keeps it as one, not an attribute.
    const group = () => shorten.closest<HTMLElement>('.ripple-selection-slide')!;
    expect(group().inert).toBe(true);
    const more = within(toolbar()!).getByLabelText('More actions');
    await fireEvent.click(more);
    expect(more.getAttribute('aria-pressed')).toBe('true');
    expect(group().inert).toBe(false);
    await fireEvent.click(shorten);
    expect(onaction).toHaveBeenCalledWith({ action: 'shorten', text: 'the batch' });
  });
});

describe('SelectionActions — the captured highlight', () => {
  it('is painted while open, and a second instance on the page does not clear it', async () => {
    // jsdom has no CSS Custom Highlight API; a Map stands in for the registry.
    const registry = new Map<string, unknown>();
    vi.stubGlobal('CSS', { highlights: registry });
    vi.stubGlobal('Highlight', class {
      constructor(public range: Range) {}
    });
    try {
      render(Harness, { props: { twice: true } });
      await selectBatch();
      expect(toolbar()).not.toBeNull();
      // Both instances heard that selectionchange; the closed one must leave the entry alone.
      expect(registry.has('ripple-selection-actions')).toBe(true);
      await clearSelection();
      expect(registry.has('ripple-selection-actions')).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('SelectionActions — keyboard', () => {
  it('dismisses on Escape, and the same selection does not reopen it', async () => {
    render(Harness);
    await selectBatch();
    await fireEvent.keyDown(document.body, { key: 'Escape' });
    await tick();
    expect(toolbar()).toBeNull();
    document.dispatchEvent(new Event('selectionchange'));
    await tick();
    expect(toolbar()).toBeNull();
    // A different selection does.
    const node = text('passage');
    await select(node, 0, node, 5);
    expect(toolbar()).not.toBeNull();
  });

  it('reopens when the reader drags over the same words again after dismissing', async () => {
    const { getByTestId } = render(Harness);
    await selectBatch();
    await fireEvent.keyDown(document.body, { key: 'Escape' });
    await tick();
    expect(toolbar()).toBeNull();
    await fireEvent.pointerDown(getByTestId('passage'));
    await selectBatch(); // ignored mid-drag
    expect(toolbar()).toBeNull();
    await fireEvent.pointerUp(document);
    await tick();
    expect(toolbar()).not.toBeNull();
  });

  it('moves focus into the toolbar on Alt+F10', async () => {
    render(Harness);
    await selectBatch();
    await fireEvent.keyDown(document.body, { key: 'F10', altKey: true });
    expect(toolbar()!.contains(document.activeElement)).toBe(true);
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Describe edits');
  });

  it('closes when focus tabs out of the toolbar', async () => {
    const { getByText } = render(Harness);
    await selectBatch();
    const input = within(toolbar()!).getByLabelText('Describe edits');
    input.focus();
    // Dispatched rather than driven by .focus(): neither jsdom nor a browser
    // window without OS focus fires focusout for a programmatic focus move.
    await fireEvent.focusOut(input, { relatedTarget: getByText('elsewhere') });
    expect(toolbar()).toBeNull();
  });

  it('announces the toolbar and the shortcut to assistive tech', async () => {
    const { container } = render(Harness);
    const live = container.querySelector('[aria-live="polite"]')!;
    expect(live.textContent).toBe('');
    await selectBatch();
    expect(live.textContent).toContain('Alt+F10');
  });
});
