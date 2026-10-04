// widgets/craft/page-strip.test.ts — reorderIndex, and PageStrip's selection,
// add, drag and keyboard reorder, context menu, grid toggle and thumbnails.
import { describe, it, expect, vi, afterEach, afterAll } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/svelte';
import { flushSync, mount, tick, unmount } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';
import PageStrip from './PageStrip.svelte';
import { PAGE_MIME, reorderIndex } from './page-strip.js';
import { drainDeferredOverlayTeardown } from '../../../test-setup.js';

afterEach(cleanup);
afterAll(drainDeferredOverlayTeardown);

describe('reorderIndex', () => {
  it.each([
    [0, 2, true, 2],   // first page dropped after the third: it becomes the third
    [0, 2, false, 1],  // before the third: second
    [3, 0, false, 0],  // last page dropped before the first
    [3, 1, true, 2],
    [1, 1, false, null], // onto itself
    [1, 0, true, null],  // just after its left neighbour = where it already is
    [1, 2, false, null],
  ])('from %i onto %i (after=%s) → %s', (from, target, after, want) => {
    expect(reorderIndex(from, target, after)).toBe(want);
  });
});

const pages = [
  { id: 'p1', thumb: 'data:image/png;base64,', width: 210, height: 297 },
  { id: 'p2', label: 'Back side' },
  { id: 'p3' },
];
const opts = () => [...document.querySelectorAll<HTMLElement>('[role="option"]')];

function fakeDataTransfer() {
  const data = new Map<string, string>();
  return {
    setData: (t: string, v: string) => void data.set(t, v),
    getData: (t: string) => data.get(t) ?? '',
    get types() { return [...data.keys()]; },
    effectAllowed: 'all',
  } as unknown as DataTransfer;
}

