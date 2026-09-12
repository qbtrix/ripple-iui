// An interactive Card must stay a div. It renders arbitrary children, so a
// real <button> wrapper is invalid nesting the moment a caller puts a button
// or a link in the footer — which is the common case for a clickable card.
// Guards the fix: role/tabindex/keydown carry the semantics instead.
import { render, cleanup } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, expect, test } from 'vitest';
import Card from '$lib/widgets/layout/Card.svelte';

afterEach(cleanup);

const footerWithButton = createRawSnippet(() => ({
  render: () => '<button type="button">Publish</button>',
}));

test('an interactive Card is a div, so a footer button is valid nesting', () => {
  const { container } = render(Card as Parameters<typeof render>[0], {
    props: { interactive: true, onclick: () => {}, title: 'Site', footer: footerWithButton },
  });
  const root = container.querySelector('[data-variant]') as HTMLElement;
  expect(root.tagName).toBe('DIV');
  // the caller's button survives, and is not nested inside another button
  const inner = container.querySelector('button');
  expect(inner?.textContent).toContain('Publish');
  expect(inner?.closest('button')).toBe(inner);
});

test('an interactive Card keeps button semantics and keyboard reach', () => {
  const { container } = render(Card as Parameters<typeof render>[0], {
    props: { interactive: true, onclick: () => {}, title: 'Site' },
  });
  const root = container.querySelector('[data-variant]') as HTMLElement;
  expect(root.getAttribute('role')).toBe('button');
  expect(root.getAttribute('tabindex')).toBe('0');
});

test('a non-interactive Card carries no button semantics', () => {
  const { container } = render(Card as Parameters<typeof render>[0], { props: { title: 'Site' } });
  const root = container.querySelector('[data-variant]') as HTMLElement;
  expect(root.tagName).toBe('DIV');
  expect(root.getAttribute('role')).toBeNull();
  expect(root.getAttribute('tabindex')).toBeNull();
});
