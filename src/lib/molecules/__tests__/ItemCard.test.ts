// ItemCard.test.ts — RIPPLE-NATIVE molecule tests (Wave 1: molecules).
// Created 2026-06-07.
// Verifies ItemCard renders title/subtitle, the composed PriceTag, and the
// SelectionIndicator selected/unselected state. Follows ripple's existing
// @testing-library/svelte + vitest test patterns (see widgets/display/Stat.test.ts).
import { render, screen } from '@testing-library/svelte';
import { expect, test } from 'vitest';
import ItemCard from '$lib/molecules/ItemCard.svelte';

test('renders the title', () => {
  render(ItemCard, { props: { title: 'Margherita Pizza' } });
  expect(screen.getByText('Margherita Pizza')).toBeInTheDocument();
});

test('renders subtitle and description', () => {
  render(ItemCard, {
    props: {
      title: 'Margherita Pizza',
      subtitle: 'Wood-fired',
      description: 'Tomato, mozzarella, basil',
    },
  });
  expect(screen.getByText('Wood-fired')).toBeInTheDocument();
  expect(screen.getByText('Tomato, mozzarella, basil')).toBeInTheDocument();
});

test('renders a formatted price via the composed PriceTag', () => {
  render(ItemCard, { props: { title: 'Pizza', price: 12 } });
  expect(screen.getByText('$12')).toBeInTheDocument();
});

test('passes a currency-prefixed price through untouched', () => {
  render(ItemCard, { props: { title: 'Pizza', price: '€9.50' } });
  expect(screen.getByText('€9.50')).toBeInTheDocument();
});

test('shows a strikethrough original price when provided', () => {
  render(ItemCard, { props: { title: 'Pizza', price: 8, originalPrice: 12 } });
  expect(screen.getByText('$8')).toBeInTheDocument();
  expect(screen.getByText('$12')).toBeInTheDocument();
});

test('renders a checkbox selection indicator when showSelection is set', () => {
  render(ItemCard, { props: { title: 'Pizza', showSelection: true } });
  const indicator = screen.getByRole('checkbox');
  expect(indicator).toBeInTheDocument();
  expect(indicator).toHaveAttribute('aria-checked', 'false');
});

test('reflects selected=true on the selection indicator', () => {
  render(ItemCard, {
    props: { title: 'Pizza', showSelection: true, selected: true },
  });
  expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
});

test('uses a radio indicator in single selection mode', () => {
  render(ItemCard, {
    props: { title: 'Pizza', showSelection: true, selectionMode: 'single' },
  });
  expect(screen.getByRole('radio')).toBeInTheDocument();
});

test('omits the selection indicator by default', () => {
  render(ItemCard, { props: { title: 'Pizza' } });
  expect(screen.queryByRole('checkbox')).toBeNull();
});

test('renders as a button and fires onclick when interactive', () => {
  let clicked = false;
  render(ItemCard, {
    props: { title: 'Pizza', onclick: () => (clicked = true) },
  });
  const card = screen.getByRole('button');
  card.click();
  expect(clicked).toBe(true);
});

test('hides the price when showPrice is false', () => {
  render(ItemCard, { props: { title: 'Pizza', price: 12, showPrice: false } });
  expect(screen.queryByText('$12')).toBeNull();
});
