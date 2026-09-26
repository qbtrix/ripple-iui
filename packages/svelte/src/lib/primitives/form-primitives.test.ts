// @file primitives/form-primitives.test.ts
// @description NEW 2026-09-26 (feature pages canon, F1 / G5). Behaviour tests for
//   the two form atoms added to `./primitives`: Label (shadcn twin over bits-ui
//   Label) and Textarea (the existing components/ui/textarea). Written red first.
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { Label, Textarea } from './index.js';

afterEach(cleanup);

const text = (t: string) => createRawSnippet(() => ({ render: () => `<span>${t}</span>` }));

describe('Label', () => {
  it('renders a <label> with for, children and the label slot', () => {
    const { container } = render(Label, { for: 'bio', children: text('Bio') });
    const label = container.querySelector('label')!;
    expect(label.getAttribute('for')).toBe('bio');
    expect(label.getAttribute('data-slot')).toBe('label');
    expect(label.textContent).toBe('Bio');
  });

  it('merges a caller class', () => {
    const { container } = render(Label, { class: 'sr-only', children: text('x') });
    expect(container.querySelector('label')!.className).toContain('sr-only');
  });
});

describe('Textarea', () => {
  it('renders a <textarea> with its value and forwarded attributes', () => {
    const { container } = render(Textarea, { value: 'hello', id: 'bio', placeholder: 'About you', rows: 4 });
    const ta = container.querySelector('textarea')!;
    expect(ta.value).toBe('hello');
    expect(ta.id).toBe('bio');
    expect(ta.getAttribute('placeholder')).toBe('About you');
    expect(ta.getAttribute('rows')).toBe('4');
    expect(ta.getAttribute('data-slot')).toBe('textarea');
  });
});
