// src/lib/widgets/input/Combobox.test.ts
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import Combobox from './Combobox.svelte';

const options = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
  { value: 'c', label: 'Cherry', description: 'red' }
];

describe('Combobox', () => {
  it('renders the trigger with placeholder when no value is selected', () => {
    const { container } = render(Combobox, {
      props: { options, placeholder: 'Pick a fruit' }
    });
    expect(container.textContent).toContain('Pick a fruit');
  });

  it('renders the selected option label when a value matches', () => {
    const { container } = render(Combobox, {
      props: { options, value: 'b', placeholder: 'Pick' }
    });
    expect(container.textContent).toContain('Banana');
    expect(container.textContent).not.toContain('Pick');
  });

  it('falls back to placeholder when value does not match any option', () => {
    const { container } = render(Combobox, {
      props: { options, value: 'zzz', placeholder: 'Choose' }
    });
    expect(container.textContent).toContain('Choose');
  });

  it('renders a label when provided', () => {
    const { getByText } = render(Combobox, {
      props: { options, label: 'Fruit' }
    });
    expect(getByText('Fruit')).not.toBeNull();
  });
});
