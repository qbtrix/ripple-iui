// src/lib/widgets/input/NumberInput.test.ts
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import NumberInput from './NumberInput.svelte';

describe('NumberInput', () => {
  it('compact: no steppers, the label is an inline prefix, the value still shows', () => {
    const { container, getByText } = render(NumberInput, { props: { value: 7.5, label: 'W', compact: true } });
    expect(container.querySelectorAll('button')).toHaveLength(0);
    expect(getByText('W').closest('.h-7')).not.toBeNull();
    expect((container.querySelector('input') as HTMLInputElement).value).toBe('7.5');
  });

  it('suffix renders a unit inside the box, after the number', () => {
    const { container } = render(NumberInput, { props: { value: 3, label: 'Bleed', compact: true, suffix: 'mm' } });
    const suffix = container.querySelector('[data-slot="number-input-suffix"]') as HTMLElement;
    expect(suffix.textContent).toBe('mm');
    expect(suffix.previousElementSibling?.tagName).toBe('INPUT');
  });

  it('a suffix-only field is still named by its unit', () => {
    const { container } = render(NumberInput, { props: { value: 0, compact: true, suffix: '°' } });
    expect(container.querySelector('input')!.getAttribute('aria-label')).toBe('°');
  });

  it('the root can shrink in a grid or flex track (min-w-0), compact or not', () => {
    for (const compact of [false, true]) {
      const { container, unmount } = render(NumberInput, { props: { value: 1, label: 'Width', compact } });
      expect((container.firstElementChild as HTMLElement).classList.contains('min-w-0')).toBe(true);
      unmount();
    }
  });

  it('compact commits on change, not per keystroke', async () => {
    const onchange = vi.fn();
    const { container } = render(NumberInput, { props: { value: 1, compact: true, onchange } });
    const input = container.querySelector('input') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: '12' } });
    expect(onchange).not.toHaveBeenCalled();
    await fireEvent.change(input, { target: { value: '120' } });
    expect(onchange).toHaveBeenCalledWith(120);
  });

  it('renders the current value in the input', () => {
    const { container } = render(NumberInput, { props: { value: 42 } });
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('42');
  });

  it('emits onchange with value+step when increment clicked', async () => {
    const onchange = vi.fn();
    const { container } = render(NumberInput, { props: { value: 5, step: 1, onchange } });
    const incBtn = container.querySelector('[aria-label="Increment"]') as HTMLElement;
    await fireEvent.click(incBtn);
    expect(onchange).toHaveBeenCalledWith(6);
  });

  it('clamps to max', async () => {
    const onchange = vi.fn();
    const { container } = render(NumberInput, {
      props: { value: 10, max: 10, step: 5, onchange }
    });
    const incBtn = container.querySelector('[aria-label="Increment"]') as HTMLButtonElement;
    expect(incBtn.disabled).toBe(true);
  });

  it('clamps to min', async () => {
    const onchange = vi.fn();
    const { container } = render(NumberInput, {
      props: { value: 0, min: 0, step: 5, onchange }
    });
    const decBtn = container.querySelector('[aria-label="Decrement"]') as HTMLButtonElement;
    expect(decBtn.disabled).toBe(true);
  });

  it('uses formatter for display when provided', () => {
    const { container } = render(NumberInput, {
      props: { value: 1234, formatter: (n: number) => `$${n.toLocaleString()}` }
    });
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('$1,234');
  });

  // F10 / F04: the field never shows text that wasn't applied.
  it('compact: a cleared field reverts to the current value on commit, no emit', async () => {
    const onchange = vi.fn();
    const { container } = render(NumberInput, { props: { value: 10, compact: true, suffix: 'mm', onchange } });
    const input = container.querySelector('input') as HTMLInputElement;
    await fireEvent.change(input, { target: { value: '' } });
    expect(onchange).not.toHaveBeenCalled();
    expect(input.value).toBe('10');
  });

  it('compact: non-numeric text reverts on commit', async () => {
    const onchange = vi.fn();
    const { container } = render(NumberInput, { props: { value: 10, compact: true, onchange } });
    const input = container.querySelector('input') as HTMLInputElement;
    await fireEvent.change(input, { target: { value: 'abc' } });
    expect(onchange).not.toHaveBeenCalled();
    expect(input.value).toBe('10');
  });

  it('compact: a clamped value equal to the current one shows the value, not the typed text', async () => {
    const onchange = vi.fn();
    const { container } = render(NumberInput, { props: { value: 1, min: 1, compact: true, onchange } });
    const input = container.querySelector('input') as HTMLInputElement;
    await fireEvent.change(input, { target: { value: '0' } });
    expect(onchange).toHaveBeenCalledWith(1);
    expect(input.value).toBe('1');
  });

  it('non-compact: on blur the field shows the applied value', async () => {
    const onchange = vi.fn();
    const { container } = render(NumberInput, { props: { value: 100, max: 100, onchange } });
    const input = container.querySelector('input') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: '150' } });
    expect(onchange).toHaveBeenLastCalledWith(100);
    await fireEvent.blur(input);
    expect(input.value).toBe('100');
  });
});
