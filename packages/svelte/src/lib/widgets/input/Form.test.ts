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

  it('renders a native POST form when `action` is set (static-host mode)', () => {
    const { container } = render(Form, {
      props: { action: '/api/submit', method: 'post' }
    });
    const form = container.querySelector('form')!;
    expect(form.getAttribute('action')).toBe('/api/submit');
    // jsdom normalizes the reflected method to lowercase.
    expect(form.method).toBe('post');
  });

  it('defaults the native method to post when only `action` is given', () => {
    const { container } = render(Form, { props: { action: '/api/submit' } });
    expect(container.querySelector('form')!.method).toBe('post');
  });

  it('emits NO native action/method by default (client-side mode unchanged)', () => {
    const { container } = render(Form, { props: {} });
    const form = container.querySelector('form')!;
    expect(form.hasAttribute('action')).toBe(false);
    // No explicit method attribute → the browser default (a GET form), which the
    // client handler always preventDefaults; in-app behaviour is unchanged.
    expect(form.hasAttribute('method')).toBe(false);
  });
});
