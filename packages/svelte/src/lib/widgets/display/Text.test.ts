// Text widget render tests. Added with the xyflow-prerender fix: the color
// guard used `color && (a || b)`, but the Svelte compiler can drop the grouping
// parens around the `||` and emit `color && a || b`, which calls .startsWith on
// an undefined `color` and crashes SSR/prerender (a generated Paw Site 500'd on
// a plain heading with no color prop). These tests pin the crash-safe behavior:
// rendering without a color prop must never throw, and explicit hex/rgb colors
// must still apply an inline color style.
import { render, screen } from '@testing-library/svelte';
import { expect, test } from 'vitest';
import Text from '$lib/widgets/display/Text.svelte';

test('renders text with no color prop and does not throw', () => {
  // Repro for the prerender crash: color is undefined for most text widgets.
  expect(() =>
    render(Text, { props: { text: 'Modern dentistry in downtown Reno.' } })
  ).not.toThrow();
  expect(screen.getByText('Modern dentistry in downtown Reno.')).toBeInTheDocument();
});

test('renders heading-style text with no color prop and does not throw', () => {
  const { container } = render(Text, { props: { text: 'Bright Smile Dental', size: '2xl' } });
  expect(container.textContent).toContain('Bright Smile Dental');
});

test('applies an inline color style for a hex color', () => {
  // The DOM normalizes the serialized style (hex -> rgb, added whitespace), so
  // assert via the parsed color property rather than the raw style string.
  const { container } = render(Text, { props: { text: 'red', color: '#ff0000' } });
  const el = container.querySelector('p') as HTMLElement;
  expect(el?.style.color).toBe('rgb(255, 0, 0)');
});

test('applies an inline color style for an rgb color', () => {
  const { container } = render(Text, { props: { text: 'blue', color: 'rgb(0,0,255)' } });
  const el = container.querySelector('p') as HTMLElement;
  expect(el?.style.color).toBe('rgb(0, 0, 255)');
});

test('ignores a non-hex/non-rgb color token without throwing', () => {
  // Tailwind/semantic color names are not inlined; guard must still not crash.
  expect(() => render(Text, { props: { text: 'tok', color: 'primary' } })).not.toThrow();
});
