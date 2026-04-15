import { render } from '@testing-library/svelte';
import { expect, test } from 'vitest';
import Ripple from '$lib/Ripple.svelte';
import type { UINode } from '$lib/schema/ui-spec.js';

function renderSpec(ui: UINode) {
  return render(Ripple, { props: { spec: { ui } } });
}

test('children without slot go to the default body', () => {
  const { container } = renderSpec({
    type: 'card',
    props: { title: 'T' },
    children: [{ type: 'text', props: { text: 'body content' } }],
  });
  const body = container.querySelector('[data-slot="card-body"]');
  expect(body).not.toBeNull();
  expect(body!.textContent).toContain('body content');
});

test('child with slot="header" lands in card-header, not card-body', () => {
  const { container } = renderSpec({
    type: 'card',
    props: { title: 'T' },
    children: [
      { type: 'stat', props: { value: 42 }, slot: 'header' },
      { type: 'text', props: { text: 'body content' } },
    ],
  });
  const header = container.querySelector('[data-slot="card-header"]');
  const body = container.querySelector('[data-slot="card-body"]');
  expect(header?.textContent).toContain('42');
  expect(body?.textContent).toContain('body content');
  expect(body?.textContent ?? '').not.toContain('42');
});

test('child with slot="footer" lands in card-footer', () => {
  const { container } = renderSpec({
    type: 'card',
    props: { title: 'T' },
    children: [
      { type: 'text', props: { text: 'meta' }, slot: 'footer' },
      { type: 'text', props: { text: 'body' } },
    ],
  });
  const footer = container.querySelector('[data-slot="card-footer"]');
  expect(footer?.textContent).toContain('meta');
});

test('multiple children with same slot all render in that slot', () => {
  const { container } = renderSpec({
    type: 'card',
    props: {},
    children: [
      { type: 'text', props: { text: 'h1' }, slot: 'header' },
      { type: 'text', props: { text: 'h2' }, slot: 'header' },
      { type: 'text', props: { text: 'body' } },
    ],
  });
  const header = container.querySelector('[data-slot="card-header"]');
  expect(header?.textContent).toContain('h1');
  expect(header?.textContent).toContain('h2');
});

test('unknown slot on a widget that lacks that slot is dropped silently', () => {
  const { container } = renderSpec({
    type: 'card',
    props: {},
    children: [
      { type: 'text', props: { text: 'ghost' }, slot: 'sidebar' },
      { type: 'text', props: { text: 'body' } },
    ],
  });
  const body = container.querySelector('[data-slot="card-body"]');
  expect(body?.textContent).toContain('body');
  expect(body?.textContent ?? '').not.toContain('ghost');
});

test('existing no-slot specs render identically (regression guard)', () => {
  const { container } = renderSpec({
    type: 'card',
    props: { title: 'Hello' },
    children: [{ type: 'text', props: { text: 'world' } }],
  });
  expect(container.querySelector('[data-slot="card-header"]')?.textContent).toContain('Hello');
  expect(container.querySelector('[data-slot="card-body"]')?.textContent).toContain('world');
});