describe('PageStrip', () => {
  it('lists pages as options, marks the current one and names them', () => {
    const { getByRole } = render(PageStrip, { props: { pages, current: 'p2' } });
    expect(getByRole('listbox', { name: 'Pages' })).not.toBeNull();
    expect(opts().map((o) => o.getAttribute('aria-label'))).toEqual(['Page 1', 'Back side', 'Page 3']);
    expect(opts().map((o) => o.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false']);
    expect(opts().map((o) => o.tabIndex)).toEqual([-1, 0, -1]);
    expect(opts()[0].querySelector('img')!.getAttribute('loading')).toBe('lazy');
    // A4 portrait keeps its aspect at the strip height.
    expect(opts()[0].querySelector('span')!.style.width).toBe(`${Math.round(56 * 210 / 297)}px`);
  });

  it('keeps a host-set current page that arrives before the page list does (a page just added)', () => {
    // A getter-only prop, as a host passes `current={String(page)}`: a write inside PageStrip is a local override.
    const host = new SvelteMap<string, typeof pages>([['pages', pages.slice(0, 1)]]);
    const target = document.body.appendChild(document.createElement('div'));
    const app = mount(PageStrip, { target, props: { get pages() { return host.get('pages')!; }, get current() { return 'p2'; } } });
    try {
      flushSync();
      expect(opts().map((o) => o.getAttribute('aria-selected'))).toEqual(['true']); // falls back to the first page meanwhile
      host.set('pages', pages.slice(0, 2)); // the list catches up; the host's current never changed
      flushSync();
      expect(opts().map((o) => o.getAttribute('aria-selected'))).toEqual(['false', 'true']);
    } finally {
      unmount(app);
      target.remove();
    }
  });

  it('selects on click and with the arrow keys', async () => {
    const onselect = vi.fn();
    render(PageStrip, { props: { pages, onselect } });
    await fireEvent.click(opts()[2]);
    expect(onselect).toHaveBeenLastCalledWith('p3');
    await fireEvent.keyDown(opts()[2], { key: 'ArrowLeft' });
    expect(onselect).toHaveBeenLastCalledWith('p2');
    await tick();
    expect(document.activeElement).toBe(opts()[1]);
    await fireEvent.keyDown(opts()[1], { key: 'Home' });
    expect(onselect).toHaveBeenLastCalledWith('p1');
  });

  it('adds after the current page', async () => {
    const onadd = vi.fn();
    const { getByRole } = render(PageStrip, { props: { pages, current: 'p2', onadd } });
    await fireEvent.click(getByRole('button', { name: 'Add page' }));
    expect(onadd).toHaveBeenCalledWith(2);
  });

  it('has no add button, drag or menu without their handlers', () => {
    const { queryByRole } = render(PageStrip, { props: { pages } });
    expect(queryByRole('button', { name: 'Add page' })).toBeNull();
    expect(opts()[0].getAttribute('draggable')).toBeNull();
  });

  it('reorders by drag and by Alt+Arrow', async () => {
    const onmove = vi.fn();
    render(PageStrip, { props: { pages, onmove } });
    const dataTransfer = fakeDataTransfer();
    await fireEvent.dragStart(opts()[0], { dataTransfer });
    expect(dataTransfer.getData(PAGE_MIME)).toBe('p1');
    opts()[2].getBoundingClientRect = () => ({ left: 200, width: 60, top: 0, height: 60, right: 260, bottom: 60, x: 200, y: 0, toJSON() {} }) as DOMRect;
    // jsdom has no DragEvent, so fireEvent drops clientX; a MouseEvent carries it.
    const over = new MouseEvent('dragover', { bubbles: true, cancelable: true, clientX: 250 });
    Object.defineProperty(over, 'dataTransfer', { value: dataTransfer });
    opts()[2].dispatchEvent(over);
    flushSync();
    expect(opts()[2].dataset.drop).toBe('after');
    await fireEvent.drop(opts()[2], { dataTransfer, clientX: 250 });
    expect(onmove).toHaveBeenCalledWith('p1', 2);

    await fireEvent.keyDown(opts()[1], { key: 'ArrowRight', altKey: true });
    expect(onmove).toHaveBeenLastCalledWith('p2', 2);
    onmove.mockClear();
    await fireEvent.keyDown(opts()[0], { key: 'ArrowLeft', altKey: true });
    expect(onmove).not.toHaveBeenCalled();
  });

  it('opens Duplicate and Delete on right-click, and Delete is off on the last page', async () => {
    const onduplicate = vi.fn();
    const ondelete = vi.fn();
    const { getByRole, unmount } = render(PageStrip, { props: { pages, onduplicate, ondelete } });
    await fireEvent.contextMenu(opts()[1]);
    flushSync();
    const dup = getByRole('menuitem', { name: 'Duplicate page' });
    await fireEvent.click(dup);
    expect(onduplicate).toHaveBeenCalledWith('p2');
    unmount();

    render(PageStrip, { props: { pages: [pages[0]], onduplicate, ondelete } });
    await fireEvent.contextMenu(opts()[0]);
    flushSync();
    expect(getByRole('menuitem', { name: 'Delete page' }).hasAttribute('data-disabled')).toBe(true);
  });

  it('a quick right-click (or two-finger tap) opens the menu without picking an item', async () => {
    // The menu opens under the pointer on contextmenu (pointerdown on macOS); the gesture's own
    // pointerup then lands on the first item with no pointerdown on it.
    const onduplicate = vi.fn();
    const ondelete = vi.fn();
    const { getByRole } = render(PageStrip, { props: { pages, onduplicate, ondelete } });
    await fireEvent.pointerDown(opts()[1], { button: 2, pointerType: 'mouse' });
    await fireEvent.contextMenu(opts()[1]);
    flushSync();
    const dup = getByRole('menuitem', { name: 'Duplicate page' });
    const del = getByRole('menuitem', { name: 'Delete page' });
    await fireEvent.pointerUp(dup, { button: 2, pointerType: 'mouse' });
    await fireEvent.pointerUp(del, { button: 0, pointerType: 'mouse' });
    expect(onduplicate).not.toHaveBeenCalled();
    expect(ondelete).not.toHaveBeenCalled();
    // A deliberate click on the item still works.
    await fireEvent.pointerDown(dup, { button: 0, pointerType: 'mouse' });
    await fireEvent.pointerUp(dup, { button: 0, pointerType: 'mouse' });
    await fireEvent.click(dup);
    expect(onduplicate).toHaveBeenCalledTimes(1);
    expect(onduplicate).toHaveBeenCalledWith('p2');
  });

  it('toggles a larger page grid', async () => {
    const { getByRole, container } = render(PageStrip, { props: { pages } });
    const toggle = getByRole('button', { name: 'Show all pages' });
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    await fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelector('[data-slot="page-strip"]')!.getAttribute('data-view')).toBe('grid');
    expect(opts()[1].querySelector('span')!.style.height).toBe('128px');
  });
});
