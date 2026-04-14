import { render, screen } from '@testing-library/svelte';
import { expect, test } from 'vitest';
import Stat from '$lib/widgets/display/Stat.svelte';

test('renders label and value', () => {
  render(Stat, { props: { label: 'Revenue', value: 1234 } });
  expect(screen.getByText('Revenue')).toBeInTheDocument();
  expect(screen.getByText('1,234')).toBeInTheDocument();
});

test('formats currency values', () => {
  render(Stat, { props: { value: 1234.5, format: 'currency', currency: 'USD', locale: 'en-US' } });
  expect(screen.getByText('$1,234.50')).toBeInTheDocument();
});

test('formats percent values', () => {
  render(Stat, { props: { value: 0.125, format: 'percent', locale: 'en-US' } });
  expect(screen.getByText('12.5%')).toBeInTheDocument();
});

test('passes string value through untouched', () => {
  render(Stat, { props: { value: '$12,450' } });
  expect(screen.getByText('$12,450')).toBeInTheDocument();
});

test('explicit direction="up" → data-direction=up', () => {
  const { container } = render(Stat, { props: { value: 100, delta: 5, direction: 'up' } });
  expect(container.querySelector('[data-direction="up"]')).not.toBeNull();
});

test('explicit direction="down" → data-direction=down', () => {
  const { container } = render(Stat, { props: { value: 100, delta: -5, direction: 'down' } });
  expect(container.querySelector('[data-direction="down"]')).not.toBeNull();
});

test('direction="auto" with positive delta → up', () => {
  const { container } = render(Stat, { props: { value: 100, delta: 5, direction: 'auto' } });
  expect(container.querySelector('[data-direction="up"]')).not.toBeNull();
});

test('direction="auto" with negative delta → down', () => {
  const { container } = render(Stat, { props: { value: 100, delta: -5, direction: 'auto' } });
  expect(container.querySelector('[data-direction="down"]')).not.toBeNull();
});

test('direction="auto" with zero delta → neutral', () => {
  const { container } = render(Stat, { props: { value: 100, delta: 0, direction: 'auto' } });
  expect(container.querySelector('[data-direction="neutral"]')).not.toBeNull();
});

test('direction defaults to auto', () => {
  const { container } = render(Stat, { props: { value: 100, delta: 5 } });
  expect(container.querySelector('[data-direction="up"]')).not.toBeNull();
});

test('direction="down-good" with positive delta → up visually, sentiment negative', () => {
  const { container } = render(Stat, { props: { value: 200, delta: 5, direction: 'down-good' } });
  const el = container.querySelector('[data-direction]');
  expect(el?.getAttribute('data-direction')).toBe('up');
  expect(el?.getAttribute('data-sentiment')).toBe('negative');
});

test('direction="up-good" with negative delta → down, sentiment negative', () => {
  const { container } = render(Stat, { props: { value: 100, delta: -5, direction: 'up-good' } });
  const el = container.querySelector('[data-direction]');
  expect(el?.getAttribute('data-direction')).toBe('down');
  expect(el?.getAttribute('data-sentiment')).toBe('negative');
});

test('direction="up-good" with positive delta → up, sentiment positive', () => {
  const { container } = render(Stat, { props: { value: 100, delta: 5, direction: 'up-good' } });
  const el = container.querySelector('[data-direction]');
  expect(el?.getAttribute('data-direction')).toBe('up');
  expect(el?.getAttribute('data-sentiment')).toBe('positive');
});

test('renders delta chip only when delta or deltaPercent provided', () => {
  const { container: withDelta } = render(Stat, { props: { value: 100, delta: 5 } });
  expect(withDelta.querySelector('[data-slot="stat-delta"]')).not.toBeNull();

  const { container: noDelta } = render(Stat, { props: { value: 100 } });
  expect(noDelta.querySelector('[data-slot="stat-delta"]')).toBeNull();
});

test('size applied as data-size attr', () => {
  const { container } = render(Stat, { props: { value: 100, size: 'lg' } });
  expect(container.querySelector('[data-size="lg"]')).not.toBeNull();
});

test('defaults to size=md', () => {
  const { container } = render(Stat, { props: { value: 100 } });
  expect(container.querySelector('[data-size="md"]')).not.toBeNull();
});

test('renders up arrow icon when direction=up', () => {
  const { container } = render(Stat, { props: { value: 100, delta: 5, direction: 'auto' } });
  expect(container.querySelector('.lucide-arrow-up')).not.toBeNull();
});

test('renders down arrow icon when direction=down', () => {
  const { container } = render(Stat, { props: { value: 100, delta: -5, direction: 'auto' } });
  expect(container.querySelector('.lucide-arrow-down')).not.toBeNull();
});

test('renders minus icon when direction=neutral', () => {
  const { container } = render(Stat, { props: { value: 100, delta: 0, direction: 'auto' } });
  expect(container.querySelector('.lucide-minus')).not.toBeNull();
});
