// src/lib/widgets/input/OtpInput.test.ts
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import OtpInput from './OtpInput.svelte';

describe('OtpInput', () => {
  it('renders `length` cells (default 6)', () => {
    const { container } = render(OtpInput, { props: {} });
    expect(container.querySelectorAll('input').length).toBe(6);
  });

  it('renders custom length', () => {
    const { container } = render(OtpInput, { props: { length: 4 } });
    expect(container.querySelectorAll('input').length).toBe(4);
  });

  it('populates cells from the `value` prop', () => {
    const { container } = render(OtpInput, { props: { value: '123', length: 6 } });
    const inputs = container.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
    expect(inputs[0].value).toBe('1');
    expect(inputs[1].value).toBe('2');
    expect(inputs[2].value).toBe('3');
    expect(inputs[3].value).toBe('');
  });

  it('switches to type=password when mask is true', () => {
    const { container } = render(OtpInput, { props: { mask: true, value: '12' } });
    const inputs = container.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
    expect(inputs[0].type).toBe('password');
  });

  it('renders a label when provided', () => {
    const { getByText } = render(OtpInput, { props: { label: 'Verification code' } });
    expect(getByText('Verification code')).not.toBeNull();
  });
});
