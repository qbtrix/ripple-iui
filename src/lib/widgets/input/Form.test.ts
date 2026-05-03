// src/lib/widgets/input/Form.test.ts
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import Form from './Form.svelte';

describe('Form', () => {
  it('renders a <form> element with novalidate', () => {
    const { container } = render(Form, { props: {} });
    const form = container.querySelector('form');
    expect(form).not.toBeNull();
    expect(form!.hasAttribute('novalidate')).toBe(true);
  });

  it('applies className and style props', () => {
    const { container } = render(Form, {
      props: { class: 'my-form', style: { padding: '8px' } }
    });
    const form = container.querySelector('form')!;
    expect(form.className).toContain('my-form');
    expect(form.getAttribute('style')).toMatch(/padding:\s*8px/);
  });
});
