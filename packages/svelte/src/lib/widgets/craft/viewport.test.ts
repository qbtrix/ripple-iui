// widgets/craft/viewport.test.ts — viewport-math (screen<->doc, anchored zoom,
// fit) and CanvasViewport's wiring of it to pointer, wheel and methods.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import { screenToDoc, docToScreen, zoomAt, fitTransform } from './viewport-math.js';
import CanvasViewport from './CanvasViewport.svelte';

afterEach(cleanup);

describe('viewport-math', () => {
  it.each([
    [{ zoom: 1, panX: 0, panY: 0 }, 50, 40, 50, 40],
    [{ zoom: 2, panX: 100, panY: 50 }, 300, 250, 100, 100],
    [{ zoom: 0.25, panX: -20, panY: 10 }, 5, 35, 100, 100],
  ])('screenToDoc(%o) maps (%d,%d) to (%d,%d) and docToScreen inverts it', (t, sx, sy, x, y) => {
    expect(screenToDoc(sx, sy, t)).toEqual({ x, y });
    expect(docToScreen(x, y, t)).toEqual({ x: sx, y: sy });
  });

  it('zoomAt keeps the document point under the anchor fixed', () => {
    const t = { zoom: 1.5, panX: 37, panY: -12 };
    const before = screenToDoc(200, 120, t);
    const next = zoomAt(t, 4, 200, 120);
    expect(next.zoom).toBe(4);
    const after = screenToDoc(200, 120, next);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it('zoomAt clamps to min/max', () => {
    expect(zoomAt({ zoom: 1, panX: 0, panY: 0 }, 1000, 0, 0, 0.1, 8).zoom).toBe(8);
    expect(zoomAt({ zoom: 1, panX: 0, panY: 0 }, 0.0001, 0, 0, 0.1, 8).zoom).toBe(0.1);
  });

  it('fitTransform picks the limiting axis and centres the document', () => {
    // 1000x500 view, 32px padding: avail 936x436. Doc 800x600 → height limits.
    const f = fitTransform(1000, 500, 800, 600, 32);
    expect(f.zoom).toBeCloseTo(436 / 600);
    expect(f.panX).toBeCloseTo((1000 - 800 * f.zoom) / 2);
    expect(f.panY).toBeCloseTo(32);
    // Wide doc → width limits, vertically centred.
    const g = fitTransform(1000, 500, 2000, 100, 0);
    expect(g.zoom).toBe(0.5);
    expect(g.panY).toBe(225);
  });
});

function stage(container: HTMLElement) {
  const el = container.querySelector<HTMLElement>('[data-slot="canvas-viewport"]')!;
  el.getBoundingClientRect = () => ({ left: 10, top: 20, right: 1010, bottom: 520, width: 1000, height: 500, x: 10, y: 20, toJSON() {} }) as DOMRect;
  Object.defineProperty(el, 'clientWidth', { value: 1000, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: 500, configurable: true });
  return el;
}
const ptr = (type: string, init: MouseEventInit) => new MouseEvent(type, { bubbles: true, cancelable: true, ...init });
const artboard = (c: HTMLElement) => c.querySelector<HTMLElement>('[data-slot="artboard"]')!;

describe('CanvasViewport', () => {
  it('emits down/drag/up in document coordinates at the current zoom and pan', () => {
    const onpointer = vi.fn();
    const { container } = render(CanvasViewport, {
      props: { docWidth: 800, docHeight: 600, zoom: 2, panX: 100, panY: 50, fitOnMount: false, onpointer },
    });
    const el = stage(container);
    // screen local (300, 250) → doc (100, 100)
    el.dispatchEvent(ptr('pointerdown', { clientX: 310, clientY: 270, button: 0, shiftKey: true }));
    el.dispatchEvent(ptr('pointermove', { clientX: 330, clientY: 270 }));
    el.dispatchEvent(ptr('pointerup', { clientX: 330, clientY: 270 }));
    el.dispatchEvent(ptr('pointermove', { clientX: 110, clientY: 70 }));
    const calls = onpointer.mock.calls.map(([e]) => [e.kind, e.x, e.y]);
    expect(calls).toEqual([
      ['down', 100, 100],
      ['drag', 110, 100],
      ['up', 110, 100],
      ['move', 0, 0],
    ]);
    expect(onpointer.mock.calls[0][0].mods.shift).toBe(true);
  });

  it('a middle-button drag pans the artboard without reaching onpointer', async () => {
    const onpointer = vi.fn();
    const { container } = render(CanvasViewport, {
      props: { docWidth: 800, docHeight: 600, zoom: 1, panX: 0, panY: 0, fitOnMount: false, onpointer },
    });
    const el = stage(container);
    el.dispatchEvent(ptr('pointerdown', { clientX: 100, clientY: 100, button: 1 }));
    el.dispatchEvent(ptr('pointermove', { clientX: 140, clientY: 90 }));
    el.dispatchEvent(ptr('pointerup', { clientX: 140, clientY: 90, button: 1 }));
    await Promise.resolve();
    expect(artboard(container).style.transform).toBe('translate(40px, -10px)');
    expect(onpointer).not.toHaveBeenCalled();
  });

  it('fit() and actualSize() drive the transform from the stage size', async () => {
    const { container, component } = render(CanvasViewport, {
      props: { docWidth: 800, docHeight: 600, fitOnMount: false },
    });
    stage(container);
    (component as unknown as { fit(): void }).fit();
    await Promise.resolve();
    const z = 436 / 600;
    expect(parseFloat(artboard(container).style.width)).toBeCloseTo(800 * z);
    (component as unknown as { actualSize(): void }).actualSize();
    await Promise.resolve();
    expect(artboard(container).style.width).toBe('800px');
  });

  it('ctrl+wheel zooms in about the cursor; a plain wheel pans', async () => {
    const { container, component } = render(CanvasViewport, {
      props: { docWidth: 800, docHeight: 600, zoom: 1, panX: 0, panY: 0, fitOnMount: false },
    });
    const el = stage(container);
    const api = component as unknown as { screenToDoc(x: number, y: number): { x: number; y: number } };
    const before = api.screenToDoc(210, 120);
    el.dispatchEvent(new WheelEvent('wheel', { deltaY: -50, ctrlKey: true, clientX: 210, clientY: 120, cancelable: true }));
    await Promise.resolve();
    expect(parseFloat(artboard(container).style.width)).toBeGreaterThan(800);
    const after = api.screenToDoc(210, 120);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
    const w = artboard(container).style.width;
    const tr = artboard(container).style.transform;
    el.dispatchEvent(new WheelEvent('wheel', { deltaX: 0, deltaY: 30, cancelable: true }));
    await Promise.resolve();
    expect(artboard(container).style.width).toBe(w);
    expect(artboard(container).style.transform).not.toBe(tr);
  });

  it('the stage is a named tab stop with a visible focus ring, and passes keys through to the host', () => {
    const { getByRole } = render(CanvasViewport, { props: { docWidth: 100, docHeight: 100, label: 'Artwork' } });
    const stage = getByRole('application', { name: 'Artwork' });
    expect(stage.tabIndex).toBe(0);
    expect(stage.className).toMatch(/focus-visible:ring-2/);
    stage.focus();
    expect(document.activeElement).toBe(stage);
    const seen: string[] = [];
    const host = (e: KeyboardEvent) => seen.push(`${e.key}:${e.defaultPrevented}`);
    window.addEventListener('keydown', host);
    for (const key of ['ArrowLeft', 'Delete', 'v']) stage.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    window.removeEventListener('keydown', host);
    expect(seen).toEqual(['ArrowLeft:false', 'Delete:false', 'v:false']);
  });
});

