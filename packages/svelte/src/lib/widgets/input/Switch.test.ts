// src/lib/widgets/input/Switch.test.ts
// Created 2026-09-16 with the beautiful-ui re-skin of input/Switch.svelte.
// The re-skin is presentational, but it also fixed the label wiring: `for` used
// to point at the `id` prop, which is undefined unless a spec sets one, so the
// label was attached to nothing. These two cases pin that fix — and that two
// unlabelled instances on one page do not collide on a shared id.
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import Switch from './Switch.svelte';

const control = (root: ParentNode) => root.querySelector('[role="switch"]');

describe('Switch', () => {
  it('wires the label to the control when no id is given', () => {
    const { container } = render(Switch, { props: { label: 'Notifications' } });
    const forAttr = container.querySelector('label')!.getAttribute('for');
    expect(forAttr).toBeTruthy();
    expect(control(container)!.getAttribute('id')).toBe(forAttr);
  });

  it('honours an explicit id', () => {
    const { container } = render(Switch, { props: { id: 'notify', label: 'On' } });
    expect(container.querySelector('label')!.getAttribute('for')).toBe('notify');
    expect(control(container)!.getAttribute('id')).toBe('notify');
  });

  it('gives two unlabelled instances different ids', () => {
    const a = render(Switch, { props: {} });
    const b = render(Switch, { props: {} });
    expect(control(a.container)!.getAttribute('id')).not.toBe(
      control(b.container)!.getAttribute('id')
    );
  });
});
