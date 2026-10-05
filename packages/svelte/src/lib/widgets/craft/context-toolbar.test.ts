// widgets/craft/context-toolbar.test.ts — placeToolbar's flip/clamp/hide maths,
// ContextToolbar's floating placement, docked variant, `>>` edit panel and arrow
// keys, and CanvasViewport ignoring presses on UI marked data-canvas-ui.
import { describe, it, expect, vi, afterEach, beforeAll, afterAll } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/svelte';
import { createRawSnippet, flushSync } from 'svelte';
import { placeToolbar } from './toolbar-math.js';
import ContextToolbar from './ContextToolbar.svelte';
import CanvasViewport from './CanvasViewport.svelte';
import { drainDeferredOverlayTeardown } from '../../../test-setup.js';

afterEach(cleanup);
afterAll(drainDeferredOverlayTeardown);

const view = { width: 1000, height: 600 };
const bar = { width: 200, height: 44 };

describe('placeToolbar', () => {
  it('centres the bar above the selection with the gap', () => {
    const p = placeToolbar({ x: 400, y: 300, width: 200, height: 100 }, bar, view, { gap: 8 });
    expect(p).toEqual({ x: 400, y: 248, side: 'top', hidden: false });
  });

  it('flips below when there is no room above', () => {
    const p = placeToolbar({ x: 400, y: 20, width: 200, height: 100 }, bar, view);
    expect(p.side).toBe('bottom');
    expect(p.y).toBe(128);
  });

  it('honours prefer=bottom and flips up when the bottom is full', () => {
    expect(placeToolbar({ x: 400, y: 100, width: 200, height: 100 }, bar, view, { prefer: 'bottom' }).side).toBe('bottom');
    expect(placeToolbar({ x: 400, y: 500, width: 200, height: 90 }, bar, view, { prefer: 'bottom' }).side).toBe('top');
  });

  it('clamps sideways inside the margin at both edges', () => {
    expect(placeToolbar({ x: -50, y: 300, width: 100, height: 50 }, bar, view).x).toBe(8);
    expect(placeToolbar({ x: 980, y: 300, width: 100, height: 50 }, bar, view).x).toBe(1000 - 8 - 200);
  });

  it('lays the bar over a selection taller than the view, inside the bounds', () => {
    const p = placeToolbar({ x: 300, y: -100, width: 400, height: 900 }, bar, view);
    expect(p.y).toBeGreaterThanOrEqual(8);
    expect(p.y + bar.height).toBeLessThanOrEqual(600 - 8);
    expect(p.hidden).toBe(false);
  });

  it('hides when the selection is entirely outside the view', () => {
    expect(placeToolbar({ x: 1200, y: 300, width: 100, height: 50 }, bar, view).hidden).toBe(true);
    expect(placeToolbar({ x: 300, y: -200, width: 100, height: 50 }, bar, view).hidden).toBe(true);
  });
});

const kid = (html: string) => createRawSnippet(() => ({ render: () => html }));

describe('ContextToolbar', () => {
  // jsdom has no layout: give the bar a measured size so placement runs.
  const desc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
  const descH = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get() { return this.dataset?.slot === 'context-toolbar' ? 200 : 0; },
    });
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get() { return this.dataset?.slot === 'context-toolbar' ? 44 : 0; },
    });
  });
  afterAll(() => {
    if (desc) Object.defineProperty(HTMLElement.prototype, 'offsetWidth', desc);
    if (descH) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', descH);
  });

  const el = (c: HTMLElement) => c.querySelector<HTMLElement>('[data-slot="context-toolbar"]')!;

  it('floats over the anchor, takes pointer events only on itself, and marks itself canvas UI', () => {
    const { container, getByRole } = render(ContextToolbar, {
      props: { anchor: { x: 400, y: 300, width: 200, height: 100 }, bounds: view, children: kid('<button>Font</button>') },
    });
    flushSync();
    const root = el(container);
    expect(getByRole('toolbar', { name: 'Selection tools' })).toBe(root);
    expect(root.style.transform).toBe('translate(400px, 248px)');
    expect(root.dataset.side).toBe('top');
    expect(root.className).toContain('pointer-events-auto');
    expect(root.className).toContain('absolute');
    expect(root.hasAttribute('data-canvas-ui')).toBe(true);
    expect(root.getAttribute('aria-hidden')).toBeNull();
  });

  it('is hidden and inert with no anchor', () => {
    const { container } = render(ContextToolbar, { props: { anchor: null, bounds: view, children: kid('<button>Font</button>') } });
    const root = el(container);
    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(root.inert || root.hasAttribute('inert')).toBe(true);
    expect(root.style.visibility).toBe('hidden');
  });

  it('docked is an in-flow bar with no transform', () => {
    const { container } = render(ContextToolbar, { props: { variant: 'docked', children: kid('<button>Font</button>') } });
    const root = el(container);
    expect(root.dataset.variant).toBe('docked');
    expect(root.className).not.toContain('absolute');
    expect(root.style.transform).toBe('');
    expect(root.getAttribute('aria-hidden')).toBeNull();
  });

  it('`>>` opens the edit panel with its title and content', async () => {
    const { getByRole } = render(ContextToolbar, {
      props: { variant: 'docked', panelTitle: 'Text', panel: kid('<p>font rows</p>'), children: kid('<button>Font</button>') },
    });
    const more = getByRole('button', { name: 'More options' });
    await fireEvent.pointerDown(more);
    await fireEvent.click(more);
    flushSync();
    const panel = document.body.querySelector('[data-slot="context-toolbar-panel"]')!;
    expect(panel).not.toBeNull();
    expect(panel.textContent).toContain('Text');
    expect(panel.textContent).toContain('font rows');
  });

  it('has no `>>` without a panel', () => {
    const { queryByRole } = render(ContextToolbar, { props: { variant: 'docked', children: kid('<button>Font</button>') } });
    expect(queryByRole('button', { name: 'More options' })).toBeNull();
  });

  it('arrow keys move focus between buttons and wrap', async () => {
    const { getByRole } = render(ContextToolbar, {
      props: { variant: 'docked', children: kid('<span><button>Font</button><button>Size</button><button>Colour</button></span>') },
    });
    const font = getByRole('button', { name: 'Font' });
    font.focus();
    await fireEvent.keyDown(font, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(getByRole('button', { name: 'Size' }));
    await fireEvent.keyDown(document.activeElement!, { key: 'End' });
    expect(document.activeElement).toBe(getByRole('button', { name: 'Colour' }));
    await fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(font);
  });
});

describe('CanvasViewport and canvas UI', () => {
  it('a press on an element marked data-canvas-ui never reaches onpointer', () => {
    const onpointer = vi.fn();
    const overlay = createRawSnippet(() => ({
      render: () => '<div data-canvas-ui style="pointer-events:auto"><button id="tb">B</button></div>',
    }));
    const { container } = render(CanvasViewport, { props: { docWidth: 800, docHeight: 600, fitOnMount: false, onpointer, overlay } });
    const button = container.querySelector<HTMLElement>('#tb')!;
    button.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 }));
    expect(onpointer).not.toHaveBeenCalled();
    const stageEl = container.querySelector<HTMLElement>('[data-slot="canvas-viewport"]')!;
    stageEl.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 }));
    expect(onpointer).toHaveBeenCalledTimes(1);
  });
});
