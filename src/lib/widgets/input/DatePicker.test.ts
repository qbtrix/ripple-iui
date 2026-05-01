// src/lib/widgets/input/DatePicker.test.ts
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import DatePicker from './DatePicker.svelte';

describe('DatePicker', () => {
  it('shows the placeholder when value is null', () => {
    const { container } = render(DatePicker, {
      props: { value: null, placeholder: 'Choose a date' }
    });
    expect(container.textContent).toContain('Choose a date');
  });

  it('shows a formatted date when value is a valid ISO string', () => {
    const { container } = render(DatePicker, {
      props: { value: '2026-05-15', format: 'iso' }
    });
    expect(container.textContent).toContain('2026-05-15');
  });

  it('falls back to placeholder for malformed ISO strings', () => {
    const { container } = render(DatePicker, {
      props: { value: 'not-a-date', placeholder: 'Pick' }
    });
    expect(container.textContent).toContain('Pick');
  });

  it('renders a label when provided', () => {
    const { getByText } = render(DatePicker, {
      props: { label: 'Departure', value: null }
    });
    expect(getByText('Departure')).not.toBeNull();
  });

  it('formats medium dates in the chosen locale', () => {
    const { container } = render(DatePicker, {
      props: { value: '2026-05-15', format: 'medium', locale: 'en-US' }
    });
    expect(container.textContent).toMatch(/May/);
    expect(container.textContent).toContain('2026');
  });
});
