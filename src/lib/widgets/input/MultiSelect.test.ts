// src/lib/widgets/input/MultiSelect.test.ts
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import MultiSelect from './MultiSelect.svelte';

const options = [
  { value: 'svelte', label: 'Svelte' },
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
  { value: 'solid', label: 'Solid' }
];

describe('MultiSelect', () => {
  it('shows placeholder when nothing selected', () => {
    const { container } = render(MultiSelect, {
      props: { options, value: [], placeholder: 'Pick frameworks' }
    });
    expect(container.textContent).toContain('Pick frameworks');
  });

  it('renders chips for each selected value', () => {
    const { container } = render(MultiSelect, {
      props: { options, value: ['svelte', 'react'] }
    });
    expect(container.textContent).toContain('Svelte');
    expect(container.textContent).toContain('React');
  });

  it('collapses overflow chips into "+N more" past maxChips', () => {
    const { container } = render(MultiSelect, {
      props: { options, value: ['svelte', 'react', 'vue', 'solid'], maxChips: 2 }
    });
    expect(container.textContent).toContain('+2 more');
  });

  it('renders an external label when provided', () => {
    const { getByText } = render(MultiSelect, {
      props: { options, label: 'Stack' }
    });
    expect(getByText('Stack')).not.toBeNull();
  });

  it('handles non-array `value` defensively', () => {
    const { container } = render(MultiSelect, {
      // @ts-expect-error — testing defensive runtime behavior
      props: { options, value: undefined, placeholder: 'Empty' }
    });
    expect(container.textContent).toContain('Empty');
  });
});
