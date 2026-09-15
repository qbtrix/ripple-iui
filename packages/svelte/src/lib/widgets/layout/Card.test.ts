import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import Card from '$lib/widgets/layout/Card.svelte';

test('renders title and description', () => {
  render(Card, { props: { title: 'Revenue', description: 'Last 30 days' } });
  expect(screen.getByText('Revenue')).toBeInTheDocument();
  expect(screen.getByText('Last 30 days')).toBeInTheDocument();
});

test('omits header block when no title or description', () => {
  const { container } = render(Card, { props: {} });
  expect(container.querySelector('[data-slot="card-header"]')).toBeNull();
});

test('applies variant data-attribute', () => {
  const { container } = render(Card, { props: { variant: 'muted' } });
  expect(container.querySelector('[data-variant="muted"]')).not.toBeNull();
});

test('applies density data-attribute', () => {
  const { container } = render(Card, { props: { density: 'comfortable' } });
  expect(container.querySelector('[data-density="comfortable"]')).not.toBeNull();
});

test('defaults to compact density', () => {
  const { container } = render(Card, { props: {} });
  expect(container.querySelector('[data-density="compact"]')).not.toBeNull();
});

test('interactive card is role=button and keyboard-activatable', async () => {
  const onclick = vi.fn();
  render(Card, { props: { title: 'Pick me', interactive: true, onclick } });
  const card = screen.getByRole('button', { name: /pick me/i });
  expect(card).toHaveAttribute('tabindex', '0');

  await userEvent.click(card);
  expect(onclick).toHaveBeenCalledTimes(1);

  card.focus();
  await userEvent.keyboard('{Enter}');
  expect(onclick).toHaveBeenCalledTimes(2);

  await userEvent.keyboard(' ');
  expect(onclick).toHaveBeenCalledTimes(3);
});

test('non-interactive card has no button role even with onclick', () => {
  render(Card, { props: { title: 'no-op', onclick: () => {} } });
  expect(screen.queryByRole('button')).toBeNull();
});

test('selected variant sets aria-pressed when interactive', () => {
  render(Card, {
    props: { title: 'picked', interactive: true, variant: 'selected', onclick: () => {} },
  });
  expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
});
