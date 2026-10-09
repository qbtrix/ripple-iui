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

// ── layout 'cards': the flow-step choice tiles ──────────────────────────────
const TRIP = [
  { id: 'food', text: 'Food', description: 'Markets and street food' },
  { id: 'culture', text: 'Culture', icon: 'gamepad-2' },
  { id: 'b', text: 'Option B', icon: 'gaming' },
  { id: 'c', text: 'Option C' },
];
const radio = (name: string) => screen.getByRole('radio', { name });

test('default layout is unchanged: buttons, no native inputs', () => {
  const { container } = render(OptionList, { props: { options: OPTIONS } });
  expect(container.querySelector('input')).toBeNull();
  expect(container.querySelector('[data-slot="option-cards"]')).toBeNull();
  expect(optionButtons('radio')).toHaveLength(3);
});

test('cards render native radios named by label and described by the hint', () => {
  render(OptionList, { props: { options: TRIP, layout: 'cards', label: 'Trip style' } });
  expect(screen.getByRole('radiogroup', { name: 'Trip style' })).toBeInTheDocument();
  const food = radio('Food') as HTMLInputElement;
  expect(food.tagName).toBe('INPUT');
  expect(food.type).toBe('radio');
  expect(food).toHaveAccessibleDescription('Markets and street food');
  // One shared name so the browser's arrow keys move within the group.
  const names = new Set(screen.getAllByRole('radio').map((r) => (r as HTMLInputElement).name));
  expect(names.size).toBe(1);
});

test('cards icons: explicit key honoured, unknown name ignored then guessed, none when nothing matches', () => {
  const { container } = render(OptionList, { props: { options: TRIP, layout: 'cards' } });
  const iconOf = (id: string) => container.querySelector(`[data-option-card="${id}"] [data-choice-icon]`)?.getAttribute('data-choice-icon');
  expect(iconOf('food')).toBe('food');
  expect(iconOf('culture')).toBe('culture'); // 'gamepad-2' is not a key: guessed from the label
  expect(iconOf('b')).toBe('gaming');
  expect(iconOf('c')).toBeUndefined();
});

test('cards: a click commits once and marks the tile selected', async () => {
  const onSelect = vi.fn();
  const { container } = render(OptionList, { props: { options: TRIP, layout: 'cards', onSelect } });
  await fireEvent.click(screen.getByText('Culture'));
  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(onSelect).toHaveBeenCalledWith('culture');
  expect((radio('Culture') as HTMLInputElement).checked).toBe(true);
  expect(container.querySelector('[data-option-card="culture"]')?.hasAttribute('data-selected')).toBe(true);
});

test('cards keyboard: arrows move without committing; Enter and Space commit', async () => {
  const onSelect = vi.fn();
  render(OptionList, { props: { options: TRIP, layout: 'cards', onSelect } });
  const food = radio('Food') as HTMLInputElement;
  const culture = radio('Culture') as HTMLInputElement;
  // The browser's arrow key: keydown, then the radio checks itself and fires change.
  await fireEvent.keyDown(food, { key: 'ArrowDown' });
  culture.checked = true;
  await fireEvent.change(culture);
  await fireEvent.keyUp(culture, { key: 'ArrowDown' });
  expect(onSelect).not.toHaveBeenCalled();
  // Space on the now-checked radio fires no native change: the card commits it.
  await fireEvent.keyDown(culture, { key: ' ' });
  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(onSelect).toHaveBeenLastCalledWith('culture');
  await fireEvent.keyDown(food, { key: 'Enter' });
  expect(onSelect).toHaveBeenCalledTimes(2);
  expect(onSelect).toHaveBeenLastCalledWith('food');
});

test('cards multiple: checkboxes toggle, arrows move focus only', async () => {
  const onSelect = vi.fn();
  render(OptionList, { props: { options: TRIP, layout: 'cards', selection: 'multiple', onSelect } });
  const boxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
  expect(boxes).toHaveLength(4);
  await fireEvent.click(boxes[0]);
  await fireEvent.click(boxes[2]);
  expect(boxes[0].checked && boxes[2].checked).toBe(true);
  expect(onSelect).toHaveBeenCalledTimes(2);
  boxes[0].focus();
  await fireEvent.keyDown(boxes[0], { key: 'ArrowRight' });
  expect(document.activeElement).toBe(boxes[1]);
  expect(onSelect).toHaveBeenCalledTimes(2);
});

test('cards grid: three across only for 3 or 6 short options', () => {
  const grid = (opts: typeof TRIP) => {
    const { container, unmount } = render(OptionList, { props: { options: opts, layout: 'cards' } });
    const cls = container.querySelector('[data-slot="option-cards"] > div')?.className ?? '';
    unmount();
    return cls;
  };
  expect(grid(TRIP.slice(0, 3))).toContain('@min-[480px]:grid-cols-3');
  expect(grid(TRIP)).not.toContain('grid-cols-3');
  expect(grid(TRIP)).toContain('@min-[480px]:grid-cols-2');
  expect(grid([...TRIP.slice(0, 2), { id: 'x', text: 'A much longer option label than fits' }])).not.toContain('grid-cols-3');
});

test('cards: a disabled option is a disabled input and never commits', async () => {
  const onSelect = vi.fn();
  render(OptionList, { props: { options: [{ id: 'x', text: 'Sold out', disabled: true }], layout: 'cards', onSelect } });
  expect(radio('Sold out')).toBeDisabled();
  await fireEvent.click(screen.getByText('Sold out'));
  expect(onSelect).not.toHaveBeenCalled();
});
