// widgets/craft/transform.test.ts — transform-math (move, resize from any of the 8 handles with an
// optional aspect lock, keyboard nudge) and TransformBox's wiring of it to pointer drags on the box and
// its handles, keyboard nudge / resize / delete, the lock, and the commit after a drag or a nudge burst.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/svelte';
import { moveRect, resizeRect, keyRect } from './transform-math.js';
import TransformBox from './TransformBox.svelte';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const R = { x: 100, y: 50, width: 120, height: 40 };

describe('transform-math', () => {
  it('moveRect shifts, and keeps the rect inside bounds', () => {
    expect(moveRect(R, 10, -5)).toEqual({ x: 110, y: 45, width: 120, height: 40 });
    expect(moveRect(R, -500, 0, { x: 0, y: 0, width: 600, height: 800 })).toEqual({ x: 0, y: 50, width: 120, height: 40 });
    expect(moveRect(R, 1000, 1000, { x: 0, y: 0, width: 600, height: 800 })).toEqual({ x: 480, y: 760, width: 120, height: 40 });
  });

  it.each([
    ['se', 30, 10, { x: 100, y: 50, width: 150, height: 50 }],
    ['nw', 30, 10, { x: 130, y: 60, width: 90, height: 30 }],
    ['e', 30, 10, { x: 100, y: 50, width: 150, height: 40 }],
    ['n', 30, -10, { x: 100, y: 40, width: 120, height: 50 }],
    ['sw', -20, 5, { x: 80, y: 50, width: 140, height: 45 }],
  ] as const)('resizeRect from %s by (%d, %d) moves only that side', (h, dx, dy, want) => {
    expect(resizeRect(R, h, dx, dy)).toEqual(want);
  });

  it('resizeRect with the aspect locked scales from the opposite corner by the dominant axis', () => {
    const r = resizeRect(R, 'se', 60, 0, { aspect: true });
    expect(r.x).toBe(100);
    expect(r.y).toBe(50);
    expect(r.width).toBeCloseTo(180);
    expect(r.height).toBeCloseTo(60);
    const nw = resizeRect(R, 'nw', 0, -20, { aspect: true });
    expect(nw.x + nw.width).toBeCloseTo(220);
    expect(nw.y + nw.height).toBeCloseTo(90);
    expect(nw.width / nw.height).toBeCloseTo(3);
  });

  it('resizeRect with the aspect locked on an edge handle keeps the other axis centred', () => {
    const r = resizeRect(R, 'e', 60, 0, { aspect: true });
    expect(r.width).toBeCloseTo(180);
    expect(r.height).toBeCloseTo(60);
    expect(r.y + r.height / 2).toBeCloseTo(70);
  });

  it('resizeRect never flips or shrinks below the minimum', () => {
    const r = resizeRect(R, 'se', -500, -500, { min: 4 });
    expect(r).toEqual({ x: 100, y: 50, width: 4, height: 4 });
    const w = resizeRect(R, 'w', 500, 0, { min: 4 });
    expect(w.x + w.width).toBe(220);
    expect(w.width).toBe(4);
  });

  it('keyRect: arrows move by step (Shift: big step); Alt + arrows resize from the far corner', () => {
    expect(keyRect(R, 'ArrowRight', {})).toEqual({ x: 101, y: 50, width: 120, height: 40 });
    expect(keyRect(R, 'ArrowUp', { shift: true })).toEqual({ x: 100, y: 40, width: 120, height: 40 });
    expect(keyRect(R, 'ArrowRight', { alt: true })).toEqual({ x: 100, y: 50, width: 121, height: 40 });
    expect(keyRect(R, 'ArrowUp', { alt: true, shift: true })).toEqual({ x: 100, y: 50, width: 120, height: 30 });
    expect(keyRect(R, 'Enter', {})).toBeNull();
  });
});

/** Fire a pointer sequence on `el` (screen px). happy-dom has no setPointerCapture, so moves go to el too. */
async function drag(el: Element, from: [number, number], to: [number, number], init: PointerEventInit = {}) {
  await fireEvent.pointerDown(el, { clientX: from[0], clientY: from[1], button: 0, pointerId: 1, ...init });
  await fireEvent.pointerMove(el, { clientX: (from[0] + to[0]) / 2, clientY: (from[1] + to[1]) / 2, pointerId: 1, ...init });
  await fireEvent.pointerMove(el, { clientX: to[0], clientY: to[1], pointerId: 1, ...init });
  await fireEvent.pointerUp(el, { clientX: to[0], clientY: to[1], pointerId: 1, ...init });
}

