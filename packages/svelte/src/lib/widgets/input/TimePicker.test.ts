// src/lib/widgets/input/TimePicker.test.ts
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import TimePicker from './TimePicker.svelte';

describe('TimePicker', () => {
  it('renders hour and minute spinbuttons by default', () => {
    const { container } = render(TimePicker, { props: { value: '09:30' } });
    const spins = container.querySelectorAll('[role="spinbutton"]');
    expect(spins.length).toBe(2);
  });

  it('shows seconds segment when showSeconds is true', () => {
    const { container } = render(TimePicker, {
      props: { value: '09:30:45', showSeconds: true }
    });
    const spins = container.querySelectorAll('[role="spinbutton"]');
    expect(spins.length).toBe(3);
  });

  it('renders zero-padded values when value is set', () => {
    const { container } = render(TimePicker, { props: { value: '07:05' } });
    const spins = container.querySelectorAll('[role="spinbutton"]') as NodeListOf<HTMLInputElement>;
    expect(spins[0].value).toBe('07');
    expect(spins[1].value).toBe('05');
  });

  it('renders an AM/PM toggle when use12Hour is true', () => {
    const { container } = render(TimePicker, {
      props: { value: '14:30', use12Hour: true }
    });
    expect(container.textContent).toContain('PM');
  });

  it('renders 12-hour format with hour 12 displayed for midnight/noon', () => {
    const { container } = render(TimePicker, {
      props: { value: '00:00', use12Hour: true }
    });
    const hourInput = container.querySelectorAll('[role="spinbutton"]')[0] as HTMLInputElement;
    expect(hourInput.value).toBe('12');
    expect(container.textContent).toContain('AM');
  });
});
