// widgets/data/Tree.layers.test.ts — Tree's opt-in layer-panel mode:
// visibility/lock toggles, rename, Alt+Arrow and drag-and-drop reorder.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/svelte';
import Tree from './Tree.svelte';

afterEach(cleanup);

const layers = [
  { id: 'title', label: 'Title' },
  { id: 'logo', label: 'Logo', visible: false },
  { id: 'bg', label: 'Background', locked: true },
];

describe('Tree layer mode', () => {
  it('renders no layer controls unless their handlers are passed', () => {
    const { container } = render(Tree, { props: { nodes: layers } });
    expect(container.querySelector('[data-action]')).toBeNull();
    expect(container.querySelector('[draggable="true"]')).toBeNull();
  });

  it('visibility and lock toggles report the node id and reflect state', async () => {
    const ontogglevisible = vi.fn();
    const ontogglelock = vi.fn();
    const onchange = vi.fn();
    const { getByRole } = render(Tree, { props: { nodes: layers, ontogglevisible, ontogglelock, onchange } });
    expect(getByRole('button', { name: 'Show Logo' }).getAttribute('aria-pressed')).toBe('true');
    expect(getByRole('button', { name: 'Unlock Background' }).getAttribute('aria-pressed')).toBe('true');
    await fireEvent.click(getByRole('button', { name: 'Hide Title' }));
    await fireEvent.click(getByRole('button', { name: 'Lock Title' }));
    expect(ontogglevisible).toHaveBeenCalledWith('title');
    expect(ontogglelock).toHaveBeenCalledWith('title');
    expect(onchange).not.toHaveBeenCalled(); // toggles don't select
  });

  it('double-click renames; Enter commits, Escape cancels, unchanged is ignored', async () => {
    const onrename = vi.fn();
    const { getByText, getByRole, queryByRole } = render(Tree, { props: { nodes: layers, onrename } });
    await fireEvent.dblClick(getByText('Title'));
    const input = getByRole('textbox', { name: 'Rename Title' }) as HTMLInputElement;
    input.value = 'Headline';
    await fireEvent.keyDown(input, { key: 'Enter' });
    expect(onrename).toHaveBeenCalledWith('title', 'Headline');
    expect(queryByRole('textbox')).toBeNull();

    await fireEvent.keyDown(getByText('Logo').closest('button')!, { key: 'F2' });
    const again = getByRole('textbox', { name: 'Rename Logo' }) as HTMLInputElement;
    again.value = 'Mark';
    await fireEvent.keyDown(again, { key: 'Escape' });
    expect(queryByRole('textbox')).toBeNull();
    expect(onrename).toHaveBeenCalledTimes(1);
  });

  it('Alt+Arrow moves a node past its sibling', async () => {
    const onreorder = vi.fn();
    const { getByText } = render(Tree, { props: { nodes: layers, onreorder } });
    await fireEvent.keyDown(getByText('Logo').closest('button')!, { key: 'ArrowUp', altKey: true });
    expect(onreorder).toHaveBeenLastCalledWith({ id: 'logo', targetId: 'title', position: 'before' });
    await fireEvent.keyDown(getByText('Logo').closest('button')!, { key: 'ArrowDown', altKey: true });
    expect(onreorder).toHaveBeenLastCalledWith({ id: 'logo', targetId: 'bg', position: 'after' });
    await fireEvent.keyDown(getByText('Title').closest('button')!, { key: 'ArrowUp', altKey: true });
    expect(onreorder).toHaveBeenCalledTimes(2); // nothing above the first node
  });

  it('dragging one row onto another emits a LayerMove', async () => {
    const onreorder = vi.fn();
    const { getByText } = render(Tree, { props: { nodes: layers, onreorder } });
    const li = (t: string) => getByText(t).closest('li')!;
    expect(li('Title').getAttribute('draggable')).toBe('true');
    await fireEvent.dragStart(li('Title'));
    await fireEvent.dragOver(li('Background'));
    await fireEvent.drop(li('Background'));
    // jsdom rects are zero-height, so the drop lands in the lower half: 'after'.
    expect(onreorder).toHaveBeenCalledWith({ id: 'title', targetId: 'bg', position: 'after' });
  });
});
