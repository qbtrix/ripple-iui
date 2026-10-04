// widgets/craft/shell.test.ts — EditorShell slots, tabbed right panel, resize
// keyboard and the quick/pro density; InspectorSection toggle; PropertyRow label wiring.
import { describe, it, expect, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/svelte';
import { createRawSnippet, flushSync } from 'svelte';
import EditorShell from './EditorShell.svelte';
import InspectorSection from './InspectorSection.svelte';
import PropertyRow from './PropertyRow.svelte';

afterEach(cleanup);

const kid = (text: string) => createRawSnippet(() => ({ render: () => `<span>${text}</span>` }));
const tabbed = createRawSnippet((tab: () => string) => ({ render: () => `<p>panel:${tab()}</p>` }));

describe('EditorShell', () => {
  it('renders each region it is given', () => {
    const { getByText, container } = render(EditorShell, {
      props: { topbar: kid('TOP'), rail: kid('RAIL'), children: kid('CANVAS'), status: kid('100%') },
    });
    for (const t of ['TOP', 'RAIL', 'CANVAS', '100%']) getByText(t);
    expect(container.querySelector('[data-slot="editor-right"]')).toBeNull();
  });

  it('the topbar root fills the tools region, so a flex-1 spacer can push controls right', () => {
    const { container } = render(EditorShell, { props: { topbar: kid('tools') } });
    expect(container.querySelector('[data-slot="editor-tools"]')!.className).toContain('[&>*]:flex-1');
  });

  it('keeps the title outside the scrolling tools region', () => {
    const { container } = render(EditorShell, { props: { title: kid('Studio / Vector'), topbar: kid('New') } });
    const title = container.querySelector('[data-slot="editor-title"]')!;
    const tools = container.querySelector('[data-slot="editor-tools"]')!;
    expect(title.textContent).toBe('Studio / Vector');
    expect(title.className).toContain('shrink-0');
    expect(tools.textContent).toBe('New');
    expect(tools.className).toMatch(/min-w-0.*overflow-x-auto/);
    expect(tools.contains(title)).toBe(false);
  });

  it('tabs the right panel and renders only the active tab', async () => {
    const { getByText, queryByText, getByRole } = render(EditorShell, {
      props: {
        right: tabbed,
        rightTabs: [
          { id: 'props', label: 'Properties' },
          { id: 'layers', label: 'Layers' },
        ],
      },
    });
    getByText('panel:props');
    const layers = getByRole('tab', { name: 'Layers' });
    await fireEvent.pointerDown(layers);
    await fireEvent.mouseDown(layers);
    await fireEvent.click(layers);
    flushSync();
    getByText('panel:layers');
    expect(queryByText('panel:props')).toBeNull();
  });

  it('the right panel handle widens on ArrowLeft and clamps at max', async () => {
    const { getByRole, container } = render(EditorShell, {
      props: { right: tabbed, rightWidth: 500, maxPanel: 520 },
    });
    const handle = getByRole('slider', { name: 'Resize right panel' });
    await fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    expect(handle.getAttribute('aria-valuenow')).toBe('508');
    await fireEvent.keyDown(handle, { key: 'ArrowLeft', shiftKey: true });
    expect(handle.getAttribute('aria-valuenow')).toBe('520');
    expect(container.querySelector<HTMLElement>('[data-slot="editor-right"]')!.style.width).toBe('520px');
  });
});

describe('EditorShell density', () => {
  it('defaults to pro: the rail and the resizable left panel render, no quick slots', () => {
    const { container, getByText } = render(EditorShell, {
      props: { rail: kid('RAIL'), left: kid('LEFT'), children: kid('CANVAS') },
    });
    getByText('RAIL');
    expect(container.querySelector('[data-slot="editor-shell"]')!.getAttribute('data-density')).toBe('pro');
    expect(container.querySelector('[data-slot="editor-left"]')!.getAttribute('style')).toContain('width: 240px');
    expect(container.querySelector('[role="slider"][aria-label="Resize left panel"]')).not.toBeNull();
    for (const slot of ['editor-floating', 'editor-prompt', 'editor-pages']) {
      expect(container.querySelector(`[data-slot="${slot}"]`)).toBeNull();
    }
  });

  it('quick drops the rail and sizes the left panel by its content, with no resize handle', () => {
    const { container, queryByText, getByText } = render(EditorShell, {
      props: { density: 'quick', rail: kid('RAIL'), left: kid('ASSETS'), children: kid('CANVAS') },
    });
    expect(queryByText('RAIL')).toBeNull();
    getByText('ASSETS');
    const left = container.querySelector('[data-slot="editor-left"]')!;
    expect(left.getAttribute('style') ?? '').not.toContain('width');
    expect(container.querySelector('[aria-label="Resize left panel"]')).toBeNull();
  });

  it('renders floating over the canvas, prompt under it and pages above the status bar', () => {
    const { container } = render(EditorShell, {
      props: {
        density: 'quick',
        children: kid('CANVAS'),
        floating: kid('TOOLBAR'),
        prompt: kid('ASK'),
        pages: kid('PAGES'),
        status: kid('62%'),
      },
    });
    const center = container.querySelector('[data-slot="editor-center"]')!;
    const floating = container.querySelector('[data-slot="editor-floating"]')!;
    expect(center.contains(floating)).toBe(true);
    expect(floating.className).toContain('pointer-events-none');
    expect(floating.textContent).toBe('TOOLBAR');
    const prompt = container.querySelector('[data-slot="editor-prompt"]')!;
    expect(center.contains(prompt)).toBe(false);
    expect(center.compareDocumentPosition(prompt) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const pages = container.querySelector('[data-slot="editor-pages"]')!;
    const status = container.querySelector('[data-slot="editor-status"]')!;
    expect(pages.textContent).toBe('PAGES');
    expect(pages.nextElementSibling).toBe(status);
  });
});

describe('EditorShell right floor', () => {
  it('the right panel stops at minRight (240 by default), not the 180 left-panel floor', async () => {
    const { getByRole } = render(EditorShell, { props: { right: tabbed, rightWidth: 260 } });
    const handle = getByRole('slider', { name: 'Resize right panel' });
    for (let i = 0; i < 4; i++) await fireEvent.keyDown(handle, { key: 'ArrowRight', shiftKey: true });
    expect(handle.getAttribute('aria-valuenow')).toBe('240');
  });
});

describe('InspectorSection / PropertyRow', () => {
  it('collapses and expands', async () => {
    const { getByRole, queryByText } = render(InspectorSection, { props: { title: 'Fill', children: kid('row') } });
    const btn = getByRole('button', { name: 'Fill' });
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    await fireEvent.click(btn);
    expect(queryByText('row')).toBeNull();
    await fireEvent.click(btn);
    expect(queryByText('row')).not.toBeNull();
  });

  it('PropertyRow uses a real label when given `for`', () => {
    const { container } = render(PropertyRow, { props: { label: 'Width', for: 'w', children: kid('x') } });
    expect(container.querySelector('label')!.getAttribute('for')).toBe('w');
  });
});
