// Segmented.keys.test.ts — keyboard in single (radio) mode: one tab stop (the selected option,
// else the first enabled one), arrows move focus AND select like native radios and wrap at the
// ends, Home/End jump, disabled options are skipped. Multiple (checkbox) mode keeps every
// option a tab stop and ignores arrows.
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import Segmented from './Segmented.svelte';

const OPTIONS = [
  { value: 'a', label: 'A' },
  { value: 'b', label: 'B', disabled: true },
  { value: 'c', label: 'C' },
  { value: 'd', label: 'D' },
];

function setup(value: string | null = 'a') {
  const onchange = vi.fn();
  const { container } = render(Segmented, { props: { options: OPTIONS, value, onchange } });
  const radios = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
  return { radios, onchange };
}

describe('Segmented keyboard', () => {
  it('has one tab stop: the selected option', () => {
    const { radios } = setup('c');
    expect(radios.map((r) => r.tabIndex)).toEqual([-1, -1, 0, -1]);
  });

  it('falls back to the first enabled option when nothing is selected', () => {
    const { radios } = setup(null);
    expect(radios.map((r) => r.tabIndex)).toEqual([0, -1, -1, -1]);
  });

  it('Right and Down select and focus the next enabled option, skipping disabled', async () => {
    const { radios, onchange } = setup('a');
    radios[0].focus();
    await fireEvent.keyDown(radios[0], { key: 'ArrowRight' });
    expect(onchange).toHaveBeenLastCalledWith('c');
    expect(document.activeElement).toBe(radios[2]);
    await fireEvent.keyDown(radios[2], { key: 'ArrowDown' });
    expect(onchange).toHaveBeenLastCalledWith('d');
    expect(document.activeElement).toBe(radios[3]);
  });

  it('Left and Up go back, and the arrows wrap at the ends', async () => {
    const { radios, onchange } = setup('a');
    await fireEvent.keyDown(radios[0], { key: 'ArrowLeft' });
    expect(onchange).toHaveBeenLastCalledWith('d');
    expect(document.activeElement).toBe(radios[3]);
    await fireEvent.keyDown(radios[3], { key: 'ArrowRight' });
    expect(onchange).toHaveBeenLastCalledWith('a');
    await fireEvent.keyDown(radios[2], { key: 'ArrowUp' });
    expect(onchange).toHaveBeenLastCalledWith('a');
  });

  it('Home and End jump to the first and last enabled options', async () => {
    const { radios, onchange } = setup('c');
    await fireEvent.keyDown(radios[2], { key: 'End' });
    expect(onchange).toHaveBeenLastCalledWith('d');
    await fireEvent.keyDown(radios[3], { key: 'Home' });
    expect(onchange).toHaveBeenLastCalledWith('a');
    expect(document.activeElement).toBe(radios[0]);
  });

  it('ignores other keys and does nothing when the group is disabled', async () => {
    const onchange = vi.fn();
    const { container } = render(Segmented, { props: { options: OPTIONS, value: 'a', onchange, disabled: true } });
    const first = container.querySelector<HTMLButtonElement>('[role="radio"]')!;
    await fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(onchange).not.toHaveBeenCalled();
    const live = setup('a');
    await fireEvent.keyDown(live.radios[0], { key: 'x' });
    expect(live.onchange).not.toHaveBeenCalled();
  });

  it('multiple mode keeps every option a tab stop and ignores arrows', async () => {
    const onchange = vi.fn();
    const { container } = render(Segmented, { props: { options: ['a', 'b'], value: ['a'], multiple: true, onchange } });
    const boxes = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="checkbox"]'));
    expect(boxes.map((b) => b.tabIndex)).toEqual([0, 0]);
    await fireEvent.keyDown(boxes[0], { key: 'ArrowRight' });
    expect(onchange).not.toHaveBeenCalled();
  });
});
