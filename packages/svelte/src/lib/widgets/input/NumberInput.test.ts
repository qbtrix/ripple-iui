// src/lib/widgets/input/NumberInput.test.ts
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import NumberInput from './NumberInput.svelte';

describe('NumberInput', () => {
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
});
