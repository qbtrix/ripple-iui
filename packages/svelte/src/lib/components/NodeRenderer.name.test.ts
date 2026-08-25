// NodeRenderer.name.test.ts — a form-field `name` reaches the rendered control
// so a native <form action> POST (Form.svelte static-host mode) submits fields
// with JS disabled. Renders through Ripple so the whole pipeline runs:
// spec -> NodeRenderer (derives name: explicit props.name wins, else the bind
// path with `state.` stripped) -> widget (applies name to its control).
// Created: 2026-06-02 (ripple-iui #54).
import { render } from '@testing-library/svelte';
import { expect, test } from 'vitest';
import Ripple from '$lib/Ripple.svelte';

test('input: explicit props.name wins over the bind path', () => {
  const { container } = render(Ripple, {
    props: {
      spec: {
        state: { email: '' },
        ui: { type: 'input', bind: '{state.email}', props: { name: 'contact_email', placeholder: 'e' } },
      },
    },
  });
  expect(container.querySelector('input[name="contact_email"]')).not.toBeNull();
});

test('input: name falls back to the bind path (state. stripped)', () => {
  const { container } = render(Ripple, {
    props: {
      spec: {
        state: { username: '' },
        ui: { type: 'input', bind: '{state.username}', props: { placeholder: 'u' } },
      },
    },
  });
  expect(container.querySelector('input[name="username"]')).not.toBeNull();
});

test('input: nested bind path is preserved in the name', () => {
  const { container } = render(Ripple, {
    props: {
      spec: {
        state: { contact: { email: '' } },
        ui: { type: 'input', bind: '{state.contact.email}', props: { placeholder: 'n' } },
      },
    },
  });
  expect(container.querySelector('input[name="contact.email"]')).not.toBeNull();
});

test('input: no bind and no name leaves the control unnamed', () => {
  const { container } = render(Ripple, {
    props: {
      spec: { state: {}, ui: { type: 'input', props: { placeholder: 'x' } } },
    },
  });
  const input = container.querySelector('input[placeholder="x"]');
  expect(input).not.toBeNull();
  expect(input?.getAttribute('name')).toBeNull();
});

test('textarea: name comes from the bind path', () => {
  const { container } = render(Ripple, {
    props: {
      spec: {
        state: { message: '' },
        ui: { type: 'textarea', bind: '{state.message}', props: { placeholder: 'm' } },
      },
    },
  });
  expect(container.querySelector('textarea[name="message"]')).not.toBeNull();
});

test('checkbox: a named control is rendered for native submission', () => {
  const { container } = render(Ripple, {
    props: {
      spec: {
        state: { agreed: false },
        ui: { type: 'checkbox', bind: '{state.agreed}', props: { label: 'Agree' } },
      },
    },
  });
  expect(container.querySelector('[name="agreed"]')).not.toBeNull();
});

test('select: a named control is rendered for native submission', () => {
  const { container } = render(Ripple, {
    props: {
      spec: {
        state: { plan: '' },
        ui: {
          type: 'select',
          bind: '{state.plan}',
          props: { options: [{ label: 'Basic', value: 'basic' }, { label: 'Pro', value: 'pro' }] },
        },
      },
    },
  });
  expect(container.querySelector('[name="plan"]')).not.toBeNull();
});
