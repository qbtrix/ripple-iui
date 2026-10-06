// ChoiceGrid: radio semantics, click selection, roving focus, arrow/Home/End keys skip disabled cards.
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ChoiceGrid from './ChoiceGrid.svelte';

const options = [
  { value: 'card', label: 'Visiting card', detail: '3.5 × 2 in', thumb: { width: 3.5, height: 2 } },
  { value: 'a4', label: 'A4', detail: '210 × 297 mm', thumb: { width: 210, height: 297 } },
  { value: 'x', label: 'Off', disabled: true },
  { value: 'custom', label: 'Custom' },
];

describe('ChoiceGrid', () => {
  it('renders a radiogroup with one checked radio and a single tab stop', () => {
    const { getByRole, getAllByRole } = render(ChoiceGrid, { props: { options, value: 'a4', label: 'Size' } });
    expect(getByRole('radiogroup').getAttribute('aria-label')).toBe('Size');
    const radios = getAllByRole('radio');
    expect(radios).toHaveLength(4);
    expect(radios[1].getAttribute('aria-checked')).toBe('true');
    expect(radios.map((r) => r.getAttribute('tabindex'))).toEqual(['-1', '0', '-1', '-1']);
  });

  it('shows the label and the exact size detail', () => {
    const { container } = render(ChoiceGrid, { props: { options } });
    expect(container.textContent).toContain('210 × 297 mm');
    expect(container.textContent).toContain('Visiting card');
  });

  it('click selects and calls onchange; disabled does nothing', async () => {
    const onchange = vi.fn();
    const { getAllByRole } = render(ChoiceGrid, { props: { options, value: 'card', onchange } });
    await fireEvent.click(getAllByRole('radio')[1]);
    expect(onchange).toHaveBeenCalledWith('a4');
    await fireEvent.click(getAllByRole('radio')[2]);
    expect(onchange).toHaveBeenCalledTimes(1);
  });

  it('arrow keys move and select, skipping disabled; Home and End jump', async () => {
    const onchange = vi.fn();
    const { getAllByRole } = render(ChoiceGrid, { props: { options, value: 'a4', onchange, columns: 4 } });
    const radios = getAllByRole('radio');
    await fireEvent.keyDown(radios[1], { key: 'ArrowRight' });
    expect(onchange).toHaveBeenLastCalledWith('custom');
    expect(document.activeElement).toBe(radios[3]);
    await fireEvent.keyDown(radios[3], { key: 'Home' });
    expect(onchange).toHaveBeenLastCalledWith('card');
    await fireEvent.keyDown(radios[0], { key: 'End' });
    expect(onchange).toHaveBeenLastCalledWith('custom');
    await fireEvent.keyDown(radios[3], { key: 'ArrowLeft' });
    expect(onchange).toHaveBeenLastCalledWith('a4');
  });

  it('draws a proportional page thumbnail', () => {
    const { container } = render(ChoiceGrid, { props: { options } });
    const pages = container.querySelectorAll<HTMLElement>('[aria-hidden="true"] > span');
    const card = pages[0];
    const a4 = pages[1];
    expect(parseInt(card.style.width)).toBeGreaterThan(parseInt(card.style.height));
    expect(parseInt(a4.style.height)).toBeGreaterThan(parseInt(a4.style.width));
  });
});