describe('TransformBox', () => {
  const view = { zoom: 2, panX: 10, panY: 20 };

  it('sits over the rect in screen px (pan + doc * zoom) with 8 handles', () => {
    const { container } = render(TransformBox, { rect: R, ...view, label: 'Signature' });
    const box = container.querySelector<HTMLElement>('[data-slot=transform-box]')!;
    expect(box.style.left).toBe('210px');
    expect(box.style.top).toBe('120px');
    expect(box.style.width).toBe('240px');
    expect(box.style.height).toBe('80px');
    expect([...container.querySelectorAll('[data-slot=transform-handle]')].map((h) => h.getAttribute('data-handle'))).toEqual(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']);
    expect(box.getAttribute('aria-label')).toMatch(/Signature/);
    expect(box.tabIndex).toBe(0);
  });

  it('dragging the box commits a move in document units, and the press never reaches the stage', async () => {
    const oncommit = vi.fn();
    const stage = vi.fn();
    const { container } = render(TransformBox, { rect: R, ...view, oncommit });
    container.addEventListener('pointerdown', stage);
    const box = container.querySelector('[data-slot=transform-box]')!;
    await drag(box, [250, 140], [290, 120]);
    expect(oncommit).toHaveBeenCalledWith({ x: 120, y: 40, width: 120, height: 40 }, 'move');
    expect(stage).not.toHaveBeenCalled();
  });

  it('a click with no movement commits nothing', async () => {
    const oncommit = vi.fn();
    const { container } = render(TransformBox, { rect: R, ...view, oncommit });
    const box = container.querySelector('[data-slot=transform-box]')!;
    await drag(box, [250, 140], [250, 140]);
    expect(oncommit).not.toHaveBeenCalled();
  });

  it('a corner handle resizes with the aspect locked; Shift frees it', async () => {
    const oncommit = vi.fn();
    const { container } = render(TransformBox, { rect: R, ...view, aspect: true, oncommit });
    const se = container.querySelector('[data-handle=se]')!;
    await drag(se, [450, 200], [570, 200]);
    const [locked] = oncommit.mock.calls[0];
    expect(locked.width).toBeCloseTo(180);
    expect(locked.height).toBeCloseTo(60);
    await drag(se, [450, 200], [570, 200], { shiftKey: true });
    expect(oncommit.mock.calls[1][0]).toEqual({ x: 100, y: 50, width: 180, height: 40 });
    expect(oncommit.mock.calls[1][1]).toBe('resize');
  });

  it('Shift locks the aspect when it is free', async () => {
    const oncommit = vi.fn();
    const { container } = render(TransformBox, { rect: R, ...view, oncommit });
    await drag(container.querySelector('[data-handle=se]')!, [450, 200], [570, 200], { shiftKey: true });
    expect(oncommit.mock.calls[0][0].height).toBeCloseTo(60);
  });

  it('arrow keys preview at once and commit one nudge after the burst; they do not bubble', async () => {
    vi.useFakeTimers();
    const oncommit = vi.fn();
    const outer = vi.fn();
    const { container } = render(TransformBox, { rect: R, ...view, oncommit });
    container.addEventListener('keydown', outer);
    const box = container.querySelector<HTMLElement>('[data-slot=transform-box]')!;
    await fireEvent.keyDown(box, { key: 'ArrowRight' });
    await fireEvent.keyDown(box, { key: 'ArrowRight' });
    await fireEvent.keyDown(box, { key: 'ArrowDown', shiftKey: true });
    expect(box.style.left).toBe('214px');
    expect(oncommit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(600);
    expect(oncommit).toHaveBeenCalledTimes(1);
    expect(oncommit).toHaveBeenCalledWith({ x: 102, y: 60, width: 120, height: 40 }, 'nudge');
    expect(outer).not.toHaveBeenCalled();
  });

  it('Delete and Backspace call ondelete', async () => {
    const ondelete = vi.fn();
    const { container } = render(TransformBox, { rect: R, ...view, ondelete });
    const box = container.querySelector('[data-slot=transform-box]')!;
    await fireEvent.keyDown(box, { key: 'Delete' });
    await fireEvent.keyDown(box, { key: 'Backspace' });
    expect(ondelete).toHaveBeenCalledTimes(2);
  });

  it('Escape during a drag cancels it', async () => {
    const oncommit = vi.fn();
    const { container } = render(TransformBox, { rect: R, ...view, oncommit });
    const box = container.querySelector('[data-slot=transform-box]')!;
    await fireEvent.pointerDown(box, { clientX: 250, clientY: 140, button: 0, pointerId: 1 });
    await fireEvent.pointerMove(box, { clientX: 300, clientY: 140, pointerId: 1 });
    await fireEvent.keyDown(box, { key: 'Escape' });
    await fireEvent.pointerUp(box, { clientX: 300, clientY: 140, pointerId: 1 });
    expect(oncommit).not.toHaveBeenCalled();
  });

  it('locked: no handles, no move, and it says so', async () => {
    const oncommit = vi.fn();
    const { container } = render(TransformBox, { rect: R, ...view, locked: true, oncommit });
    const box = container.querySelector<HTMLElement>('[data-slot=transform-box]')!;
    expect(container.querySelectorAll('[data-slot=transform-handle]').length).toBe(0);
    expect(box.dataset.locked).toBe('true');
    await drag(box, [250, 140], [300, 140]);
    await fireEvent.keyDown(box, { key: 'ArrowRight' });
    expect(oncommit).not.toHaveBeenCalled();
  });

  it('resize="none" keeps the move but drops the handles', async () => {
    const oncommit = vi.fn();
    const { container } = render(TransformBox, { rect: R, ...view, resize: 'none', oncommit });
    expect(container.querySelectorAll('[data-slot=transform-handle]').length).toBe(0);
    await drag(container.querySelector('[data-slot=transform-box]')!, [250, 140], [270, 140]);
    expect(oncommit).toHaveBeenCalledWith({ x: 110, y: 50, width: 120, height: 40 }, 'move');
  });
});
