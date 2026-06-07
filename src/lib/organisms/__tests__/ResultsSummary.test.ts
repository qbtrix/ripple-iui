// ResultsSummary.test.ts — RIPPLE-NATIVE organism tests (Wave 2: organisms).
// Created 2026-06-07.
// Verifies ResultsSummary renders the title, key/value rows, and the optional
// total row. Follows ripple's existing @testing-library/svelte + vitest patterns
// (see molecules/ItemCard.test.ts).
import { render, screen } from '@testing-library/svelte';
import { expect, test } from 'vitest';
import ResultsSummary from '$lib/organisms/ResultsSummary.svelte';

const ITEMS = [
  { label: 'Pickup', value: 'Tomorrow, 9am' },
  { label: 'Service', value: 'Standard wash' },
  { label: 'Vehicle', value: 'Tesla Model 3' },
];

test('renders the title', () => {
  render(ResultsSummary, { props: { title: 'Review your booking', items: ITEMS } });
  expect(screen.getByText('Review your booking')).toBeInTheDocument();
});

test('renders every key and value row', () => {
  render(ResultsSummary, { props: { items: ITEMS } });
  expect(screen.getByText('Pickup')).toBeInTheDocument();
  expect(screen.getByText('Tomorrow, 9am')).toBeInTheDocument();
  expect(screen.getByText('Service')).toBeInTheDocument();
  expect(screen.getByText('Standard wash')).toBeInTheDocument();
  expect(screen.getByText('Vehicle')).toBeInTheDocument();
  expect(screen.getByText('Tesla Model 3')).toBeInTheDocument();
});

test('exposes the rows as a list with one item per entry', () => {
  render(ResultsSummary, { props: { items: ITEMS } });
  expect(screen.getByRole('list')).toBeInTheDocument();
  expect(screen.getAllByRole('listitem')).toHaveLength(ITEMS.length);
});

test('renders an optional total row', () => {
  render(ResultsSummary, {
    props: { items: ITEMS, total: { label: 'Total', value: '$24.00' } },
  });
  expect(screen.getByText('Total')).toBeInTheDocument();
  expect(screen.getByText('$24.00')).toBeInTheDocument();
  // Items + the total row.
  expect(screen.getAllByRole('listitem')).toHaveLength(ITEMS.length + 1);
});

test('renders nothing for an empty item set', () => {
  render(ResultsSummary, { props: { items: [] } });
  expect(screen.queryByRole('list')).toBeNull();
});

test('renders highlighted values', () => {
  render(ResultsSummary, {
    props: { items: [{ label: 'Status', value: 'Confirmed', highlight: true }] },
  });
  expect(screen.getByText('Confirmed')).toBeInTheDocument();
});
