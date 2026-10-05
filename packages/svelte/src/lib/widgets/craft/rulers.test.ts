// CanvasViewport rulers and guides: ruler strips + unit label, guides drawn, drag-out adds, drag-back removes, drag moves.
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import CanvasViewport from './CanvasViewport.svelte';
import viewportSource from './CanvasViewport.svelte?raw';

function ptr(node: Element, type: string, x: number, y: number) {
  node.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, button: 0, bubbles: true, cancelable: true }));
}

describe('CanvasViewport rulers', () => {
  it('renders both rulers with the unit label only when asked', () => {
    const off = render(CanvasViewport, { props: { docWidth: 200, docHeight: 100 } });
    expect(off.container.querySelector('[data-slot="ruler-top"]')).toBeNull();
    off.unmount();
    const { container } = render(CanvasViewport, { props: { docWidth: 200, docHeight: 100, rulers: true, rulerUnit: 'mm' } });
    expect(container.querySelector('[data-slot="ruler-top"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="ruler-left"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="ruler-corner"]')?.textContent).toContain('mm');
  });

  it('draws guides at their document position under the transform', () => {
    const { container } = render(CanvasViewport, {
      props: { docWidth: 200, docHeight: 100, zoom: 2, panX: 10, panY: 20, guides: [{ orientation: 'horizontal', position: 30 }, { orientation: 'vertical', position: 5 }] },
    });
    const h = container.querySelector<HTMLElement>('[data-guide="horizontal"]')!;
    const v = container.querySelector<HTMLElement>('[data-guide="vertical"]')!;
    expect(h.style.top).toBe('80px'); // 20 + 30 * 2
    expect(v.style.left).toBe('20px'); // 10 + 5 * 2
  });

  it('dragging out of the top ruler adds a horizontal guide; the stage gets no pointer event', async () => {
    const onguide = vi.fn();
    const onpointer = vi.fn();
    const { container } = render(CanvasViewport, { props: { docWidth: 200, docHeight: 100, rulers: true, onguide, onpointer } });
    const top = container.querySelector('[data-slot="ruler-top"]')!;
    ptr(top, 'pointerdown', 100, 5);
    await tick();
    ptr(top, 'pointermove', 100, 80);
    ptr(top, 'pointerup', 100, 80);
    expect(onguide).toHaveBeenCalledWith({ action: 'add', orientation: 'horizontal', position: 80 });
    expect(onpointer).not.toHaveBeenCalled();
  });

  it('a drag that ends back on the ruler adds nothing', async () => {
    const onguide = vi.fn();
    const { container } = render(CanvasViewport, { props: { docWidth: 200, docHeight: 100, rulers: true, onguide } });
    const left = container.querySelector('[data-slot="ruler-left"]')!;
    ptr(left, 'pointerdown', 5, 50);
    await tick();
    ptr(left, 'pointermove', 10, 50);
    ptr(left, 'pointerup', 10, 50);
    expect(onguide).not.toHaveBeenCalled();
  });

  it('moves a guide, and removes it when dropped on its ruler', async () => {
    const onguide = vi.fn();
    const guides = [{ orientation: 'vertical' as const, position: 60 }];
    const { container } = render(CanvasViewport, { props: { docWidth: 200, docHeight: 100, rulers: true, guides, onguide } });
    let g = container.querySelector('[data-guide="vertical"]')!;
    ptr(g, 'pointerdown', 60, 50);
    await tick();
    ptr(g, 'pointermove', 90, 50);
    ptr(g, 'pointerup', 90, 50);
    expect(onguide).toHaveBeenLastCalledWith({ action: 'move', index: 0, orientation: 'vertical', position: 90 });
    await tick();
    g = container.querySelector('[data-guide="vertical"]')!;
    ptr(g, 'pointerdown', 60, 50);
    await tick();
    ptr(g, 'pointermove', 8, 50);
    ptr(g, 'pointerup', 8, 50);
    expect(onguide).toHaveBeenLastCalledWith({ action: 'remove', index: 0, orientation: 'vertical', position: 8 });
  });
});

// jsdom has no computed colours, so this guards the tokens in the source: the
// rulers are in-flow chrome and fill from the surface family that follows the
// host's light and dark themes, not the floating-layer --ripple-popover (a dark
// glass in paw-enterprise light mode), and carry no colour literals.
describe('CanvasViewport ruler tokens', () => {
  const style = viewportSource.slice(viewportSource.indexOf('<style>'));
  const rule = (sel: string) => style.match(new RegExp(`\\${sel}\\s*\\{([^}]*)\\}`))?.[1] ?? '';

  it('fills the ruler from the theme surface, not the popover layer', () => {
    expect(rule('.craft-ruler')).toMatch(/--ripple-surface\b/);
    expect(rule('.craft-ruler')).not.toMatch(/--ripple-popover/);
  });

  it('draws ticks and labels with theme ink tokens and no colour literals', () => {
    expect(rule('.craft-tick')).toMatch(/var\(--ripple-/);
    expect(rule('.craft-ruler-label')).toMatch(/var\(--ripple-/);
    expect(style).not.toMatch(/#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i);
  });
});

