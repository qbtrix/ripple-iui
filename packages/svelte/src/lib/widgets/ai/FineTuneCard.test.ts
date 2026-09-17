// @file widgets/ai/FineTuneCard.test.ts
// @description NEW (beautiful-ui re-skin arc, skin-selection lane, 2026-09-17).
//   Behaviour coverage for FineTuneCard: the prefix labels really name their
//   inputs, props set every value (the agent's path), user edits raise one
//   `onchange` carrying the whole state, out-of-range typing is held until
//   blur clamps it, Shift+Arrow steps by ten, the scrub gesture moves a value,
//   the layout toggle and Adjust raise their events, and `bind:` round-trips in
//   both directions through a fixture.
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import FineTuneCard from './FineTuneCard.svelte';
import BindFixture from './FineTuneCard.bind.test.svelte';

const num = (el: HTMLElement) => (el as HTMLInputElement).value;

describe('FineTuneCard — fields', () => {
  it('names every number input by its visible prefix', () => {
    const { getByLabelText } = render(FineTuneCard);
    expect(num(getByLabelText('W'))).toBe('324');
    expect(num(getByLabelText('H'))).toBe('96');
    expect(num(getByLabelText('Radius'))).toBe('28');
    expect(num(getByLabelText('Opacity'))).toBe('100');
    expect(getByLabelText('Type').getAttribute('data-slot')).toBe('select-trigger');
  });

  it('takes every value from props, and follows a prop change', async () => {
    const { getByLabelText, getByRole, getByText, rerender } = render(FineTuneCard, {
      props: { values: { width: 500 }, layout: 'grid', type: 'Classic' },
    });
    expect(num(getByLabelText('W'))).toBe('500');
    expect(num(getByLabelText('H'))).toBe('96'); // missing key → field default
    expect(getByRole('radio', { name: /Grid/ }).getAttribute('aria-checked')).toBe('true');
    expect(getByText('Classic')).toBeTruthy();
    await rerender({ values: { width: 640 } });
    expect(num(getByLabelText('W'))).toBe('640');
  });

  it('raises onchange with the whole state on an in-range edit', async () => {
    const onchange = vi.fn();
    const { getByLabelText } = render(FineTuneCard, { props: { onchange } });
    await fireEvent.input(getByLabelText('Radius'), { target: { value: '40' } });
    expect(onchange).toHaveBeenCalledTimes(1);
    expect(onchange).toHaveBeenCalledWith({
      layout: 'row',
      values: { width: 324, height: 96, radius: 40, opacity: 100 },
      type: '',
    });
  });

  it('holds out-of-range typing until blur, then clamps', async () => {
    const onchange = vi.fn();
    const { getByLabelText } = render(FineTuneCard, { props: { onchange } });
    const radius = getByLabelText('Radius');
    await fireEvent.input(radius, { target: { value: '500' } });
    expect(onchange).not.toHaveBeenCalled();
    await fireEvent.blur(radius);
    expect(onchange).toHaveBeenLastCalledWith(expect.objectContaining({ values: expect.objectContaining({ radius: 64 }) }));
    expect(num(radius)).toBe('64');
  });

  it('steps by ten on Shift+Arrow', async () => {
    const onchange = vi.fn();
    const { getByLabelText } = render(FineTuneCard, { props: { onchange } });
    await fireEvent.keyDown(getByLabelText('W'), { key: 'ArrowUp', shiftKey: true });
    expect(num(getByLabelText('W'))).toBe('334');
    await fireEvent.keyDown(getByLabelText('Opacity'), { key: 'ArrowUp', shiftKey: true });
    expect(num(getByLabelText('Opacity'))).toBe('100'); // clamped at max
  });

  it('scrubs a value by dragging its name', async () => {
    const { getByLabelText, getByText } = render(FineTuneCard);
    const handle = getByText('H');
    await fireEvent.pointerDown(handle, { clientX: 100, pointerId: 1 });
    await fireEvent.pointerMove(handle, { clientX: 120, pointerId: 1 });
    await fireEvent.pointerUp(handle, { pointerId: 1 });
    expect(num(getByLabelText('H'))).toBe('106');
    // After release, movement does nothing.
    await fireEvent.pointerMove(handle, { clientX: 200, pointerId: 1 });
    expect(num(getByLabelText('H'))).toBe('106');
  });
});

describe('FineTuneCard — layout, Adjust, Edited', () => {
  it('raises onchange when the layout changes', async () => {
    const onchange = vi.fn();
    const { getByRole } = render(FineTuneCard, { props: { onchange } });
    await fireEvent.click(getByRole('radio', { name: /Column/ }));
    expect(onchange).toHaveBeenCalledWith(expect.objectContaining({ layout: 'column' }));
  });

  it('names the layout group by its heading', () => {
    const { getByRole } = render(FineTuneCard);
    expect(getByRole('group', { name: 'Layout' })).toBeTruthy();
  });

  it('raises onadjust with the current state', async () => {
    const onadjust = vi.fn();
    const { getByRole } = render(FineTuneCard, { props: { onadjust, values: { width: 200 } } });
    await fireEvent.click(getByRole('button', { name: /Adjust/ }));
    expect(onadjust).toHaveBeenCalledWith(
      expect.objectContaining({ values: expect.objectContaining({ width: 200 }) })
    );
  });

  it('shows Edited only once something differs from the defaults', async () => {
    const { queryByText, getByLabelText } = render(FineTuneCard);
    expect(queryByText('Edited')).toBeNull();
    await fireEvent.input(getByLabelText('W'), { target: { value: '400' } });
    expect(queryByText('Edited')).not.toBeNull();
  });
});

describe('FineTuneCard — bind:', () => {
  it('writes user edits back to the bound values and layout', async () => {
    const { getByLabelText, getByRole, getByTestId } = render(BindFixture);
    expect(num(getByLabelText('W'))).toBe('120');
    await fireEvent.input(getByLabelText('H'), { target: { value: '50' } });
    await fireEvent.click(getByRole('radio', { name: /Grid/ }));
    const echo = JSON.parse(getByTestId('echo').textContent ?? '{}');
    expect(echo.values).toEqual({ width: 120, height: 50 });
    expect(echo.layout).toBe('grid');
  });

  it('shows a value the parent writes into the binding', async () => {
    const { getByLabelText, getByText } = render(BindFixture);
    await fireEvent.click(getByText('agent sets radius'));
    expect(num(getByLabelText('Radius'))).toBe('12');
  });
});
