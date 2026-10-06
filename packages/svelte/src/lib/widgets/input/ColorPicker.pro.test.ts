// ColorPicker pro popover: modes, exact CMYK in/out, swatches with spot marker, none, add-to-swatches, eyedropper event.
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import ColorPicker from './ColorPicker.svelte';

const q = (sel: string) => document.body.querySelector<HTMLElement>(sel);
const qa = (sel: string) => [...document.body.querySelectorAll<HTMLElement>(sel)];
const fields = () => qa('[data-slot="color-picker-fields"] input');

async function commit(input: HTMLElement, v: string) {
  (input as HTMLInputElement).value = v;
  await fireEvent.change(input);
}

describe('ColorPicker (pro)', () => {
  it('compact trigger: a size container; the hex never shrinks and CMYK only shows from 10rem', () => {
    const { container } = render(ColorPicker, { props: { value: '#262626', cmyk: { c: 0, m: 0, y: 0, k: 85 }, compact: true } });
    const trigger = container.querySelector<HTMLElement>('[data-slot="color-picker-trigger"]')!;
    expect(trigger.classList.contains('@container')).toBe(true);
    const readout = trigger.querySelector<HTMLElement>('[data-slot="color-picker-cmyk"]')!;
    expect(readout.textContent).toBe('0/0/0/85');
    expect(readout.className).toMatch(/\bhidden\b.*@min-\[10rem\]:inline/);
    expect([...trigger.querySelectorAll('span')].find((s) => s.textContent === '#262626')!.classList.contains('shrink-0')).toBe(true);
  });

  it('opens in CMYK first for print hosts and shows the exact stored CMYK', async () => {
    render(ColorPicker, { props: { value: '#231f20', cmyk: { c: 60, m: 40, y: 40, k: 100 }, oncmyk: () => {}, open: true } });
    await tick();
    expect(q('[data-slot="color-picker-content"]')).not.toBeNull();
    expect(fields().map((i) => (i as HTMLInputElement).value)).toEqual(['60', '40', '40', '100']);
  });

  it('a CMYK edit goes out as CMYK, not hex', async () => {
    const oncmyk = vi.fn();
    const onchange = vi.fn();
    render(ColorPicker, { props: { value: '#0052cc', cmyk: { c: 100, m: 60, y: 0, k: 20 }, oncmyk, onchange, open: true } });
    await tick();
    await commit(fields()[3], '30');
    expect(oncmyk).toHaveBeenCalledWith({ c: 100, m: 60, y: 0, k: 30 });
    expect(onchange).not.toHaveBeenCalled();
  });

  it('without oncmyk, CMYK edits convert to hex', async () => {
    const onchange = vi.fn();
    render(ColorPicker, { props: { value: '#ffffff', onchange, open: true, mode: 'cmyk' } });
    await tick();
    await commit(fields()[1], '100');
    await commit(fields()[2], '100');
    expect(onchange).toHaveBeenLastCalledWith('#ff0000');
  });

  it('hex and rgb modes commit hex', async () => {
    const onchange = vi.fn();
    const { rerender } = render(ColorPicker, { props: { value: '#000000', onchange, open: true, mode: 'hex' } });
    await tick();
    await commit(fields()[0], '#0052CC');
    expect(onchange).toHaveBeenLastCalledWith('#0052cc');
    await rerender({ mode: 'rgb' });
    await tick();
    expect(fields()).toHaveLength(3);
    await commit(fields()[0], '255');
    expect(onchange).toHaveBeenLastCalledWith('#ff52cc');
  });

  it('document swatches mark spot colours and pick by swatch', async () => {
    const onswatch = vi.fn();
    render(ColorPicker, {
      props: {
        value: '#ffffff',
        open: true,
        swatches: [
          { name: 'White', color: '#ffffff' },
          { name: 'Brand', color: '#0052cc', cmyk: { c: 100, m: 60, y: 0, k: 20 }, spot: true },
        ],
        onswatch,
      },
    });
    await tick();
    const brand = q('[aria-label="Brand, spot colour"]')!;
    expect(brand.dataset.spot).toBe('true');
    await fireEvent.click(brand);
    expect(onswatch.mock.calls[0][0].name).toBe('Brand');
    expect(document.body.textContent).toContain('Document swatches');
  });

  it('none, add-to-swatches, recent and the eyedropper event', async () => {
    const onnone = vi.fn();
    const onaddswatch = vi.fn();
    const oneyedropper = vi.fn();
    const onchange = vi.fn();
    render(ColorPicker, { props: { value: '#ff0000', open: true, onnone, onaddswatch, oneyedropper, onchange, recent: ['#00ff00'] } });
    await tick();
    await fireEvent.click(q('[aria-label="Add to swatches"]')!);
    expect(onaddswatch).toHaveBeenCalledWith({ hex: '#ff0000', cmyk: null });
    await fireEvent.click(q('[aria-label="Recent #00ff00"]')!);
    expect(onchange).toHaveBeenLastCalledWith('#00ff00');
    await fireEvent.click(q('[aria-label="Eyedropper"]')!);
    expect(oneyedropper).toHaveBeenCalled();
  });

  it('a null value shows the trigger as none', () => {
    const { container } = render(ColorPicker, { props: { value: null, onnone: () => {} } });
    expect(container.textContent).toContain('None');
  });

  it('mixed: a selection whose colours differ reads "Mixed", never "None" or one of the colours', () => {
    const { container } = render(ColorPicker, { props: { value: null, mixed: true, cmyk: { c: 0, m: 0, y: 0, k: 100 }, compact: true, onnone: () => {} } });
    const trigger = container.querySelector<HTMLElement>('[data-slot="color-picker-trigger"]')!;
    expect(trigger.textContent?.trim()).toBe('Mixed');
    expect(trigger.querySelector('[data-slot="color-picker-cmyk"]')).toBeNull();
    expect(trigger.getAttribute('data-mixed')).toBe('');
  });
});
