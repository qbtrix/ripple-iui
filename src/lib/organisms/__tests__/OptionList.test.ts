// OptionList.test.ts — RIPPLE-NATIVE organism tests (Wave 2: organisms).
// Created 2026-06-07.
// Verifies OptionList renders its options, fires onSelect on click, and reflects
// single vs. multiple selection roles/state. Follows ripple's existing
// @testing-library/svelte + vitest test patterns (see molecules/ItemCard.test.ts).
import { render, screen, fireEvent } from '@testing-library/svelte';
import { expect, test, vi } from 'vitest';
import OptionList from '$lib/organisms/OptionList.svelte';

const OPTIONS = [
  { id: 'fast', text: 'Fast' },
  { id: 'cheap', text: 'Cheap' },
  { id: 'good', text: 'Good' },
];

test('renders all option labels', () => {
  render(OptionList, { props: { options: OPTIONS } });
  expect(screen.getByText('Fast')).toBeInTheDocument();
  expect(screen.getByText('Cheap')).toBeInTheDocument();
  expect(screen.getByText('Good')).toBeInTheDocument();
});

test('accepts `label` as an alias for `text`', () => {
  render(OptionList, { props: { options: [{ id: 'a', label: 'Aliased' }] } });
  expect(screen.getByText('Aliased')).toBeInTheDocument();
});

test('renders descriptions when provided', () => {
  render(OptionList, {
    props: { options: [{ id: 'fast', text: 'Fast', description: 'Under 30 min' }] },
  });
  expect(screen.getByText('Under 30 min')).toBeInTheDocument();
});

test('fires onSelect with the option id on click (single)', async () => {
  const onSelect = vi.fn();
  render(OptionList, { props: { options: OPTIONS, selection: 'single', onSelect } });
  await fireEvent.click(screen.getByText('Cheap'));
  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(onSelect).toHaveBeenCalledWith('cheap');
});

test('fires onSelect for each click in multiple selection', async () => {
  const onSelect = vi.fn();
  render(OptionList, {
    props: { options: OPTIONS, selection: 'multiple', onSelect },
  });
  await fireEvent.click(screen.getByText('Fast'));
  await fireEvent.click(screen.getByText('Good'));
  expect(onSelect).toHaveBeenCalledTimes(2);
  expect(onSelect).toHaveBeenNthCalledWith(1, 'fast');
  expect(onSelect).toHaveBeenNthCalledWith(2, 'good');
});

// The option buttons carry the selection role (radio/checkbox), and the nested
// SelectionIndicator shares that same role — so getAllByRole returns BOTH the
// <button> and the indicator. Scope to the <button> elements (the real options).
function optionButtons(role: 'radio' | 'checkbox') {
  return screen.getAllByRole(role).filter((el) => el.tagName === 'BUTTON');
}

test('uses radio role on its buttons in single mode', () => {
  render(OptionList, { props: { options: OPTIONS, selection: 'single' } });
  const buttons = optionButtons('radio');
  expect(buttons).toHaveLength(OPTIONS.length);
  expect(buttons.every((b) => b.getAttribute('role') === 'radio')).toBe(true);
});

test('uses checkbox role on its buttons in multiple mode', () => {
  render(OptionList, { props: { options: OPTIONS, selection: 'multiple' } });
  const buttons = optionButtons('checkbox');
  expect(buttons).toHaveLength(OPTIONS.length);
  expect(buttons.every((b) => b.getAttribute('role') === 'checkbox')).toBe(true);
});

test('reflects a selected id via aria-checked (single)', () => {
  render(OptionList, {
    props: { options: OPTIONS, selection: 'single', selected: 'cheap' },
  });
  const checked = optionButtons('radio').filter(
    (b) => b.getAttribute('aria-checked') === 'true',
  );
  expect(checked).toHaveLength(1);
});

test('reflects a selected array via aria-checked (multiple)', () => {
  render(OptionList, {
    props: { options: OPTIONS, selection: 'multiple', selected: ['fast', 'good'] },
  });
  const checked = optionButtons('checkbox').filter(
    (b) => b.getAttribute('aria-checked') === 'true',
  );
  expect(checked).toHaveLength(2);
});

test('does not fire onSelect for a disabled option', async () => {
  const onSelect = vi.fn();
  render(OptionList, {
    props: { options: [{ id: 'x', text: 'Disabled', disabled: true }], onSelect },
  });
  await fireEvent.click(screen.getByText('Disabled'));
  expect(onSelect).not.toHaveBeenCalled();
});
