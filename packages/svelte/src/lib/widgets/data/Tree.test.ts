// src/lib/widgets/data/Tree.test.ts
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import Tree from './Tree.svelte';

const nodes = [
  {
    id: 'src',
    label: 'src',
    children: [
      { id: 'src/index.ts', label: 'index.ts' },
      {
        id: 'src/lib',
        label: 'lib',
        children: [
          { id: 'src/lib/state.ts', label: 'state.ts' },
          { id: 'src/lib/util.ts', label: 'util.ts' }
        ]
      }
    ]
  },
  {
    id: 'tests',
    label: 'tests',
    children: [{ id: 'tests/foo.test.ts', label: 'foo.test.ts' }]
  }
];

describe('Tree', () => {
  it('renders root nodes with role="tree"', () => {
    const { container } = render(Tree, { props: { nodes } });
    expect(container.querySelector('[role="tree"]')).not.toBeNull();
  });

  it('expands first-level nodes by default', () => {
    const { getByText } = render(Tree, { props: { nodes } });
    expect(getByText('index.ts')).not.toBeNull();
    expect(getByText('lib')).not.toBeNull();
  });

  it('hides nested children initially with defaultExpanded="none"', () => {
    const { queryByText } = render(Tree, {
      props: { nodes, defaultExpanded: 'none' }
    });
    expect(queryByText('index.ts')).toBeNull();
  });

  it('emits onchange with the clicked node id', async () => {
    const onchange = vi.fn();
    const { getByText } = render(Tree, { props: { nodes, onchange } });
    await fireEvent.click(getByText('index.ts'));
    expect(onchange).toHaveBeenCalledWith('src/index.ts');
  });

  it('marks the node matching `value` as selected', () => {
    const { container } = render(Tree, { props: { nodes, value: 'src/lib' } });
    const items = container.querySelectorAll('[role="treeitem"]');
    const selected = Array.from(items).filter((el) => el.getAttribute('aria-selected') === 'true');
    expect(selected.length).toBe(1);
  });
});
